/**
 * Secure connection store.
 *
 * The bearer token lives ONLY in expo-secure-store (Android Keystore /
 * iOS Keychain) — never AsyncStorage, never logs, never the repo.
 * Non-secret connection metadata (host, label) is fine in the zustand store.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { HermesClient, HermesConnection } from './client';

const TOKEN_KEY = 'hermes_access_token';
/** SecureStore key used by the 0.4.0-era build (literal was corrupted
 *  by a redaction pass); tokens stored there are migrated on first read. */
const LEGACY_TOKEN_KEY = 'hermes_oken';
/** Non-secret connection metadata (baseUrl/label) survives restarts. */
const META_KEY = 'hermes_conn_meta';

/** Guard: the bearer key must never travel over cleartext HTTP to an
 *  arbitrary host. Allow https, loopback, and Tailscale CGNAT 100.64/10. */
export function isSafeBaseUrl(url: string): boolean {
  const m = /^(https?):\/\/([^\/:]+)/i.exec((url || '').trim());
  if (!m) return false;
  const proto = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if (proto === 'https') return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host);
}

/** SecureStore exists only on native. Web/dev-SSR fall back to in-memory
 *  (never persist secrets on web). */
const hasSecureStore = Platform.OS !== 'web' && typeof SecureStore?.getItemAsync === 'function';

/** In-memory fallback when SecureStore is unavailable or rejects — keeps
 *  the app usable for the current session; pairing can be retried. */
let memoryToken: string | null = null;

/** SecureStore keys must match /^[\w.-]+$/ — enforce it defensively. */
function safeKey(key: string): string {
  return key.replace(/[^\w.-]/g, '_') || 'hermes_access_token';
}

async function readToken(): Promise<string | null> {
  if (!hasSecureStore) return memoryToken;
  try {
    const current = await SecureStore.getItemAsync(safeKey(TOKEN_KEY));
    if (current) return current;
    const legacy = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(safeKey(TOKEN_KEY), legacy);
      await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => {});
      return legacy;
    }
    return memoryToken;
  } catch {
    return memoryToken;
  }
}

async function writeToken(token: string): Promise<void> {
  memoryToken = token; // always keep an in-session copy
  if (!hasSecureStore) return;
  try {
    await SecureStore.setItemAsync(safeKey(TOKEN_KEY), token);
  } catch {
    // SecureStore rejected the write (keystore issue) — in-memory copy
    // still lets the user use the app this session.
  }
}

/**
 * Bearer token accessor for screens that must call agent endpoints directly
 * instead of through HermesClient (e.g. the voice screen's multipart
 * /voice/transcribe and JSON /voice/speak calls). Read-only: set it via
 * `configure()`, never from a screen.
 */
export async function getToken(): Promise<string | null> {
  return readToken();
}

interface ConnectionState {
  /** Non-secret part of the connection */
  baseUrl: string;
  /** Pairing bridge origin used for the voice relay; '' for manual connections */
  bridgeUrl: string;
  label: string;
  connected: boolean;
  checking: boolean;
  /** Set the full connection (token goes straight to SecureStore) */
  configure: (conn: HermesConnection & { bridgeUrl?: string }) => Promise<void>;
  /** Load token from SecureStore and build a client */
  getClient: () => Promise<HermesClient | null>;
  /** Probe /health and update `connected` */
  checkHealth: () => Promise<boolean>;
}

/**
 * The app ships with NO preconfigured agent address — every user pairs
 * with their own Hermes agent via a one-time code (setup screen) or
 * manual connection. baseUrl/label are filled in at pairing time.
 */
const DEFAULT_BASE_URL = '';

export const useConnectionStore = create<ConnectionState>()((set, get) => ({
  baseUrl: DEFAULT_BASE_URL,
  bridgeUrl: '',
  label: '',
  connected: false,
  checking: false,

  configure: async (conn) => {
    if (!isSafeBaseUrl(conn.baseUrl)) {
      throw new Error(
        'Insecure target: use https:// or a Tailscale (100.64.0.0/10) address',
      );
    }
    await writeToken(conn.token);
    set({ bridgeUrl: conn.bridgeUrl || '' });
    set({ baseUrl: conn.baseUrl, label: conn.label });
    AsyncStorage.setItem(META_KEY, JSON.stringify({ baseUrl: conn.baseUrl, label: conn.label, bridgeUrl: conn.bridgeUrl || '' })).catch(() => {});
  },

  getClient: async () => {
    const token = await readToken();
    if (!token) return null;
    const { baseUrl, label } = get();
    return new HermesClient({ baseUrl, label, token });
  },

  checkHealth: async () => {
    set({ checking: true });
    try {
      const client = await get().getClient();
      const ok = client ? await client.health() : false;
      set({ connected: ok, checking: false });
      return ok;
    } catch {
      set({ connected: false, checking: false });
      return false;
    }
  },
}));

/** Restore non-secret connection metadata (baseUrl/label) after app restart.
 *  Called once from the root layout, alongside initLang(). */
export async function initConnection(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (raw) {
      const meta = JSON.parse(raw);
      if (meta && typeof meta.baseUrl === 'string' && meta.baseUrl) {
        useConnectionStore.setState({
          baseUrl: meta.baseUrl,
          label: typeof meta.label === 'string' ? meta.label : '',
          bridgeUrl: typeof meta.bridgeUrl === 'string' ? meta.bridgeUrl : '',
        });
      }
    }
  } catch {
    // best-effort
  }
}
