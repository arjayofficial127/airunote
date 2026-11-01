'use client';
import { collectionLabels } from '@/lib/collections';
import { BookItemRow } from '@/components/book/BookItemRow';
import { folderLabel } from '@/components/book/domain';
import type { NotesModel } from './useNotesWorkspace';
import type { NotesLensModel } from './useNotesLens';
import { NotesIcon, collectionIcon } from './NotesIcon';
export function FolderContents({ workspace, notes, mode, paneId }: { workspace: NotesModel; notes: NotesLensModel; mode: 'box' | 'list' | 'details' | 'cards'; paneId: string }) {
  const linkedCollections = new Set(notes.links.filter(item => item.entityType === 'collection').map(item => item.entityId));
  const collections = (workspace.collections.data ?? []).filter(item => ((notes.descendants ? notes.scope.has(item.homeFolderId) : item.homeFolderId === notes.folderId) || linkedCollections.has(item.id)) && item.name.toLowerCase().includes(notes.viewModel.query.toLowerCase()));
  const entries = [
    ...notes.folders.map(folder => ({ key: folder.id, name: folderLabel(folder.humanId), kind: 'Folder', icon: 'folder' as const, link: notes.linkedSpaces.has(folder.id), open: () => notes.selectFolder(folder.id) })),
    ...collections.map(item => ({ key: item.id, name: item.name, kind: collectionLabels[item.config.kind], icon: collectionIcon[item.config.kind], link: linkedCollections.has(item.id), open: () => workspace.openCollection(paneId, item.id) })),
    ...notes.viewModel.filtered.map(item => ({ key: item.id, name: item.name, kind: item.planning.kind, icon: 'note' as const, link: notes.linkedNotes.has(item.id), open: () => notes.model.open(item) })),
  ];
  return <><small className="an-contents-count">{entries.length} items{notes.descendants ? ' · including descendants' : ' · direct children'}{notes.links.length ? ' and links' : ''}</small><div className={`an-folder-contents an-folder-${mode}`} aria-label="Folder contents">
    {entries.map(entry => mode === 'cards' && notes.viewModel.filtered.some(item => item.id === entry.key) ? <BookItemRow key={entry.key} item={notes.viewModel.filtered.find(item => item.id === entry.key)!} model={notes.model} showActions={!entry.link}/> : <button key={entry.key} className="an-content-item" title={entry.name} onClick={entry.open}><NotesIcon name={entry.icon}/><span>{entry.link ? '↗ ' : ''}{entry.name}</span>{(mode === 'details' || mode === 'cards') && <small>{entry.kind}</small>}</button>)}
    {!entries.length && <p className="ab-empty">This folder is empty. Use + New to create something here.</p>}
  </div>{workspace.collections.error && <p role="alert">Collections could not load. <button onClick={() => void workspace.collections.refetch()}>Retry</button></p>}</>;
}
