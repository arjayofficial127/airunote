'use client';
import { useEffect, useRef, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import type { AiruDocumentMetadata, AiruFolder } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { errorMessage } from '@/components/book/services';
import { folderState, type LifecycleState } from '@/lib/airunoteLifecycle';
import { lifecycleApi } from './services/lifecycle';
export type LifecycleTarget = { kind: 'folder'; item: AiruFolder } | { kind: 'note'; item: AiruDocumentMetadata };
export function useNotesLifecycle(model: BookWorkspaceModel) {
  const [target, setTarget] = useState<LifecycleTarget | null>(null);
  const [recovery, setRecovery] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const pending = useRef(false), alive = useRef(true);
  const { activeOrgId } = useOrgSession(); const active = useRef(activeOrgId); active.current = activeOrgId;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const available = () => alive.current && active.current === model.orgId;
  function choose(value: LifecycleTarget | null, recover = false) {
    if (model.dirty || model.hasDrafts) { model.actions.setError('Save or discard your draft first.'); return; }
    setTarget(value); setRecovery(recover); setError(null);
  }
  async function change(value: LifecycleTarget, state: LifecycleState) {
    if (pending.current || model.actions.busy || !available()) return;
    if (model.dirty || model.hasDrafts) { setError('Save or discard your draft first.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      if (value.kind === 'folder') {
        const result = await lifecycleApi.folder(model.orgId, value.item.id, state, folderState(value.item));
        if (!available()) return;
        const store = useAirunoteStore.getState();
        for (const patch of [...result.folders, result.folder]) { const current = useAirunoteStore.getState().foldersById.get(patch.id); if (current) store.updateFolder({ ...current, ...patch }); }
        for (const patch of result.documents) { const current = store.documentsById.get(patch.id); if (current) store.updateDocumentMetadata({ ...current, ...patch }); store.removeDocumentContent(patch.id); }
      } else {
        const patch = await lifecycleApi.note(model.orgId, value.item.id, state, new Date(value.item.updatedAt).toISOString());
        if (!available()) return;
        const store = useAirunoteStore.getState();
        const current = store.documentsById.get(patch.id); if (current) store.updateDocumentMetadata({ ...current, ...patch });
        store.removeDocumentContent(patch.id);
      }
      model.setSelectedId(null); setTarget(null);
    } catch (failure) { if (available()) setError(errorMessage(failure)); }
    finally { pending.current = false; if (available()) setBusy(false); }
  }
  return { target, recovery, busy, error, choose, change, close: () => { if (!pending.current) { setTarget(null); setRecovery(false); setError(null); } } };
}
export type NotesLifecycle = ReturnType<typeof useNotesLifecycle>;
