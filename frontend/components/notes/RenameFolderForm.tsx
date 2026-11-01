'use client';

import type { AiruFolder } from '@/components/airunote/types';
import { useUpdateFolder } from '@/components/airunote/hooks/useUpdateFolder';
import { InlineRename } from '@/components/book/InlineRename';
import type { NotesModel } from './useNotesWorkspace';

export function RenameFolderForm({ folder, model, onClose }: {
  folder: AiruFolder;
  model: NotesModel['model'];
  onClose: () => void;
}) {
  const updateFolder = useUpdateFolder();
  return <InlineRename name={folder.humanId} label="Space name" onClose={onClose} setDraftFlag={model.setDraftFlag}
    error={updateFolder.error?.message} onSave={async humanId => {
      await updateFolder.mutateAsync({ folderId: folder.id, orgId: model.orgId, userId: model.userId, humanId });
      return true;
    }} />;
}
