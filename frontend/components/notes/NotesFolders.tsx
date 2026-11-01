'use client';
import { ClosedItemsSwitch } from './ClosedItemsSwitch';
import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BookItemRow } from '@/components/book/BookItemRow';
import { DropZone } from '@/components/book/BookDrag';
import { folderLabel } from '@/components/book/domain';
import type { AiruFolder } from '@/components/airunote/types';
import { folderPath, type NotesModel } from './useNotesWorkspace';
import { NotesIcon } from './NotesIcon';
import { RenameFolderForm } from './RenameFolderForm';
import { PaneGroup } from './PaneGroup';
import { addFolderPane, removeFolderPane, type FolderPane } from './panes';
import { useFolderDraft } from './useFolderDraft';

type FolderContext = {
  notes: NotesModel; pane: FolderPane; draft: ReturnType<typeof useFolderDraft>;
  select: (id: string) => void; focus: (id: string | null) => void;
  add: (id: string, kind: 'folder' | 'note') => void;
};
function QuickAdd({ id, context }: { id: string; context: FolderContext }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return <details className="ab-popover an-quick-add" ref={menu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }} onToggle={event => { if (event.currentTarget.open) { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 110)), left: Math.max(8, Math.min(rect.left, window.innerWidth - 165)) }); } }}><summary aria-label={`Add inside ${folderLabel(context.notes.model.folders.find(folder => folder.id === id)?.humanId)}`} title="New Space or note">+</summary><div style={position}>
    <button onClick={() => { context.add(id, 'folder'); if (menu.current) menu.current.open = false; }}>New Space</button>
    <button onClick={() => { context.add(id, 'note'); if (menu.current) menu.current.open = false; }}>New note</button>
    <button onClick={() => { context.notes.links.open(id); if (menu.current) menu.current.open = false; }}>Add link</button>
  </div></details>;
}
function DraftRows({ parentId, context }: { parentId: string; context: FolderContext }) {
  const { model } = context.notes; const { draft, setDraft, save } = context.draft;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (draft?.parentId === parentId) input.current?.focus(); }, [draft?.parentId, parentId]);
  return <>
    {draft?.parentId === parentId && <form className="an-folder-draft" aria-label="New Space draft" onSubmit={event => { event.preventDefault(); void save(); }} onKeyDown={event => { if (event.key === 'Escape' && !model.actions.busy) setDraft(null); }}>
      <NotesIcon name="folder" /><input ref={input} required maxLength={255} placeholder="Space name" aria-label="New Space name" value={draft.name} disabled={model.actions.busy} onChange={event => setDraft({ ...draft, name: event.target.value })}/><small>Draft</small>
      <button disabled={model.actions.busy || !draft.name.trim()} aria-label="Save new Space">✓</button><button type="button" disabled={model.actions.busy} aria-label="Cancel new Space" onClick={() => setDraft(null)}>×</button>
    </form>}
    {model.creating && (model.draftPreview?.folderId ?? model.captureFolderId) === parentId && <button className="an-note-draft" onClick={model.reveal}><NotesIcon name="note"/><span>{model.draftPreview?.name.trim() || 'Untitled note'}</span><small>Draft</small></button>}
  </>;
}
function FolderRow({ folder, context, depth, ancestors }: { folder: AiruFolder; context: FolderContext; depth: number; ancestors: Set<string> }) {
  const [renaming, setRenaming] = useState(false); const titleButton = useRef<HTMLButtonElement>(null);
  const { notes, pane } = context; const { model } = notes;
  const open = !pane.collapsedFolders.includes(folder.id);
  const draggable = useDraggable({ id: `${pane.id}:folder:${folder.id}`, data: { folderId: folder.id }, disabled: renaming || model.actions.busy || !!context.draft.draft });
  if (ancestors.has(folder.id)) return null;
  const visited = new Set([...ancestors, folder.id]);
  const children = model.folders.filter(child => child.parentFolderId === folder.id && child.id !== folder.id);
  const items = model.filtered.filter(item => item.folderId === folder.id && (pane.closed || item.planning.status === 'open') && item.name.toLowerCase().includes(pane.query.toLowerCase()));
  return <div className="an-folder-branch" ref={draggable.setNodeRef} style={draggable.isDragging ? { opacity: .5 } : undefined}>
    <DropZone id={`${pane.id}:folder:${folder.id}`} target={{ kind: 'folder', folderId: folder.id }}>
      <div className="an-folder-row" style={{ paddingInlineStart: `calc(${Math.min(depth, 6)} * var(--an-tree-step))` }} data-selected={pane.folderId === folder.id}>
        <button className="an-disclosure" aria-label={`${open ? 'Collapse' : 'Expand'} ${folderLabel(folder.humanId)}`} aria-expanded={open} onClick={() => notes.updateFolder(pane.id, { collapsedFolders: open ? [...pane.collapsedFolders, folder.id] : pane.collapsedFolders.filter(id => id !== folder.id) })}>{open ? '⌄' : '›'}</button>
        <button className="ab-grip an-folder-grip" aria-label={`Move Space ${folderLabel(folder.humanId)}`} {...draggable.listeners} {...draggable.attributes}>⠿</button>
        {renaming ? <><NotesIcon name="folder"/><RenameFolderForm folder={folder} model={model} onClose={() => { setRenaming(false); requestAnimationFrame(() => titleButton.current?.focus()); }}/></> : <>
          <button ref={titleButton} className="an-folder-select" onClick={() => context.select(folder.id)} title={folderLabel(folder.humanId)}><NotesIcon name="folder"/><span>{folderLabel(folder.humanId)}</span>{items.length > 0 && <small>{items.length}</small>}</button>
          {pane.folderId === folder.id && <QuickAdd id={folder.id} context={context}/>}
          <button className="an-rename-folder" title="Rename Space" aria-label={`Rename ${folderLabel(folder.humanId)}`} onClick={() => setRenaming(true)}><NotesIcon name="edit" width="16" height="16"/></button>
          <button className="an-item-actions" aria-label={`Actions for Space ${folderLabel(folder.humanId)}`} title="Archive or delete Space" disabled={model.actions.busy} onClick={() => notes.lifecycle.choose({ kind: 'folder', item: folder })}>⋯</button>
          <button className="an-focus-folder" title="Focus on this Space" aria-label={`Focus on ${folderLabel(folder.humanId)}`} onClick={() => context.focus(folder.id)}>↗</button>
        </>}
      </div>
    </DropZone>
    {open && <><div className="an-folder-notes" style={{ paddingInlineStart: `calc(${Math.min(depth + 1, 7)} * var(--an-tree-step) + var(--an-file-inset))` }}>
      <DraftRows parentId={folder.id} context={context}/>{items.map(item => <BookItemRow key={item.id} item={item} model={model} compact/>)}
    </div>{children.map(child => <FolderRow key={child.id} folder={child} context={context} depth={depth + 1} ancestors={visited}/>)}</>}
  </div>;
}
function FolderBrowser({ notes, pane, index }: { notes: NotesModel; pane: FolderPane; index: number }) {
  const { model } = notes; const draft = useFolderDraft(model, pane.id);
  const section = useRef<HTMLElement>(null);
  function close() {
    if (section.current?.querySelector('.ab-inline-rename')) { model.actions.setError('Save or cancel the inline edit before closing this pane.'); return; }
    notes.setPanes(previous => removeFolderPane(previous, pane.id, notes.defaultView));
  }
  const select = (id: string) => notes.selectFolder(pane.id, id);
  function focus(id: string | null) { notes.updateFolder(pane.id, { focusId: id }); select(id ?? model.rootFolderId); }
  function revealFolder(id: string) {
    const ancestors = folderPath(model.folders, id).map(folder => folder.id);
    notes.updateFolder(pane.id, { collapsedFolders: pane.collapsedFolders.filter(value => !ancestors.includes(value)) });
  }
  function add(id: string, kind: 'folder' | 'note') {
    if (kind === 'folder') {
      if (draft.draft) { model.actions.setError('Save or cancel the new Space first.'); return; }
      draft.setDraft({ parentId: id, name: '' });
    } else { model.add(undefined, id); }
    revealFolder(id);
  }
  const draftFolderId = model.creating ? model.draftPreview?.folderId ?? model.captureFolderId : null;
  useEffect(() => { if (draftFolderId) revealFolder(draftFolderId);
    // Expand only when the draft moves, not whenever the user deliberately collapses a branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftFolderId]);
  const context: FolderContext = { notes, pane, draft, select, focus, add };
  const roots = pane.focusId ? model.folders.filter(folder => folder.id === pane.focusId) : model.folders.filter(folder => folder.parentFolderId === model.rootFolderId && folder.id !== model.rootFolderId);
  const loose = model.filtered.filter(item => item.folderId === model.rootFolderId && (pane.closed || item.planning.status === 'open') && item.name.toLowerCase().includes(pane.query.toLowerCase()));
  return <section ref={section} className="an-browser-pane an-folders" aria-label={`Folders pane ${index + 1}`} data-active={notes.panes.activeFolder === pane.id}>
    <header><button className="an-pane-name" title="Activate this folder pane" onClick={() => select(pane.folderId)}>{pane.focusId ? folderLabel(model.folders.find(folder => folder.id === pane.focusId)?.humanId) : 'Workspace'}</button><small>{index + 1}</small><button aria-label={`Close folders pane ${index + 1}`} title={draft.draft ? 'Save or cancel the folder draft first' : 'Close pane'} disabled={notes.panes.folders.length === 1 || !!draft.draft} onClick={close}>×</button></header>
    <nav className="an-breadcrumb" aria-label="Space path"><button onClick={() => focus(null)}><NotesIcon name="home"/> Workspace</button>{pane.focusId && folderPath(model.folders, pane.focusId).filter(folder => folder.id !== model.rootFolderId).map(folder => <span key={folder.id}> / <button onClick={() => focus(folder.id)}>{folderLabel(folder.humanId)}</button></span>)}</nav>
    <div className="an-folder-toolbar"><input aria-label={`Filter notes in folders pane ${index + 1}`} placeholder="Filter notes…" value={pane.query} onChange={event => notes.updateFolder(pane.id, { query: event.target.value })}/><ClosedItemsSwitch checked={pane.closed} onChange={closed => notes.updateFolder(pane.id, { closed })} />{pane.folderId === model.rootFolderId && <QuickAdd id={model.rootFolderId} context={context}/>}</div>
    <div className="ab-scroll" data-scroll-key={`folders:${pane.id}`}>
      {!pane.focusId && <DraftRows parentId={model.rootFolderId} context={context}/>}
      {roots.map(folder => <FolderRow key={folder.id} folder={folder} context={context} depth={0} ancestors={new Set()}/>)}
      {!pane.focusId && <DropZone id={`${pane.id}:root`} target={{ kind: 'folder', folderId: model.rootFolderId }}><details open><summary>Loose notes <small>({loose.length})</small></summary>{loose.map(item => <BookItemRow key={item.id} item={item} model={model} compact/>)}</details></DropZone>}
      {!roots.length && !loose.length && <p className="ab-empty">Start with a thought or use + to add a Space.</p>}
    </div>
    {draft.draft && <button className="ab-link an-draft-location" onClick={() => { focus(draft.draft?.parentId === model.rootFolderId ? null : draft.draft?.parentId ?? null); if (draft.draft) revealFolder(draft.draft.parentId); }}>New Space draft · {folderLabel(model.folders.find(folder => folder.id === draft.draft?.parentId)?.humanId)}</button>}
  </section>;
}
export function AddFolderPaneButton({ notes }: { notes: NotesModel }) {
  return <button className="an-add-folder-pane" type="button" title="Add folder pane" aria-label="Add folder pane" disabled={notes.panes.folders.length >= 4} onClick={() => {
    if (notes.workspace.preset === 'cards') notes.setWorkspace(previous => ({ ...previous, navigation: 'folders' }));
    notes.setPanes(previous => addFolderPane(previous, crypto.randomUUID()));
  }}>{notes.workspace.preset === 'cards' ? '+' : '+ Pane'}</button>;
}
export function NotesFolders({ notes }: { notes: NotesModel }) {
  return <PaneGroup title="Folders" panel="organizer" model={notes.model} count={notes.panes.folders.length} layout={notes.panes.folderLayout} onLayout={value => notes.layout('folder', value)} compact={notes.workspace.preset === 'cards' && notes.panes.folders.length === 1}
    actions={notes.workspace.preset === 'panels' && <AddFolderPaneButton notes={notes} />}>
    {notes.panes.folders.map((pane, index) => <FolderBrowser key={pane.id} notes={notes} pane={pane} index={index}/>)}
  </PaneGroup>;
}
