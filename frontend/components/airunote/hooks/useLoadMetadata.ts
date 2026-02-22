/**
 * Hook to load full metadata into store on mount
 */

import { useEffect } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '../stores/airunoteStore';
import { airunoteApi } from '../services/airunoteApi';

export function useLoadMetadata() {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const { setMetadata, setLoading, setError, isLoading, lastFetched } = useAirunoteStore();

  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  useEffect(() => {
    if (!orgId || !userId) {
      return;
    }

    // Only load if not already loaded or if explicitly needed
    if (isLoading || lastFetched) {
      return;
    }

    const loadMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await airunoteApi.getFullMetadata(orgId, userId);
        if (response.success) {
          setMetadata(response.data.folders, response.data.documents);
        } else {
          setError(new Error(response.error?.message || 'Failed to load metadata'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load metadata'));
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [orgId, userId, setMetadata, setLoading, setError, isLoading, lastFetched]);
}
