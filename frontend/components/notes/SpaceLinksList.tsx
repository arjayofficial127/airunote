'use client';
import { linkKey } from '@/lib/spaceLinks';
import { folderLabel } from '@/components/book/domain';
import { folderPath, type NotesModel } from './useNotesWorkspace';
import type { NotesLensModel } from './useNotesLens';

/** Manage references independently of any view's filters or item lifecycle menu. */
export function SpaceLinksList({ workspace, notes }: { workspace: NotesModel; notes: NotesLensModel }) {
  if (!notes.links.length) return null;
  return <details className="an-space-links"><summary>Links <small>{notes.links.length}</small></summary>
    {workspace.links.error && !workspace.links.addingTo && <p role="alert" className="ab-error">{workspace.links.error}</p>}
    {notes.links.map(link => {
      const folder = link.entityType === 'folder' ? notes.model.folders.find(item => item.id === link.entityId) : null;
      const note = link.entityType === 'document' ? notes.model.items.find(item => item.id === link.entityId) : null;
      const collection = link.entityType === 'collection' ? workspace.collections.data?.find(item => item.id === link.entityId) : null;
      const sourceId = folder?.parentFolderId ?? note?.folderId ?? collection?.homeFolderId;
      const title = folder ? folderLabel(folder.humanId) : note?.name ?? collection?.name ?? 'Unavailable item';
      const source = sourceId ? folderPath(notes.model.folders, sourceId).map(item => folderLabel(item.humanId)).join(' / ') : 'Archived, deleted or no longer accessible';
      return <div key={linkKey(link)} className="an-space-link"><button disabled={!folder && !note && !collection} onClick={() => { if (folder) notes.selectFolder(folder.id); else if (note) notes.model.open(note); else if (collection) workspace.openCollection(notes.paneId, collection.id); }}><span>↗ {title}</span><small>{source}</small></button>
        <button aria-label={`Remove link to ${title}`} title="Remove link; keep the original" disabled={workspace.links.busy} onClick={() => void workspace.links.change(notes.folderId, link, true)}>×</button></div>;
    })}
  </details>;
}
