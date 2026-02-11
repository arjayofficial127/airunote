import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/client';

interface SuperAdminStatus {
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to check if the current user is a super admin
 * Uses the /orgs/limit endpoint which returns isSuperAdmin status
 */
export function useSuperAdmin(): SuperAdminStatus {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the /orgs/limit endpoint which returns isSuperAdmin
        const response = await apiClient.get('/orgs/limit');
        const data = response.data?.data;
        
        setIsSuperAdmin(data?.isSuperAdmin || false);
      } catch (err: any) {
        // If endpoint fails, fallback to false
        setError('Failed to check super admin status');
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, []);

  return { isSuperAdmin, loading, error };
}

