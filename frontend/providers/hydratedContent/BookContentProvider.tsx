'use client';
import { createContext, useCallback, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import { errorMessage } from '@/components/book/services';

type Loader = { load: (id: string, force?: boolean) => Promise<void>; loading: string | null; error: string | null };
export const BookContentContext = createContext<Loader | null>(null);
function ContentSession({ orgId, userId, children }: { orgId: string; userId: string; children: ReactNode }) {
  const requests = useRef(new Map<string, Promise<void>>()); const alive = useRef(true);
  const [loading, setLoading] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback(async (id: string, force = false) => {
    const store = useAirunoteStore.getState();
    if (!force && store.getDocumentContentById(id)) return;
    const pending = requests.current.get(id); if (pending) return pending;
    const request = (async () => {
      setLoading(id); setError(null);
      try {
        const response = await airunoteApi.getDocument(id, orgId, userId);
        if (!response.success) throw new Error(response.error?.message ?? 'Could not load this item');
        if (alive.current) { const current = useAirunoteStore.getState(); current.setDocumentContent(response.data.document); current.updateDocumentMetadata(response.data.document); }
      } catch (failure) { if (alive.current) setError(errorMessage(failure)); }
      finally { requests.current.delete(id); if (alive.current) setLoading(value => value === id ? null : value); }
    })(); requests.current.set(id, request); return request;
  }, [orgId, userId]);
  return <BookContentContext.Provider value={{ load, loading, error }}>{children}</BookContentContext.Provider>;
}
// HydratedContentProvider owns this lazy loader. No requests run until an item is opened.
export function BookContentProvider({ children }: { children: ReactNode }) {
  const { activeOrgId } = useOrgSession(); const auth = useAuthSession();
  if (!activeOrgId || !auth.user) return <>{children}</>;
  return <ContentSession key={`${activeOrgId}:${auth.user.id}:${auth.authInvalidateKey}`} orgId={activeOrgId} userId={auth.user.id}>{children}</ContentSession>;
}
export function useBookContent() { const value = useContext(BookContentContext); if (!value) throw new Error('Open a signed-in Book workspace'); return value; }
