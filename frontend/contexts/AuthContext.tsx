'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, type User } from '@/lib/api/auth';

/**
 * Auth context value interface
 */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider
 * 
 * Centralized authentication state management.
 * Makes a single /auth/me call on mount and shares state via context.
 * Prevents duplicate auth calls across components.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request deduplication: cache in-flight request promise
  // Prevents duplicate calls during rapid re-renders
  const inFlightRequestRef = useRef<Promise<void> | null>(null);

  const checkAuth = useCallback(async () => {
    // If there's already an in-flight request, wait for it
    if (inFlightRequestRef.current) {
      await inFlightRequestRef.current;
      return;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authApi.getMe();

        // Backend /auth/me returns: { success: true, data: { id, email, name } }
        const response = res as any;
        const userData = response?.data || null;

        if (userData && (userData.id || userData.email)) {
          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || '',
          };
          setUser(user);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        // Not logged in - this is fine for public pages
        // Don't log 401 errors as they're expected when not authenticated
        if (err.response?.status !== 401 && err.response?.status !== 403) {
          console.log('[AuthProvider] Auth check failed:', err);
          // Only set error for non-auth errors
          setError(err.response?.data?.error?.message || 'Failed to check authentication');
        }
        setUser(null);
      } finally {
        setLoading(false);
        // Clear in-flight request
        inFlightRequestRef.current = null;
      }
    })();

    // Store in-flight request
    inFlightRequestRef.current = requestPromise;
    await requestPromise;
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Refetch method for manual refresh
  const refetch = useCallback(async () => {
    // Clear in-flight request to force new call
    inFlightRequestRef.current = null;
    await checkAuth();
  }, [checkAuth]);

  // Logout method - clears auth state and calls logout API
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if logout API fails, clear local state
      console.error('[AuthProvider] Logout API call failed:', err);
    } finally {
      // Clear auth state immediately
      setUser(null);
      setError(null);
      // Clear in-flight request
      inFlightRequestRef.current = null;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    error,
    refetch,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Replaces the old useAuth hook that made independent API calls
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
