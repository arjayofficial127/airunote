'use client';
import { useEffect, useRef, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import { NotesWorkspace } from './NotesWorkspace';

function useNotesRoot(orgId: string | null, userId: string | undefined) {
  const store = useAirunoteStore();
  const root = Array.from(store.foldersById.values()).find(folder => folder.orgId === orgId && folder.ownerUserId === userId && folder.humanId === '__user_root__');
  const [error, setError] = useState<string | null>(null);
  const provisioned = useRef<string | null>(null);
  useEffect(() => {
    if (!orgId || !userId || root || store.isLoading || store.lastFetched === null || store.error) return;
    const key = `${orgId}:${userId}`;
    if (provisioned.current === key) return;
    provisioned.current = key;
    let active = true;
    void airunoteApi.provision(orgId, userId, userId).then(response => {
      if (!active) return;
      if (!response.success) throw new Error(response.error?.message ?? 'Could not prepare Notes.');
      useAirunoteStore.getState().addFolder(response.data.rootFolder);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not prepare Notes.'); });
    return () => { active = false; provisioned.current = null; };
  }, [orgId, userId, root, store.isLoading, store.lastFetched, store.error]);
  return { root, error: error ?? store.error?.message };
}

export function NotesRoute() {
  const { activeOrgId } = useOrgSession(); const auth = useAuthSession();
  const { root, error } = useNotesRoot(activeOrgId, auth.user?.id);
  if (error) return <div className="p-6" role="alert">{error}<button className="ml-4 underline" onClick={() => window.location.reload()}>Retry</button></div>;
  if (!activeOrgId || !auth.user || !root) return <p className="p-6" role="status">Opening Notes…</p>;
  return <NotesWorkspace key={`${activeOrgId}:${auth.user.id}`} rootFolderId={root.id} orgId={activeOrgId} userId={auth.user.id} />;
}
