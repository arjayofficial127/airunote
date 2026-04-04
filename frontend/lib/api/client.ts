import axios, { AxiosInstance, AxiosError } from 'axios';
import { tokenStorage } from './token';
import { openUpgradeRequiredPrompt } from '@/lib/payments/upgradeRequiredPrompt';
import { toast } from '@/lib/toast';

const DEBUG_AUTH = true;
const AUTH_SESSION_PATHS = ['/auth/me', '/auth/me/full', '/auth/bootstrap'];

// Direct backend URL (no proxy)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

// Log API base URL at startup (once)
if (typeof window !== 'undefined' && DEBUG_AUTH) {
  console.log('[API Client] API Base URL:', API_BASE_URL);
  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    console.warn('[API Client] ⚠️ NEXT_PUBLIC_API_BASE_URL not set, using default:', API_BASE_URL);
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function normalizeRequestUrl(url?: string): string {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  return url;
}

function isAuthSessionRequest(url?: string): boolean {
  const normalizedUrl = normalizeRequestUrl(url);
  return AUTH_SESSION_PATHS.some((path) => normalizedUrl.includes(path));
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const pathname = window.location.pathname;
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/verify' ||
    pathname === '/forgot-password';

  if (!isAuthPage) {
    window.location.href = '/login';
  }
}

// Request interceptor: Attach Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (DEBUG_AUTH) {
        console.log('[API Client] ✅ AUTH HEADER SET for:', config.url);
      }
    } else {
      if (DEBUG_AUTH && !config.url?.includes('/auth/login') && !config.url?.includes('/auth/register')) {
        console.warn('[API Client] ⚠️ No token available for:', config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const requestUrl = error.config?.url;
    const errorCode = (error.response?.data as any)?.error?.code;
    const errorMessage = (error.response?.data as any)?.error?.message;

    if (errorCode === 'UPGRADE_REQUIRED' || errorMessage === 'UPGRADE_REQUIRED') {
      openUpgradeRequiredPrompt({
        message: errorMessage && errorMessage !== 'UPGRADE_REQUIRED'
          ? errorMessage
          : "You've reached your free plan limit. Upgrade to Pro to continue creating documents.",
      });
      toast('Upgrade required to continue', 'info', 2000);
    }

    // Only auth session validation endpoints should invalidate the whole session.
    // Other 401s are surfaced to their local callers to avoid surprise global logouts.
    if (error.response?.status === 401) {
      if (isAuthSessionRequest(requestUrl)) {
        tokenStorage.clearToken();
        redirectToLogin();
      } else if (DEBUG_AUTH) {
        console.warn('[API Client] 401 returned from non-session endpoint; preserving token for explicit auth revalidation:', requestUrl);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
