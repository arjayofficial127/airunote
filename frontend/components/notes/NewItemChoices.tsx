'use client';
import type { PlanningFields } from '@/lib/book';
import { folderLabel } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { useItemCapabilities } from './useItemCapabilities';

const choices = [
  ['note', 'Note', 'Capture ideas and keep writing'],
  ['task', 'Task', 'Something to complete, with optional due dates'],
  ['event', 'Event', 'Reserve time on your calendar'],
  ['goal', 'Goal', 'Measure progress toward a target'],
  ['document', 'Document', 'Mark a version ready and export a copy'],
] as const;

export function NewItemChoices({ model, folderId, close }: { model: BookWorkspaceModel; folderId?: string; close: () => void }) {
  const capabilities = useItemCapabilities(model.orgId);
  const folder = model.folders.find(item => item.id === folderId);
  function choose(kind: PlanningFields['kind']) {
    close();
    model.add(undefined, folderId, kind);
  }
  return <div className="an-new-choices">
    <strong>New in {folder ? folderLabel(folder.humanId) : 'Workspace'}</strong>
    {choices.map(([kind, label, description]) => <div key={kind}>
      {kind === 'document' && <small className="an-new-category">Writing with versions</small>}
      <button type="button" disabled={!capabilities && (kind === 'document' || kind === 'goal')} onClick={() => choose(kind)}>
        <strong>{label}</strong><small>{description}</small>
      </button>
    </div>)}
  </div>;
}
