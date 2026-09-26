/**
 * Hermes Gateway API client — v2, shapes verified against the live API.
 *
 * Verified response shapes (probe_sessions_api.py, 2026-08-08):
 *   GET /api/sessions?limit=N      -> { object, data: Session[], limit, offset, has_more }
 *   GET /api/sessions/{id}/messages-> { object, session_id, data: Message[] }
 *   GET /api/jobs                  -> { jobs: Job[] }
 *   GET /v1/skills                 -> { object:'list', data: Skill[] }
 *
 * Security: bearer token only, never logged. Fail closed on errors.
 */
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface HermesConnection {
  baseUrl: string;
  token: string;
  label: string;
}

export interface Session {
  id: string;
  title: string | null;
  preview: string | null;
  source: string;            // discord | cron | cli | api_server | ...
  last_active: number | null;  // epoch SECONDS (float) from the API
  message_count: number;
  parent_session_id?: string | null;
  model?: string | null;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  timestamp?: number | string | null;  // epoch seconds (number) or ISO
  tool_calls?: unknown[] | null;
  tool_name?: string | null;
}

export interface Job {
  id: string;
  name: string | null;
  prompt: string | null;
  schedule_display: string;
  enabled: boolean;
  state: string;
  no_agent?: boolean;
  repeat?: { times: number | null; completed: number } | null;
  last_output?: string | null;
}

export interface Skill {
  name: string;
  description: string;
  category?: string;
}

export interface StreamCallbacks {
  onDelta: (textDelta: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export class HermesClient {
  constructor(private conn: HermesConnection) {}

  private headers(): Record<string, string> {
    return {
      Authorization: 'Bearer ' + this.conn.token,
      'Content-Type': 'application/json',
    };
  }

  private url(path: string): string {
    return this.conn.baseUrl.replace(/\/$/, '') + path;
  }

  private async getJson(path: string, retries = 4): Promise<unknown> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      let res: Awaited<ReturnType<typeof fetch>> | null = null;
      try {
        res = await fetch(this.url(path), {
          headers: this.headers(),
          signal: AbortSignal.timeout(15000),
        });
      } catch (e) {
        // Network-level failure (offline, DNS, timeout) — transient, retry.
        lastErr = e as Error;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 400 * 2 ** attempt + Math.random() * 300));
        }
        continue;
      }
      if (res.ok) {
        return (await res.json()) as unknown;
      }
      const body = await res.text().catch(() => "");
      const detail = body ? ": " + body.slice(0, 180) : "";
      const err = new Error("API " + res.status + " on " + path + detail);
      // Retry only transient states: 401 (server restart), 429, 5xx.
      // Other 4xx are permanent — fail fast, carrying the server message.
      lastErr = err;
      const transient = res.status === 401 || res.status === 429 || res.status >= 500;
      if (transient && attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 300));
        continue;
      }
      throw err;
    }
    throw lastErr ?? new Error("API request failed on " + path);
  }

  /** GET /health */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(this.url('/health'), {
        headers: this.headers(),
        signal: AbortSignal.timeout(6000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** All sessions (paginated until has_more=false). */
  async listSessions(limit = 50): Promise<Session[]> {
    const out: Session[] = [];
    let offset = 0;
    for (;;) {
      const page = (await this.getJson(
        `/api/sessions?limit=${limit}&offset=${offset}`,
      )) as { data?: Session[]; has_more?: boolean };
      const items = page.data ?? [];
      out.push(...items);
      if (!page.has_more || items.length === 0) break;
      offset += items.length;
      if (offset > 1000) break; // hard cap
    }
    return out;
  }

  /** Full message history of one session. */
  async sessionMessages(sessionId: string): Promise<Message[]> {
    const res = (await this.getJson(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    )) as { data?: Message[] };
    return res.data ?? [];
  }

  /** Cron jobs. */
  async listJobs(): Promise<Job[]> {
    const res = (await this.getJson('/api/jobs')) as { jobs?: Job[] };
    return res.jobs ?? [];
  }

  private async postJob(path: string): Promise<void> {
    const res = await fetch(this.url(path), { method: 'POST', headers: this.headers() });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error("API " + res.status + " on " + path + (body ? ": " + body.slice(0, 180) : ""));
    }
  }

  async pauseJob(id: string): Promise<void> {
    await this.postJob("/api/jobs/" + encodeURIComponent(id) + "/pause");
  }

  async resumeJob(id: string): Promise<void> {
    await this.postJob("/api/jobs/" + encodeURIComponent(id) + "/resume");
  }

  async runJobNow(id: string): Promise<void> {
    await this.postJob("/api/jobs/" + encodeURIComponent(id) + "/run");
  }

  /** Skills catalog. */
  async listSkills(): Promise<Skill[]> {
    const res = (await this.getJson('/v1/skills')) as { data?: Skill[] };
    return res.data ?? [];
  }

  /**
   * Continue a session with streaming (SSE). Replies stay in the SAME Hermes
   * session, so the app conversation continues the Discord/history thread.
   * Returns a cancel function.
   */
  streamSessionChat(opts: {
    sessionId: string;
    message: string;
    callbacks: StreamCallbacks;
  }): () => void {
    const controller = new AbortController();
    let fullText = '';
    let reported = false;

    fetchEventSource(this.url(`/api/sessions/${encodeURIComponent(opts.sessionId)}/chat/stream`), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ input: opts.message }),
      signal: controller.signal,
      openWhenHidden: true,
      onmessage: (ev) => {
        if (!ev.data || ev.data === '[DONE]') return;
        try {
          const p = JSON.parse(ev.data);
          // session-chat SSE: {type:'assistant.delta', text}
          if (p?.type === 'assistant.delta' && typeof p?.text === 'string') {
            fullText += p.text;
            opts.callbacks.onDelta(p.text);
            return;
          }
          // OpenAI-compat fallback: choices[0].delta.content
          const delta = p?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            fullText += delta;
            opts.callbacks.onDelta(delta);
          }
        } catch {
          // ignore non-JSON lines
        }
      },
      onclose: () => {
        if (!reported) {
          reported = true;
          opts.callbacks.onDone(fullText);
        }
      },
      onerror: (err) => {
        throw err;
      },
    }).catch((err) => {
      if ((err as Error).name !== 'AbortError' && !reported) {
        reported = true;
        opts.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

    return () => controller.abort();
  }

  /** Start a brand-new session with a first message (streaming). */
  streamNewChat(opts: {
    message: string;
    callbacks: StreamCallbacks;
    /** Stable id for one chat thread — continuity across turns. */
    threadId?: string;
  }): () => void {
    const controller = new AbortController();
    let fullText = '';
    let reported = false;
    fetchEventSource(this.url('/v1/chat/completions'), {
      method: 'POST',
      headers: {
        ...this.headers(),
        'X-Hermes-Session-Id': opts.threadId ?? 'hermes-access-' + Date.now(),
      },
      body: JSON.stringify({
        model: 'hermes-agent',
        stream: true,
        messages: [{ role: 'user', content: opts.message }],
      }),
      signal: controller.signal,
      openWhenHidden: true,
      onmessage: (ev) => {
        if (!ev.data || ev.data === '[DONE]') return;
        try {
          const p = JSON.parse(ev.data);
          const delta = p?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            fullText += delta;
            opts.callbacks.onDelta(delta);
          }
        } catch {
          // ignore
        }
      },
      onclose: () => {
        if (!reported) {
          reported = true;
          opts.callbacks.onDone(fullText);
        }
      },
      onerror: (err) => {
        throw err;
      },
    }).catch((err) => {
      if ((err as Error).name !== 'AbortError' && !reported) {
        reported = true;
        opts.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
    return () => controller.abort();
  }
}
