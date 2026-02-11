'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { orgsApi, type Org } from '@/lib/api/orgs';

/**
 * Org session status lifecycle
 * 'idle' → 'loading' → 'ready' | 'error'
 */
type OrgSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * OrgUser represents user's membership in an organization
 * Simplified structure for now (full details can be loaded later)
 */
interface OrgUser {
  orgId: string;
  userId: string;
  roles: string[];
}

/**
 * Org session state shape
 */
interface OrgSessionState {
  status: OrgSessionStatus;
  orgs: Org[];
  activeOrgId: string | null;
  activeOrg: Org | null;
  orgUser: OrgUser | null;
  roles: string[];
  error: string | null;
}

/**
 * Org session context value
 */
interface OrgSessionContextValue extends OrgSessionState {
  setActiveOrg: (orgId: string | null) => void;
  refetch: () => Promise<void>;
}

const OrgSessionContext = createContext<OrgSessionContextValue | null>(null);

/**
 * OrgSessionProvider
 * 
 * SINGLE authoritative source for organization session state.
 * 
 * Responsibilities (ONLY THIS PROVIDER MAY):
 * - Load orgs the authenticated user belongs to
 * - Track active org selection
 * - Load org membership info (orgUser, roles)
 * - Expose org session state to consumers
 * 
 * This provider MUST consume AuthSessionProvider.
 * It MUST NOT call auth APIs directly.
 * 
 * Rules:
 * - Load org list ONCE per auth session
 * - Deduplicate in-flight requests
 * - Auto-select if org count === 1
 * - Reset state when user logs out
 */
export function OrgSessionProvider({ children }: { children: React.ReactNode }) {
  const authSession = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  
  const [status, setStatus] = useState<OrgSessionStatus>('idle');
  const [orgs, setOrgs] = useState<Org[]>([]);
  // activeOrgId is the SINGLE SOURCE OF TRUTH
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [orgUser, setOrgUser] = useState<OrgUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Track route orgId from params (INPUT, NOT authority)
  const routeOrgId = params?.orgId as string | undefined;

  // Request deduplication: cache in-flight request promise
  const inFlightRequestRef = useRef<Promise<void> | null>(null);
  
  // Store current activeOrgId in ref to avoid dependency issues
  const activeOrgIdRef = useRef<string | null>(null);
  
  // Track if we're currently syncing route to prevent infinite loops
  const isSyncingRouteRef = useRef<boolean>(false);
  
  // Track previous authInvalidateKey to detect changes
  const previousAuthInvalidateKeyRef = useRef<number>(authSession.authInvalidateKey);
  
  // Keep ref in sync with state
  useEffect(() => {
    activeOrgIdRef.current = activeOrgId;
  }, [activeOrgId]);

  // Reset on auth invalidation (Phase 2.5)
  useEffect(() => {
    // Check if auth was invalidated
    if (authSession.authInvalidateKey !== previousAuthInvalidateKeyRef.current) {
      previousAuthInvalidateKeyRef.current = authSession.authInvalidateKey;
      
      // FULLY reset state on auth invalidation
      setStatus('idle');
      setOrgs([]);
      setActiveOrgId(null);
      setActiveOrg(null);
      setOrgUser(null);
      setRoles([]);
      setError(null);
      // Clear in-flight request
      inFlightRequestRef.current = null;
      // Clear refs
      activeOrgIdRef.current = null;
      isSyncingRouteRef.current = false;
    }
  }, [authSession.authInvalidateKey]);

  /**
   * Load org list
   * 
   * - If request is in-flight, waits for it
   * - Otherwise creates new request and stores it
   * - Safe for SSR/SSG (catches all errors)
   */
  const loadOrgs = useCallback(async () => {
    // If there's already an in-flight request, wait for it
    if (inFlightRequestRef.current) {
      await inFlightRequestRef.current;
      return;
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        setStatus('loading');
        setError(null);

        const res = await orgsApi.list();
        const orgsList = res.data || [];

        setOrgs(orgsList);

        // Apply active org selection rules
        if (orgsList.length === 0) {
          // If org count === 0 → activeOrg = null
          setActiveOrgId(null);
          setActiveOrg(null);
          setOrgUser(null);
          setRoles([]);
        } else if (orgsList.length === 1) {
          // If org count === 1 → auto-select
          const singleOrg = orgsList[0];
          setActiveOrgId(singleOrg.id);
          setActiveOrg(singleOrg);
          // Extract orgUser and roles from org
          setOrgUser({
            orgId: singleOrg.id,
            userId: authSession.user?.id || '',
            roles: singleOrg.roles || [],
          });
          setRoles(singleOrg.roles || []);
        } else {
          // If org count > 1 → do NOT auto-select
          // Keep current activeOrgId if it's still valid, otherwise set to null
          const currentActiveOrgId = activeOrgIdRef.current;
          const currentActiveOrg = orgsList.find(org => org.id === currentActiveOrgId);
          if (currentActiveOrg) {
            setActiveOrgId(currentActiveOrgId);
            setActiveOrg(currentActiveOrg);
            setOrgUser({
              orgId: currentActiveOrg.id,
              userId: authSession.user?.id || '',
              roles: currentActiveOrg.roles || [],
            });
            setRoles(currentActiveOrg.roles || []);
          } else {
            setActiveOrgId(null);
            setActiveOrg(null);
            setOrgUser(null);
            setRoles([]);
          }
        }

        setStatus('ready');
      } catch (err: any) {
        console.error('[OrgSessionProvider] Failed to load orgs:', err);
        setError(err.response?.data?.error?.message || 'Failed to load organizations');
        setStatus('error');
        setOrgs([]);
        setActiveOrgId(null);
        setActiveOrg(null);
        setOrgUser(null);
        setRoles([]);
      } finally {
        // Clear in-flight request
        inFlightRequestRef.current = null;
      }
    })();

    // Store in-flight request
    inFlightRequestRef.current = requestPromise;
    await requestPromise;
  }, [authSession.user?.id]);

  /**
   * Set active org
   * 
   * Changing active org MUST:
   * - Reset org-scoped state
   * - Trigger reload of orgUser + roles
   * - Sync route to reflect active org (if syncRoute is true)
   */
  const setActiveOrgHandler = useCallback((orgId: string | null, syncRoute: boolean = true) => {
    if (orgId === null) {
      setActiveOrgId(null);
      setActiveOrg(null);
      setOrgUser(null);
      setRoles([]);
      // If we're on an org route and syncRoute is true, redirect to org selector
      if (syncRoute && pathname?.startsWith('/orgs/')) {
        isSyncingRouteRef.current = true;
        router.push('/orgs');
        // Reset flag after navigation
        setTimeout(() => {
          isSyncingRouteRef.current = false;
        }, 100);
      }
      return;
    }

    // Find org in current list
    const org = orgs.find(o => o.id === orgId);
    if (org) {
      setActiveOrgId(orgId);
      setActiveOrg(org);
      // Reset and reload orgUser + roles
      setOrgUser({
        orgId: org.id,
        userId: authSession.user?.id || '',
        roles: org.roles || [],
      });
      setRoles(org.roles || []);
      
      // Sync route to reflect active org (only if syncRoute is true)
      if (syncRoute) {
        if (pathname?.startsWith('/orgs/')) {
          const currentRouteOrgId = pathname.split('/')[2];
          if (currentRouteOrgId !== orgId) {
            // Replace orgId in pathname
            isSyncingRouteRef.current = true;
            const newPath = pathname.replace(/^\/orgs\/[^/]+/, `/orgs/${orgId}`);
            router.replace(newPath);
            // Reset flag after navigation
            setTimeout(() => {
              isSyncingRouteRef.current = false;
            }, 100);
          }
        } else if (pathname === '/orgs' || pathname === '/dashboard') {
          // If on org selector or dashboard, navigate to org dashboard
          isSyncingRouteRef.current = true;
          router.push(`/orgs/${orgId}/dashboard`);
          // Reset flag after navigation
          setTimeout(() => {
            isSyncingRouteRef.current = false;
          }, 100);
        }
      }
    } else {
      // Org not found in list, reset
      setActiveOrgId(null);
      setActiveOrg(null);
      setOrgUser(null);
      setRoles([]);
      // Redirect to org selector
      if (syncRoute && pathname?.startsWith('/orgs/')) {
        isSyncingRouteRef.current = true;
        router.push('/orgs');
        // Reset flag after navigation
        setTimeout(() => {
          isSyncingRouteRef.current = false;
        }, 100);
      }
    }
  }, [orgs, authSession.user?.id, pathname, router]);

  /**
   * Refetch org list
   * Clears in-flight request to force new call
   */
  const refetch = useCallback(async () => {
    // Clear in-flight request to force new call
    inFlightRequestRef.current = null;
    await loadOrgs();
  }, [loadOrgs]);

  // Load orgs when auth session is ready and user is authenticated
  useEffect(() => {
    // Only run on client (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Wait for auth session to be ready
    if (authSession.status !== 'ready') {
      return;
    }

    // If user is not authenticated, reset org state
    if (!authSession.user) {
      setStatus('idle');
      setOrgs([]);
      setActiveOrgId(null);
      setActiveOrg(null);
      setOrgUser(null);
      setRoles([]);
      setError(null);
      return;
    }

    // User is authenticated, load orgs
    loadOrgs();
  }, [authSession.status, authSession.user, loadOrgs]);

  // Reset org state when user logs out
  useEffect(() => {
    if (authSession.status === 'idle' && !authSession.user) {
      setStatus('idle');
      setOrgs([]);
      setActiveOrgId(null);
      setActiveOrg(null);
      setOrgUser(null);
      setRoles([]);
      setError(null);
      // Clear in-flight request
      inFlightRequestRef.current = null;
    }
  }, [authSession.status, authSession.user]);

  // Route ↔ Org Synchronization Logic
  // This runs only when auth session is ready
  // Centralized logic - NO page-level logic needed
  useEffect(() => {
    // Only run on client (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent infinite loops - skip if we're already syncing
    if (isSyncingRouteRef.current) {
      return;
    }

    // Wait for auth session to be ready
    if (authSession.status !== 'ready') {
      return;
    }

    // Wait for org session to be ready
    if (status !== 'ready') {
      return;
    }

    // If user is not authenticated, skip
    if (!authSession.user) {
      return;
    }

    // Check if we're on an org-scoped route
    const isOrgRoute = pathname?.startsWith('/orgs/');
    
    if (isOrgRoute && routeOrgId) {
      // Route orgId exists
      if (routeOrgId !== activeOrgId) {
        // Route orgId differs from activeOrgId
        // Validate orgId exists in orgs list
        const orgExists = orgs.some(org => org.id === routeOrgId);
        if (orgExists) {
          // Valid org → setActiveOrg (syncRoute=false to prevent double redirect)
          setActiveOrgHandler(routeOrgId, false);
        } else {
          // Invalid org → redirect to org selector
          isSyncingRouteRef.current = true;
          router.push('/orgs');
          setTimeout(() => {
            isSyncingRouteRef.current = false;
          }, 100);
        }
      }
    } else if (activeOrgId && !isOrgRoute && pathname !== '/orgs') {
      // activeOrgId exists BUT route orgId is missing (and we're not on org selector)
      // Redirect to /orgs/{activeOrgId}/dashboard
      isSyncingRouteRef.current = true;
      router.push(`/orgs/${activeOrgId}/dashboard`);
      setTimeout(() => {
        isSyncingRouteRef.current = false;
      }, 100);
    }
  }, [authSession.status, authSession.user, status, routeOrgId, activeOrgId, orgs, pathname, router, setActiveOrgHandler]);

  const value: OrgSessionContextValue = {
    status,
    orgs,
    activeOrgId,
    activeOrg,
    orgUser,
    roles,
    error,
    setActiveOrg: setActiveOrgHandler,
    refetch,
  };

  return <OrgSessionContext.Provider value={value}>{children}</OrgSessionContext.Provider>;
}

/**
 * useOrgSession hook
 * 
 * Reads ONLY from OrgSessionProvider.
 * Throws if used outside provider.
 * NO org API calls allowed here.
 */
export function useOrgSession(): OrgSessionContextValue {
  const context = useContext(OrgSessionContext);
  if (!context) {
    throw new Error('useOrgSession must be used within OrgSessionProvider');
  }
  return context;
}
