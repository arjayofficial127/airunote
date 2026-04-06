/**
 * Token storage (browser-session cookie backed)
 * Stores accessToken in a session cookie so it is shared across tabs,
 * but cleared when the full browser session ends.
 */

const TOKEN_KEY = 'airunote_accessToken';
const AUTH_EVENT_KEY = 'airunote_auth_event';
const AUTH_CHANNEL_NAME = 'airunote_auth_channel';
const TAB_ID = Math.random().toString(36).slice(2);

let memoryCache: string | null = null;
let authChannel: BroadcastChannel | null = null;

export type AuthStorageEvent = 'token-set' | 'token-cleared';

function getSecureCookieSuffix(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.protocol === 'https:' ? '; Secure' : '';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = cookie.slice(0, separatorIndex);
    if (key !== name) {
      continue;
    }

    const rawValue = cookie.slice(separatorIndex + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${getSecureCookieSuffix()}`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${getSecureCookieSuffix()}`;
}

function migrateLegacySessionStorageToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const legacyToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (!legacyToken) {
      return null;
    }

    writeCookie(TOKEN_KEY, legacyToken);
    window.sessionStorage.removeItem(TOKEN_KEY);
    memoryCache = legacyToken;
    return legacyToken;
  } catch {
    return null;
  }
}

function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!authChannel) {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }

  return authChannel;
}

function publishAuthEvent(type: AuthStorageEvent): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = JSON.stringify({ type, source: TAB_ID, timestamp: Date.now() });

  try {
    getAuthChannel()?.postMessage(payload);
  } catch {
    // Ignore channel failures and continue with storage fallback.
  }

  try {
    window.localStorage.setItem(AUTH_EVENT_KEY, payload);
    window.localStorage.removeItem(AUTH_EVENT_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}

function parseAuthEvent(raw: string | null): AuthStorageEvent | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      type?: AuthStorageEvent;
      source?: string;
    };

    if (parsed.source === TAB_ID) {
      return null;
    }

    if (parsed.type === 'token-set' || parsed.type === 'token-cleared') {
      return parsed.type;
    }
  } catch {
    return null;
  }

  return null;
}

export function subscribeToAuthStorageEvents(listener: (event: AuthStorageEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_EVENT_KEY) {
      return;
    }

    const parsedEvent = parseAuthEvent(event.newValue);
    if (parsedEvent) {
      listener(parsedEvent);
    }
  };

  const channel = getAuthChannel();
  const handleChannelMessage = (event: MessageEvent<string>) => {
    const parsedEvent = parseAuthEvent(event.data);
    if (parsedEvent) {
      listener(parsedEvent);
    }
  };

  window.addEventListener('storage', handleStorage);
  channel?.addEventListener('message', handleChannelMessage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.removeEventListener('message', handleChannelMessage);
  };
}

export const tokenStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') {
      return memoryCache;
    }

    const cookieToken = readCookie(TOKEN_KEY);
    if (cookieToken) {
      memoryCache = cookieToken;
      return cookieToken;
    }

    const migratedToken = migrateLegacySessionStorageToken();
    if (migratedToken) {
      return migratedToken;
    }

    memoryCache = null;
    return null;
  },

  setToken: (token: string): void => {
    memoryCache = token;

    if (typeof window === 'undefined') {
      return;
    }

    writeCookie(TOKEN_KEY, token);

    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore sessionStorage cleanup failures.
    }

    publishAuthEvent('token-set');
  },

  clearToken: (): void => {
    memoryCache = null;

    if (typeof window === 'undefined') {
      return;
    }

    clearCookie(TOKEN_KEY);

    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore legacy cleanup failures.
    }

    publishAuthEvent('token-cleared');
  },
};
