import axios, { AxiosInstance, AxiosError } from 'axios';
import { tokenStorage } from './token';

const DEBUG_AUTH = true;

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
    // Simple 401 handling: redirect to login
    if (error.response?.status === 401) {
      // Clear token on 401
      tokenStorage.clearToken();
      
      // Redirect to login (only on client, not on auth endpoints)
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isAuthPage = pathname === '/login' || pathname === '/register';
        
        if (!isAuthPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
