# Architecture & API surfaces

Hermes Access talks to exactly two HTTP surfaces, both of which you host yourself. This document records the exact request/response shapes **as implemented** in this repo, so an integrator can build against them without reading the source.

* **Gateway API Server** (`:8642`) — consumed by the app via `app/src/gateway/client.ts`.
* **Pairing bridge** (`bridge/server.py`, FastAPI, `:8661`) — pairing redemption and the voice relay.

Neither surface is a hosted service. There is no Hermes Access backend.

---

## 1. Gateway API Server (consumed by the app)

All calls send `Authorization: Bearer <API_SERVER_KEY>`. Paths are appended to the connection's base URL, which is what pairing hands back (for example `https://your-host/agent`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness / connected indicator (6s timeout, never throws) |
| GET | `/api/sessions?limit=&offset=` | Session list, paginated |
| GET | `/api/sessions/{id}/messages` | Full message history of one session |
| POST | `/api/sessions/{id}/chat/stream` | Continue a session, SSE streaming |
| GET | `/api/jobs` | Cron jobs |
| POST | `/api/jobs/{id}/pause` · `/resume` · `/run` | Cron mutation |
| GET | `/v1/skills` | Skills catalog (client method only — no screen consumes it yet) |
| POST | `/v1/chat/completions` | New chat thread, SSE streaming |

### Retry / timeout policy

`getJson()` retries up to 4 times with exponential backoff plus jitter, over a 15-second `AbortSignal` timeout. Only **transient** statuses are retried — `401` (gateway mid-restart), `429`, and `5xx`. Every other 4xx fails fast carrying the server's message. Network-level failures (offline, DNS, timeout) are treated as transient.

### `GET /api/sessions`

```jsonc
// 200
{
  "object": "list",
  "data": [
    {
      "id": "…",
      "title": "…",             // may be null
      "preview": "…",           // may be null
      "source": "discord",      // discord | cron | cli | api_server | …
      "last_active": 1754600000.0,  // epoch SECONDS (float), may be null
      "message_count": 42,
      "parent_session_id": null,
      "model": "…"
    }
  ],
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

The client pages until `has_more` is false or an empty page arrives, with a hard cap of 1000 records.

### `GET /api/sessions/{id}/messages`

```jsonc
// 200
{
  "object": "list",
  "session_id": "…",
  "data": [
    {
      "id": 1,
      "role": "user",            // user | assistant | tool | system
      "content": "…",            // may be null
      "timestamp": 1754600000,   // epoch seconds (number) or ISO string
      "tool_calls": null,
      "tool_name": null
    }
  ]
}
```

### `POST /api/sessions/{id}/chat/stream` (SSE)

```jsonc
// request
{ "input": "your message" }
```

```jsonc
// event: data
{ "type": "assistant.delta", "text": "partial chunk" }
// OpenAI-compatible fallback is also accepted:
{ "choices": [ { "delta": { "content": "partial chunk" } } ] }
```

The stream ends when the connection closes or a `[DONE]` data line arrives. The returned cancel handle aborts the request, which is how **stop mid-run** works.

### `POST /v1/chat/completions` (SSE, new thread)

```jsonc
// request
{
  "model": "hermes-agent",
  "stream": true,
  "messages": [ { "role": "user", "content": "your message" } ]
}
// plus header: X-Hermes-Session-Id: <stable thread id>
```

`X-Hermes-Session-Id` is what gives a whole voice conversation continuity: the voice screen generates one id per visit (`hermes-access-voice-<ts>`) and reuses it for every turn, so all turns land in a single agent thread. Deltas arrive as `choices[0].delta.content`.

### `GET /api/jobs`

```jsonc
// 200
{
  "jobs": [
    {
      "id": "…",
      "name": "…",              // may be null
      "prompt": "…",            // may be null
      "schedule_display": "every day at 08:00",
      "enabled": true,
      "state": "scheduled",
      "no_agent": false,
      "repeat": { "times": null, "completed": 3 },
      "last_output": null
    }
  ]
}
```

---

## 2. Pairing bridge (`bridge/server.py`)

A single FastAPI file. It reads `API_SERVER_KEY` from `~/.hermes/.env` at request time and never exposes it anywhere else. State lives in a JSON file (`BRIDGE_STATE`, mode `0600`).

### Configuration (environment)

| Variable | Meaning | Default |
|---|---|---|
| `BRIDGE_STATE` | Path to the code store | `~/projects/hermes-access/.secrets/bridge-state.json` |
| `BRIDGE_GATEWAY_URL` | The `baseUrl` handed to a paired device | `http://127.0.0.1:8642` |
| `BRIDGE_LABEL` | Human label shown in the app for this gateway | `hermes-agent` |
| `BRIDGE_HOST` | Interface uvicorn binds to | `127.0.0.1` |
| `BRIDGE_PORT` | Port uvicorn binds to | `8661` |

Set `BRIDGE_HOST` to a tailnet address (or put nginx in front) if your phone needs to reach the bridge across the network.

### `GET /health`

```jsonc
{ "status": "ok", "service": "hermes-access-bridge" }
```

### `POST /api/pair/redeem`

```jsonc
// request
{ "code": "<one-time code>" }
```

```jsonc
// 200 — the code is consumed by this response
{
  "baseUrl": "https://your-host/agent",
  "token": "<API_SERVER_KEY>",
  "label": "your-gateway",
  "pairedAt": 1754600000
}
```

| Status | Meaning |
|---|---|
| `400` | Malformed body, missing code, or code longer than 128 chars |
| `404` | Unknown code |
| `410` | Code expired, or already used |
| `429` | More than 5 redemption attempts per minute from one IP |
| `500` | Gateway key unavailable (`API_SERVER_KEY` missing from `~/.hermes/.env`) |

Behaviour that matters for integrators:

* The code is marked `used` **before** the key is read, so a failure after that point still burns the code. Re-pairing means a fresh code.
* Codes are generated by the bridge's `gen` subcommand (`python bridge/server.py gen`), are `secrets.token_urlsafe(32)` (256-bit), and expire after **600 seconds**. Expired and used codes are pruned on generation.
* Rate limiting keys on `X-Forwarded-For`'s first hop when present (the reverse proxy sets it), otherwise on the socket peer.

### `POST /api/voice/transcribe`

Bearer-authenticated (same `API_SERVER_KEY`). Multipart upload:

| Field | Value |
|---|---|
| `audio` | file, one of `.wav`, `.ogg`, or (default) `.m4a` |

```jsonc
// 200
{ "text": "transcribed text" }
```

| Status | Meaning |
|---|---|
| `400` | Missing `audio` field, empty audio, or bad multipart body |
| `401` | Missing/incorrect bearer token |
| `413` | Audio larger than 20 MB |
| `429` | Rate limited |
| `502` | Transcriber subprocess failed (120s timeout, stderr tail returned) |

The relay writes the upload to a temp dir, runs the configured STT script, and deletes the temp dir in a `finally`. If the model returns multiple lines (omni models sometimes prefix a scene/speaker description), the longest line is kept as the transcript.

### `POST /api/voice/speak`

Bearer-authenticated. JSON body:

```jsonc
// request
{ "text": "text to speak (clipped to 1200 chars)" }
```

```jsonc
// 200
{ "audio": "<base64 mp3>", "format": "mp3" }
```

| Status | Meaning |
|---|---|
| `400` | Missing `text` |
| `401` | Missing/incorrect bearer token |
| `429` | Rate limited |
| `502` | Synthesizer subprocess failed, or produced an empty file |

Before synthesis, the text is stripped of fenced code blocks, markdown punctuation, links, and emoji, and whitespace is collapsed — this is a speech-quality step, not a security one. An empty result falls back to a short Arabic filler so the caller always gets audio.

The app clips long replies client-side to the server's 1200-character limit (`TTS_KEEP = 1100` plus an ellipsis, in `app/src/app/voice.tsx`).

---

## 3. Path mapping in the reference deployment

The app requests `/voice/*` relative to the **origin** of its connection base URL (the path is stripped), while the bridge serves `/api/voice/*`:

| App requests | Bridge serves |
|---|---|
| `POST <origin>/voice/transcribe` | `POST /api/voice/transcribe` |
| `POST <origin>/voice/speak` | `POST /api/voice/speak` |
| `POST <bridge-url>/api/pair/redeem` | `POST /api/pair/redeem` |

In the reference deployment an nginx reverse proxy terminates TLS and does the prefixing: `/pair` → bridge, `/agent` → API Server, `/voice` → bridge. On a Tailscale-only setup you can skip the proxy entirely and point the app straight at the tailnet address.

## 4. Data flow summary

```
pairing:   app ──code──▶ bridge ──(single use)──▶ { baseUrl, token, label } ──▶ Keystore
chat:      app ──Bearer──▶ API Server ──SSE deltas──▶ app
channels:  app ──Bearer──▶ API Server ──▶ sessions + messages
cron:      app ──Bearer──▶ API Server ──▶ jobs (pause / resume / run)
voice:     app ──Bearer──▶ bridge /voice/transcribe ──▶ text
           app ──Bearer──▶ API Server /v1/chat/completions ──▶ SSE reply
           app ──Bearer──▶ bridge /voice/speak ──▶ base64 mp3 ──▶ playback
```

Nothing in this diagram leaves infrastructure you control.