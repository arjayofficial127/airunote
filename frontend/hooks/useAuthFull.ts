import { useEffect, useState } from 'react';
import { authApi, type AuthFullResponse } from '@/lib/api/auth';

interface UseAuthFullReturn {
  data: AuthFullResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch full auth data (user, isSuperAdmin, org, permissions)
 * Uses lightweight /auth/me/full endpoint
 * 
 * @param orgId - Optional org ID to include org data
 */
export function useAuthFull(orgId?: string | null): UseAuthFullReturn {
  const [data, setData] = useState<AuthFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getMeFull(orgId || undefined);
      setData(response.data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setError('Not authenticated');
      } else {
        setError('Failed to load auth data');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
