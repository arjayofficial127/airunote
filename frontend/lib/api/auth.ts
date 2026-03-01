import apiClient from './client';
import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  name: string;
}

// Zod schemas for form validation
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

export interface AuthFullResponse {
  user: User;
  isSuperAdmin: boolean;
  org: {
  id: string;
  name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    roles: string[];
    joinCode?: string | null;
    joinCodeMaxUses?: number | null;
    joinCodeUsedCount?: number;
    joinCodeAllowedDomains?: string[] | null;
    joinCodeIsActive?: boolean;
    joinCodeExpiresAt?: string | null;
    joinCodeDefaultRoleId?: number | null;
  } | null;
  permissions: {
    isAdmin: boolean;
    isMember: boolean;
    roles: string[];
  } | null;
  installedApps: never[];
}

import { tokenStorage } from './token';

const DEBUG_AUTH = true;

export const authApi = {
  login: async (input: LoginInput): Promise<{ success: boolean; data: { user: User; accessToken: string } }> => {
    const response = await apiClient.post('/auth/login', input);
    const data = response.data;
    
    if (DEBUG_AUTH) {
      console.log('[AuthAPI] Login response:', data);
      console.log('[AuthAPI] AccessToken present:', !!data.data?.accessToken);
    }
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);
      
      if (DEBUG_AUTH) {
        const storedToken = tokenStorage.getToken();
        console.log('[AuthAPI] Token stored successfully:', !!storedToken);
        console.log('[AuthAPI] Token length:', storedToken?.length || 0);
      }
    } else {
      if (DEBUG_AUTH) {
        console.error('[AuthAPI] Token NOT stored - response structure issue');
        console.error('[AuthAPI] Response structure:', {
          success: data.success,
          hasData: !!data.data,
          hasAccessToken: !!data.data?.accessToken,
        });
      }
    }
    
    return data;
  },

  register: async (input: RegisterInput, secret: string): Promise<{ success: boolean; data: { user: User; accessToken: string } }> => {
    const response = await apiClient.post(`/auth/register?secret=${encodeURIComponent(secret)}`, input);
    const data = response.data;
    
    if (DEBUG_AUTH) {
      console.log('[AuthAPI] Register response:', data);
      console.log('[AuthAPI] AccessToken present:', !!data.data?.accessToken);
    }
    
    // Store accessToken from response
    if (data.success && data.data?.accessToken) {
      tokenStorage.setToken(data.data.accessToken);
      
      if (DEBUG_AUTH) {
        const storedToken = tokenStorage.getToken();
        console.log('[AuthAPI] Token stored successfully:', !!storedToken);
      }
    } else {
      if (DEBUG_AUTH) {
        console.error('[AuthAPI] Token NOT stored - response structure issue');
      }
    }
    
    return data;
  },

  getMe: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  getMeFull: async (orgId?: string): Promise<{ success: boolean; data: AuthFullResponse }> => {
    const params = orgId ? { orgId } : {};
    const response = await apiClient.get('/auth/me/full', { params });
    return response.data;
  },

  updateMe: async (name: string): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.patch('/auth/me', { name });
      return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear token first
    tokenStorage.clearToken();
    // Call logout endpoint (non-blocking)
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore errors - token is already cleared
    }
  },

  refresh: async (): Promise<{ success: boolean; data: { user: User } }> => {
    // Refresh disabled for MVP
    throw new Error('Token refresh not implemented');
  },
};
