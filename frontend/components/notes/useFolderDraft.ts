'use client';
import { useEffect, useState } from 'react';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
export function useFolderDraft(model: BookWorkspaceModel, paneId: string) {
  const [draft, setDraft] = useState<{ parentId: string; name: string } | null>(null);
  const { setDraftFlag } = model;
  useEffect(() => { setDraftFlag(`folder-create:${paneId}`, !!draft?.name.trim()); return () => setDraftFlag(`folder-create:${paneId}`, false); }, [draft?.name, paneId, setDraftFlag]);
  async function save() {
    if (!draft?.name.trim() || model.actions.busy) return;
    if (await model.actions.createFolder(draft.parentId, draft.name.trim())) setDraft(null);
  }
  return { draft, setDraft, save };
}
