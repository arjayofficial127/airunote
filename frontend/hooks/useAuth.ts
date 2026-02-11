'use client';

import { useAuthSession } from '@/providers/AuthSessionProvider';
import type { User } from '@/lib/api/auth';

/**
 * Backward compatibility layer for useAuth hook
 * 
 * Wraps useAuthSession to preserve existing interface:
 * { user, loading, isAuthenticated, error, refetch, logout }
 * 
 * This ensures NO existing consumers break.
 */
export function useAuth(): {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
} {
  const session = useAuthSession();

  return {
    user: session.user,
    loading: session.status === 'loading',
    isAuthenticated: !!session.user,
    error: session.error,
    refetch: session.refetch,
    logout: session.logout,
  };
}

