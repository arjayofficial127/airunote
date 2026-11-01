'use client';
import { useEffect, useRef, useState } from 'react';
import { readSpaceLinks, linkKey, type SpaceLink } from '@/lib/spaceLinks';
import { folderLabel } from '@/components/book/domain';
import { folderPath, type NotesModel } from './useNotesWorkspace';

export function SpaceLinkPicker({ notes }: { notes: NotesModel }) {
  const { links, model } = notes;
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    if (links.addingTo) { setQuery(''); element?.showModal(); }
    else element?.close();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, [links.addingTo]);
  const space = model.folders.find(folder => folder.id === links.addingTo);
  const existing = new Set(readSpaceLinks(space?.metadata).map(linkKey));
  const path = (id: string) => folderPath(model.folders, id).map(folder => folderLabel(folder.humanId)).join(' / ');
  const candidates: Array<{ link: SpaceLink; name: string; source: string }> = [
    ...model.folders.filter(folder => folder.id !== space?.id && folder.id !== model.rootFolderId && folder.parentFolderId !== space?.id).map(folder => ({ link: { entityId: folder.id, entityType: 'folder' as const }, name: folderLabel(folder.humanId), source: path(folder.parentFolderId) })),
    ...model.items.filter(item => item.folderId !== space?.id).map(item => ({ link: { entityId: item.id, entityType: 'document' as const }, name: item.name, source: path(item.folderId) })),
    ...(notes.collections.data ?? []).filter(item => item.homeFolderId !== space?.id).map(item => ({ link: { entityId: item.id, entityType: 'collection' as const }, name: item.name, source: path(item.homeFolderId) })),
  ].filter(item => !existing.has(linkKey(item.link)) && `${item.name} ${item.source}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog ref={dialog} className="an-link-picker" onCancel={event => { event.preventDefault(); links.close(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) links.close(); } }} aria-labelledby="space-link-title">
    <header><h2 id="space-link-title">Add link to {folderLabel(space?.humanId)}</h2><button disabled={links.busy} aria-label="Close link picker" onClick={links.close}>×</button></header>
    <p>Choose an existing note or folder. Its original home stays the same.</p>
    <input autoFocus aria-label="Find a note or folder" placeholder="Search notes and Folders…" value={query} onChange={event => setQuery(event.target.value)}/>
    {links.error && <p role="alert" className="ab-error">{links.error}</p>}
    <div className="an-link-results">{candidates.slice(0, 100).map(item => <button key={linkKey(item.link)} disabled={links.busy} onClick={async () => { if (space && await links.change(space.id, item.link)) links.close(); }}><span>{item.link.entityType === 'folder' ? '▱' : '↗'} {item.name}</span><small>{item.link.entityType === 'folder' ? 'Folder' : 'Note'} · {item.source}</small></button>)}
      {!candidates.length && <p>No matching items to link.</p>}{candidates.length > 100 && <small>Type more to narrow these results.</small>}</div>
  </dialog>;
}
