'use client';
import { useEffect, useRef, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { changeSpaceLink } from '@/lib/api/spaceLinks';
import type { SpaceLink } from '@/lib/spaceLinks';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

export function useSpaceLinks(model: BookWorkspaceModel) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const pending = useRef(false), alive = useRef(true), activeOrg = useRef(model.orgId);
  activeOrg.current = model.orgId;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function open(id: string) { setAddingTo(id); setError(null); }
  async function change(folderId: string, link: SpaceLink, remove = false) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError(null);
    const orgId = model.orgId;
    try {
      const patch = await changeSpaceLink(orgId, folderId, link, remove);
      if (!alive.current || activeOrg.current !== orgId) return false;
      const store = useAirunoteStore.getState(), folder = store.foldersById.get(patch.id);
      if (folder?.orgId === orgId) store.updateFolder({ ...folder, metadata: patch.metadata });
      return true;
    } catch (failure) {
      if (alive.current && activeOrg.current === orgId) {
        const detail = failure && typeof failure === 'object' && 'response' in failure ? failure.response : null;
        const data = detail && typeof detail === 'object' && 'data' in detail ? detail.data : null;
        const issue = data && typeof data === 'object' && 'error' in data ? data.error : null;
        setError(issue && typeof issue === 'object' && 'message' in issue && typeof issue.message === 'string' ? issue.message : 'Could not save the link. Please try again.');
      }
      return false;
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  return { addingTo, open, busy, error, change, close: () => { if (!pending.current) { setAddingTo(null); setError(null); } } };
}
