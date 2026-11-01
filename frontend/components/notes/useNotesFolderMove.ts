'use client';
import { useRef } from 'react';
import { useMoveFolder } from '@/components/airunote/hooks/useMoveFolder';
import { subtree } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
export function useNotesFolderMove(model: BookWorkspaceModel) {
  const move = useMoveFolder(); const pending = useRef(false);
  return async (folderId: string, destination: string) => {
    const folder = model.folders.find(value => value.id === folderId);
    if (!folder || !model.folders.some(value => value.id === destination) || folderId === model.rootFolderId || folder.parentFolderId === destination || pending.current) return;
    if (subtree(model.folders, folderId).has(destination)) { model.actions.setError('A folder cannot move inside itself or one of its subfolders.'); return; }
    pending.current = true;
    try { await move.mutateAsync({ folderId, newParentFolderId: destination, orgId: model.orgId, userId: model.userId }); }
    catch (error) { model.actions.setError(error instanceof Error ? error.message : 'Could not move the folder.'); }
    finally { pending.current = false; }
  };
}
