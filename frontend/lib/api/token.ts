/**
 * Token storage (sessionStorage-backed)
 * Stores accessToken in sessionStorage for persistence across page refreshes
 * Falls back to in-memory if sessionStorage is unavailable (SSR safety)
 */

const TOKEN_KEY = 'airunote_accessToken';
let memoryCache: string | null = null;

export const tokenStorage = {
  getToken: (): string | null => {
    // SSR safety: check if window is available
    if (typeof window === 'undefined') {
      return memoryCache;
    }

    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        memoryCache = token; // Keep in-memory cache in sync
        return token;
      }
      return null;
    } catch (error) {
      // sessionStorage might be disabled (private browsing, etc.)
      // Fall back to memory cache
      return memoryCache;
    }
  },

  setToken: (token: string): void => {
    memoryCache = token; // Update in-memory cache

    // SSR safety: check if window is available
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      // sessionStorage might be disabled (private browsing, etc.)
      // Token is still in memory cache, but won't persist
      console.warn('[TokenStorage] Failed to store token in sessionStorage:', error);
    }
  },

  clearToken: (): void => {
    memoryCache = null; // Clear in-memory cache

    // SSR safety: check if window is available
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      // Ignore errors when clearing
    }
  },
};
