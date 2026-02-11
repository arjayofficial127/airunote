'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, type User } from '@/lib/api/auth';

/**
 * Auth session status lifecycle
 * 'idle' → 'loading' → 'ready' | 'error'
 */
type AuthSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * System role for the user (e.g., 'superadmin', 'user', etc.)
 * Will be null until org loading phase
 */
type SystemRole = string | null;

/**
 * Auth session state shape
 */
interface AuthSessionState {
  status: AuthSessionStatus;
  user: User | null;
  systemRole: SystemRole;
  error: string | null;
}

/**
 * Auth session context value
 */
interface AuthSessionContextValue extends AuthSessionState {
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
  authInvalidateKey: number; // Increments when auth becomes invalid (logout, token expiry, etc.)
  isOfflineLimited: boolean; // True when offline prevents auth validation but session is preserved
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

/**
 * AuthSessionProvider
 * 
 * SINGLE authoritative source for authentication state.
 * 
 * Responsibilities:
 * - Owns ALL auth API calls (no duplicates)
 * - Manages session lifecycle: 'idle' → 'loading' → 'ready' | 'error'
 * - Request deduplication: reuses in-flight requests
 * - SSR/SSG safe: does NOT throw during prerender
 * - Logout fully resets state
 * 
 * State includes:
 * - status: current lifecycle state
 * - user: authenticated user or null
 * - systemRole: user's system role (null until org phase)
 * - error: error message if any
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthSessionStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [systemRole, setSystemRole] = useState<SystemRole>(null);
  const [error, setError] = useState<string | null>(null);
  const [authInvalidateKey, setAuthInvalidateKey] = useState<number>(0);
  const [isOfflineLimited, setIsOfflineLimited] = useState<boolean>(false);

  // Request deduplication: cache in-flight request promise
  // Prevents duplicate calls during rapid re-renders or navigation
  const inFlightRequestRef = useRef<Promise<void> | null>(null);
  
  // Track offline state to prevent retry storms
  const isOfflineRef = useRef<boolean>(false);
  
  // Track current user in ref to avoid dependency issues
  const userRef = useRef<User | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /**
   * Check if error is network/offline/unreachable related
   * For auth bootstrap purposes, 5xx errors are treated as unreachable
   */
  const isNetworkError = useCallback((err: any): boolean => {
    // Check navigator.onLine first
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return true;
    }

    // Check for network-related error indicators
    const statusCode = err.response?.status;
    const errorMessage = err.message?.toLowerCase() || '';
    const code = err.code?.toLowerCase() || '';

    // Network errors: no response, network error, timeout, connection refused
    if (!err.response) {
      return true; // No response usually means network issue
    }

    // 5xx errors are treated as unreachable/offline for auth bootstrap purposes
    if (statusCode && statusCode >= 500) {
      return true;
    }

    // Axios network error codes
    if (code === 'econnrefused' || code === 'enetunreach' || code === 'etimedout') {
      return true;
    }

    return false;
  }, []);

  /**
   * Check authentication status
   * 
   * - If request is in-flight, waits for it
   * - Otherwise creates new request and stores it
   * - Safe for SSR/SSG (catches all errors)
   * - Offline-aware: preserves existing session when offline
   */
  const checkAuth = useCallback(async () => {
    // If there's already an in-flight request, wait for it
    if (inFlightRequestRef.current) {
      await inFlightRequestRef.current;
      return;
    }

    // Check offline state before making request
    const wasOffline = typeof window !== 'undefined' && !navigator.onLine;
    if (wasOffline) {
      isOfflineRef.current = true;
      
      // If we have a user session in memory, preserve it
      const currentUser = userRef.current;
      if (currentUser) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthSessionProvider] Offline detected - preserving existing session');
        }
        setStatus('ready');
        setError(null);
        setIsOfflineLimited(true);
        // Clear in-flight request
        inFlightRequestRef.current = null;
        return;
      } else {
        // No session exists and we're offline
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthSessionProvider] Offline detected - no session available');
        }
        setUser(null);
        setSystemRole(null);
        setStatus('ready');
        setError('Sign in requires internet connection');
        setIsOfflineLimited(true);
        // Clear in-flight request
        inFlightRequestRef.current = null;
        return;
      }
    }

    // We're online, clear offline flag
    isOfflineRef.current = false;

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setStatus('loading');
        setError(null);
        setIsOfflineLimited(false);

        const res = await authApi.getMe();

        // Backend /auth/me returns: { success: true, data: { id, email, name } }
        const response = res as { success: boolean; data: User };
        const userData = response?.data || null;

        if (userData && (userData.id || userData.email)) {
          const user: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || '',
          };
          setUser(user);
          // systemRole remains null until org loading phase
          setSystemRole(null);
          setStatus('ready');
          setIsOfflineLimited(false);
        } else {
          setUser(null);
          setSystemRole(null);
          setStatus('ready');
          setIsOfflineLimited(false);
        }
      } catch (err: any) {
        // Check if this is an unreachable/offline error
        const isUnreachable = 
          (typeof window !== 'undefined' && !navigator.onLine) ||
          !err.response ||
          err.code === 'econnrefused' ||
          err.code === 'enetunreach' ||
          err.code === 'etimedout' ||
          (err.response?.status && err.response.status >= 500);

        const currentUser = userRef.current;
        const statusCode = err.response?.status;

        // Treat unreachable auth check as OFFLINE-LIMITED when session exists
        if (isUnreachable) {
          isOfflineRef.current = true;
          
          if (currentUser) {
            // Session exists - preserve it, mark as offline-limited
            if (process.env.NODE_ENV === 'development') {
              console.log('[AuthSessionProvider] Unreachable auth check - preserving existing session');
            }
            setStatus('ready');
            setError(null);
            setIsOfflineLimited(true);
            // DO NOT increment authInvalidateKey
            // DO NOT setStatus('error')
            return;
          } else {
            // No session exists and unreachable
            if (process.env.NODE_ENV === 'development') {
              console.log('[AuthSessionProvider] Unreachable auth check - no session available');
            }
            setUser(null);
            setSystemRole(null);
            setStatus('ready');
            setError('Sign in requires internet connection');
            setIsOfflineLimited(true);
            // DO NOT increment authInvalidateKey
            // DO NOT setStatus('error')
            return;
          }
        }

        // Not unreachable - handle as auth failure
        // Only 401/403 are true auth invalidation
        if (statusCode === 401 || statusCode === 403) {
          // 401/403 means not authenticated - this is a valid state
          setUser(null);
          setSystemRole(null);
          setStatus('ready');
          setError(null);
          setIsOfflineLimited(false);
          // Emit invalidation signal for auth failures
          setAuthInvalidateKey((prev) => prev + 1);
        } else {
          // Other errors (not unreachable, not 401/403) - log but don't crash
          console.log('[AuthSessionProvider] Auth check failed:', err);
          setError(err.response?.data?.error?.message || 'Failed to check authentication');
          setStatus('ready'); // Use 'ready' instead of 'error' to avoid global error boundary
          setIsOfflineLimited(false);
          // DO NOT increment authInvalidateKey for non-auth errors
        }
      } finally {
        // Clear in-flight request
        inFlightRequestRef.current = null;
      }
    })();

    // Store in-flight request
    inFlightRequestRef.current = requestPromise;
    await requestPromise;
  }, [isNetworkError]);

  // Check auth on mount (client-side only)
  useEffect(() => {
    // Only run on client (SSR safety)
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [checkAuth]);

  // Listen for online/offline events to prevent retry storms
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (isOfflineRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthSessionProvider] Online detected - clearing offline flag');
        }
        isOfflineRef.current = false;
        setIsOfflineLimited(false);
        // Optionally re-check auth when coming back online
        // But don't auto-retry to avoid storms - let user trigger if needed
      }
    };

    const handleOffline = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthSessionProvider] Offline detected');
      }
      isOfflineRef.current = true;
      // Preserve existing session if available
      const currentUser = userRef.current;
      if (currentUser) {
        setIsOfflineLimited(true);
        setStatus('ready');
        setError(null);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Refetch authentication data
   * Clears in-flight request to force new call
   */
  const refetch = useCallback(async () => {
    // Clear in-flight request to force new call
    inFlightRequestRef.current = null;
    await checkAuth();
  }, [checkAuth]);

  /**
   * Logout - fully resets state
   * 
   * - Calls logout API
   * - Resets all state to initial values
   * - Clears in-flight request
   * - Emits invalidation signal
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if logout API fails, clear local state
      console.error('[AuthSessionProvider] Logout API call failed:', err);
    } finally {
      // FULLY reset state
      setUser(null);
      setSystemRole(null);
      setError(null);
      setStatus('idle');
      setIsOfflineLimited(false);
      isOfflineRef.current = false;
      userRef.current = null;
      // Clear in-flight request
      inFlightRequestRef.current = null;
      // Emit invalidation signal to reset all downstream providers
      setAuthInvalidateKey((prev) => prev + 1);
    }
  }, []);

  const value: AuthSessionContextValue = {
    status,
    user,
    systemRole,
    error,
    refetch,
    logout,
    authInvalidateKey,
    isOfflineLimited,
  };

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

/**
 * useAuthSession hook
 * 
 * Reads ONLY from AuthSessionProvider.
 * Throws if used outside provider.
 * NO auth API calls allowed here.
 */
export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return context;
}
