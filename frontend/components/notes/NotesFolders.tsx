'use client';
import { useEffect, useState } from 'react';
import { BookItemRow } from '@/components/book/BookItemRow';
import { DropZone } from '@/components/book/BookDrag';
import { folderLabel } from '@/components/book/domain';
import { PaneHeading } from '@/components/book/PaneHeading';
import type { AiruFolder } from '@/components/airunote/types';
import type { NotesModel } from './useNotesWorkspace';

function FolderRow({ folder, notes, depth, ancestors }: { folder: AiruFolder; notes: NotesModel; depth: number; ancestors: Set<string> }) {
  const [open, setOpen] = useState(true);
  const { model } = notes;
  if (ancestors.has(folder.id)) return null;
  const visited = new Set([...ancestors, folder.id]);
  const children = model.folders.filter(child => child.parentFolderId === folder.id && child.id !== folder.id);
  const items = model.filtered.filter(item => item.folderId === folder.id && (model.closed || item.planning.status === 'open'));
  return <div className="an-folder-branch">
    <DropZone id={`notes-folder:${folder.id}`} target={{ kind: 'folder', folderId: folder.id }}>
      <div className="an-folder-row" style={{ paddingLeft: Math.min(depth, 6) * 12 }} data-selected={notes.folderId === folder.id}>
        <button className="an-disclosure" aria-label={`${open ? 'Collapse' : 'Expand'} ${folderLabel(folder.humanId)}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? '⌄' : '›'}</button>
        <button className="an-folder-select" onClick={() => notes.selectFolder(folder.id)}><span aria-hidden="true">▱</span><span>{folderLabel(folder.humanId)}</span><small>{items.length}</small></button>
        <button className="an-focus-folder" title="Focus on this folder" aria-label={`Focus on ${folderLabel(folder.humanId)}`} onClick={() => { notes.setFocusId(folder.id); notes.selectFolder(folder.id); }}>↗</button>
      </div>
    </DropZone>
    {open && <><div className="an-folder-notes" style={{ paddingLeft: Math.min(depth + 1, 7) * 12 }}>{items.map(item => <BookItemRow key={item.id} item={item} model={model} compact />)}</div>{children.map(child => <FolderRow key={child.id} folder={child} notes={notes} depth={depth + 1} ancestors={visited} />)}</>}
  </div>;
}

export function NotesFolders({ notes }: { notes: NotesModel }) {
  const { model } = notes; const [adding, setAdding] = useState(false); const [name, setName] = useState('');
  const { setDraftFlag } = model;
  useEffect(() => { setDraftFlag('notes-folder', adding && !!name.trim()); return () => setDraftFlag('notes-folder', false); }, [adding, name, setDraftFlag]);
  const roots = notes.focusId ? model.folders.filter(folder => folder.id === notes.focusId) : model.folders.filter(folder => folder.parentFolderId === model.rootFolderId && folder.id !== model.rootFolderId);
  const loose = model.filtered.filter(item => item.folderId === model.rootFolderId && (model.closed || item.planning.status === 'open'));
  return <section className="ab-pane an-folders" hidden={!model.shownPanels.includes('organizer')} aria-label="02 Folders">
    <PaneHeading panel="organizer" title="Folders" model={model}><button aria-label="Add folder" onClick={() => setAdding(value => !value)}>+</button></PaneHeading>
    <div className="an-folder-toolbar"><button onClick={notes.root}>⌂ All folders</button><label><input type="checkbox" checked={model.closed} onChange={event => model.setClosed(event.target.checked)} /> Closed</label></div>
    {notes.focusId && <p className="an-scope-caption">Focused: {folderLabel(model.folders.find(folder => folder.id === notes.focusId)?.humanId)}</p>}
    {adding && <form className="ab-small-form" onSubmit={event => { event.preventDefault(); void model.actions.createFolder(notes.folderId, name.trim()).then(saved => { if (saved) { setAdding(false); setName(''); } }); }}><small>Inside {folderLabel(model.folders.find(folder => folder.id === notes.folderId)?.humanId)}</small><label>Folder name<input required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></label><button disabled={model.actions.busy || !name.trim()}>Create folder</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></form>}
    <div className="ab-scroll">{roots.map(folder => <FolderRow key={folder.id} folder={folder} notes={notes} depth={0} ancestors={new Set()} />)}
      {!notes.focusId && <DropZone id="notes-root" target={{ kind: 'folder', folderId: model.rootFolderId }}><details open><summary>At root <small>{loose.length}</small></summary>{loose.map(item => <BookItemRow key={item.id} item={item} model={model} compact />)}</details></DropZone>}
      {!roots.length && !loose.length && <p className="ab-empty">Start with a thought or add a folder.</p>}
    </div>
  </section>;
}
