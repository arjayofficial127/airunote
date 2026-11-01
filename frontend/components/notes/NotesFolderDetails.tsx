'use client';
import { useEffect, useRef, useState } from 'react';
import type { AiruFolder } from '@/components/airunote/types';
import { useUpdateFolder } from '@/components/airunote/hooks/useUpdateFolder';
import { folderLabel } from '@/components/book/domain';
import { folderPath, viewLabel, type NotesModel } from './useNotesWorkspace';

export function NotesFolderDetails({ notes, folder }: { notes: NotesModel; folder: AiruFolder }) {
  const [name, setName] = useState(folder.humanId);
  const update = useUpdateFolder();
  const previousName = useRef(folder.humanId);
  const dirty = name.trim() !== folder.humanId || update.isPending;
  const { setFolderDirty } = notes; const { setDraftFlag } = notes.model;
  useEffect(() => { setFolderDirty(dirty); setDraftFlag('folder-details', dirty); return () => { setFolderDirty(false); setDraftFlag('folder-details', false); }; }, [dirty, setFolderDirty, setDraftFlag]);
  useEffect(() => { const previous = previousName.current; setName(current => current === previous ? folder.humanId : current); previousName.current = folder.humanId; }, [folder.humanId]);
  const root = folder.id === notes.model.rootFolderId;
  async function save() {
    if (!name.trim() || update.isPending || root) return;
    try { await update.mutateAsync({ folderId: folder.id, orgId: notes.model.orgId, userId: notes.model.userId, humanId: name.trim() }); }
    catch { /* Mutation error remains visible and the draft is retained. */ }
  }
  return <section className="an-folder-details ab-scroll" aria-label="Space details">
    <p className="an-breadcrumb">{folderPath(notes.model.folders, folder.id).map(value => folderLabel(value.humanId)).join(' / ')}</p>
    <h2>{folderLabel(folder.humanId)}</h2>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Space name<input aria-label="Space details name" value={root ? 'Workspace' : name} disabled={root || update.isPending} maxLength={255} required onChange={event => { setName(event.target.value); setFolderDirty(event.target.value.trim() !== folder.humanId); }} /></label>
      {!root && <div className="an-folder-save"><button type="submit" disabled={!dirty || !name.trim() || update.isPending}>{update.isPending ? 'Saving…' : 'Save name'}</button><button type="button" disabled={!dirty || update.isPending} onClick={() => { setName(folder.humanId); update.reset(); }}>Discard changes</button></div>}
      {update.error && <p role="alert" className="ab-error">{update.error.message}</p>}
    </form>
    <label>Default view<select aria-label="Default Space view" value={notes.defaultView(folder.id)} onChange={event => notes.setPanes(previous => ({ ...previous, defaults: { ...previous.defaults, [folder.id]: event.target.value } }))}>
      <option value="list">List</option><option value="agenda">Plan</option><option value="calendar">Calendar</option>
      {notes.availableViews.filter(view => view.folderId === folder.id).map(view => <option key={view.id} value={view.id}>{viewLabel(view, notes.availableViews)}</option>)}
    </select></label><small>Default view is remembered on this browser.</small>
    <dl><dt>Type</dt><dd>{folder.type}</dd><dt>Visibility</dt><dd>{folder.visibility}</dd>
      <dt>Notes</dt><dd>{notes.model.items.filter(item => item.folderId === folder.id).length}</dd>
      <dt>Spaces</dt><dd>{notes.model.folders.filter(item => item.parentFolderId === folder.id && item.id !== folder.id).length}</dd>
      <dt>Created</dt><dd>{new Date(folder.createdAt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })}</dd></dl>
    {!root && <button disabled={dirty || notes.model.actions.busy} onClick={() => notes.lifecycle.choose({ kind: 'folder', item: folder })}>Archive or delete Space…</button>}
  </section>;
}
