import axios, { AxiosInstance, AxiosError } from 'axios';

// Use proxy in production to avoid third-party cookie issues
// In development, use direct backend URL
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const API_BASE_URL = isProduction 
  ? '/api/proxy'  // Use Next.js API route proxy (same origin)
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'); // Direct backend in dev

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and domain header
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Add domain header for domain access checking
      const hostname = window.location.hostname;
      config.headers['X-Forwarded-From'] = hostname;
      
      console.log('[API Client] ===== REQUEST =====');
      console.log('[API Client] URL:', config.url);
      console.log('[API Client] Method:', config.method);
      console.log('[API Client] withCredentials:', config.withCredentials);
      console.log('[API Client] Base URL:', config.baseURL);
      console.log('[API Client] Domain:', hostname);
      // Note: Can't log cookies from JS (HttpOnly), but we can log that withCredentials is set
    }
    return config;
  },
  (error) => {
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      console.log('[API Client] ===== RESPONSE SUCCESS =====');
      console.log('[API Client] URL:', response.config.url);
      console.log('[API Client] Status:', response.status);
      // Check Set-Cookie headers (if visible)
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        console.log('[API Client] Set-Cookie headers received:', setCookieHeaders.length);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    if (typeof window !== 'undefined') {
      console.error('[API Client] ===== RESPONSE ERROR =====');
      console.error('[API Client] URL:', error.config?.url);
      console.error('[API Client] Status:', error.response?.status);
      console.error('[API Client] Error message:', error.message);
      console.error('[API Client] withCredentials:', error.config?.withCredentials);
    }
    
    const originalRequest = error.config as any;

    // Don't try to refresh on auth endpoints or logout
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    const isLogoutEndpoint = originalRequest?.url?.includes('/auth/logout');
    
    // If error is 401 and we haven't tried to refresh yet
    // Skip refresh for auth endpoints (login, register, logout, me) to avoid loops
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      console.log('[API Client] 401 error - attempting token refresh');
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const { authApi } = await import('./auth');
        await authApi.refresh();
        processQueue(null, null);
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, don't redirect on public pages
        // Only redirect if we're on a protected route
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';
        if (typeof window !== 'undefined' && !isPublicPage) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

