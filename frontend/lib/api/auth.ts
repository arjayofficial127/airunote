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

export const authApi = {
  login: async (input: LoginInput): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await apiClient.post('/auth/login', input);
    return response.data;
  },

  register: async (input: RegisterInput, secret: string): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await apiClient.post(`/auth/register?secret=${encodeURIComponent(secret)}`, input);
    return response.data;
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
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<{ success: boolean; data: { user: User } }> => {
      const response = await apiClient.post('/auth/refresh');
      return response.data;
  },
};
