import { useEffect, useState } from 'react';
import { type Org } from '@/lib/api/orgs';
import { useOrgSession } from '@/providers/OrgSessionProvider';

interface OrgPermissions {
  isAdmin: boolean;
  isMember: boolean;
  roles: string[];
  loading: boolean;
  error: string | null;
  org: Org | null; // Org data (includes name, slug, etc.) - available after permissions load
}

/**
 * Hook to check user's permissions in an organization
 * Returns admin status, member status, roles, org data, and loading state
 * 
 * Note: The org data comes from OrgSessionProvider to avoid duplicate API calls.
 * Components can use this org data instead of making their own API call.
 */
export function useOrgPermissions(orgId: string | null): OrgPermissions {
  const orgSession = useOrgSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setOrg(null);
      return;
    }

    // Use org data from OrgSessionProvider instead of direct API call
    if (orgSession.status === 'ready' && orgSession.activeOrgId === orgId) {
      const orgData = orgSession.activeOrg;
      const userRoles = orgSession.roles || [];
      
      // Store full org data for reuse by consumers
      setOrg(orgData);
      setRoles(userRoles);
      setIsMember(userRoles.length > 0);
      setIsAdmin(userRoles.some((role: string) => role.toLowerCase() === 'admin'));
      setLoading(false);
      setError(null);
    } else if (orgSession.status === 'loading') {
      setLoading(true);
    } else if (orgSession.status === 'error') {
      setError(orgSession.error || 'Failed to load permissions');
      setIsMember(false);
      setIsAdmin(false);
      setRoles([]);
      setOrg(null);
      setLoading(false);
    } else if (orgSession.status === 'ready' && orgSession.activeOrgId !== orgId) {
      // Org ID mismatch - user might not have access
      setError('You are not a member of this organization');
      setIsMember(false);
      setIsAdmin(false);
      setRoles([]);
      setOrg(null);
      setLoading(false);
    }
  }, [orgId, orgSession]);

  return { isAdmin, isMember, roles, loading, error, org };
}
