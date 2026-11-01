'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collectionLabels, type CollectionKind, type CollectionMembership } from '@/lib/collections';
import type { CollectionDetail, CollectionReference, Placement } from '@/lib/collections';
import { collectionRequest } from './useCollections';
import { folderPath, type NotesModel } from './useNotesWorkspace';
import { folderLabel } from '@/components/book/domain';
import { errorMessage } from '@/components/book/services';
export function CollectionDialog({ title, close, busy, children }: { title: string; close: () => void; busy?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement; const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus(); }; }, []);
  return <dialog ref={ref} className="an-link-picker an-collection-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) close(); }} onClick={event => { if (event.target !== event.currentTarget || busy) return; const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); }}><header><h2>{title}</h2><button disabled={busy} aria-label={`Close ${title}`} onClick={close}>×</button></header>{children}</dialog>;
}
export function FolderChoice({ notes, value, onChange, all = false, label = 'Home folder' }: { notes: NotesModel; value: string; onChange: (id: string) => void; all?: boolean; label?: string }) {
  return <label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{all && <option value="">Entire workspace</option>}{notes.model.folders.map(folder => <option value={folder.id} key={folder.id}>{folderPath(notes.model.folders, folder.id).map(value => folderLabel(value.humanId)).join(' / ')}</option>)}</select></label>;
}
export function MembershipFields({ notes, value, onChange }: { notes: NotesModel; value: CollectionMembership; onChange: (value: CollectionMembership) => void }) {
  if (value.mode !== 'matching') return <p>Chosen references stay in this collection when their originals move. Removing a reference keeps the original.</p>;
  return <div className="an-collection-fields"><FolderChoice notes={notes} value={value.folderId ?? ''} onChange={folderId => onChange({ ...value, folderId: folderId || null })} all label="Source folder"/><label><input type="checkbox" checked={value.descendants} onChange={event => onChange({ ...value, descendants: event.target.checked })}/> Include descendants</label><label>Status<select value={value.status} onChange={event => onChange({ ...value, status: event.target.value as typeof value.status })}><option value="all">All</option><option value="open">Open</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label><label>Title contains<input value={value.query} maxLength={200} onChange={event => onChange({ ...value, query: event.target.value })}/></label><p>Matching items update with this rule. Moving an original outside the source removes it from these results.</p></div>;
}
export function NewCollectionDialog({ notes, kind, folderId, close, open }: { notes: NotesModel; kind: CollectionKind | 'folder'; folderId: string; close: () => void; open: (id: string, homeFolderId: string) => void }) {
  const [name, setName] = useState(''), [home, setHome] = useState(folderId), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [membership, setMembership] = useState<CollectionMembership>({ mode: 'chosen' });
  const client = useQueryClient();
  const { setDraftFlag } = notes.model;
  useEffect(() => { setDraftFlag('new-collection', !!name.trim()); return () => setDraftFlag('new-collection', false); }, [name, setDraftFlag]);
  async function submit() {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try {
      if (kind === 'folder') { if (await notes.model.actions.createFolder(home, name.trim())) close(); else setError('Folder could not be created. Check its name and try again.'); }
      else { const result = await collectionRequest<CollectionDetail>(notes.model.orgId, '', 'POST', { name: name.trim(), homeFolderId: home, kind, membership }); await client.invalidateQueries({ queryKey: ['collections', notes.model.orgId] }); open(result.collection.id, result.collection.homeFolderId); close(); }
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <CollectionDialog title={`New ${kind === 'folder' ? 'folder' : collectionLabels[kind]}`} close={close} busy={busy}><form onSubmit={event => { event.preventDefault(); void submit(); }} className="an-collection-fields"><label>Name<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><FolderChoice notes={notes} value={home} onChange={setHome}/>{kind !== 'folder' && <><label>Membership<select aria-label="Collection membership" value={membership.mode} disabled={kind === 'pages'} onChange={event => setMembership(event.target.value === 'chosen' ? { mode: 'chosen' } : { mode: 'matching', folderId: null, descendants: true, status: 'all', query: '' })}><option value="chosen">Chosen references</option><option value="matching">Matching items</option></select></label><MembershipFields notes={notes} value={membership} onChange={setMembership}/></>}{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create'}</button></form></CollectionDialog>;
}
export function ReferencePicker({ notes, collectionId, pageId, placements, add, close, error }: { notes: NotesModel; collectionId: string; pageId: string; placements: Placement[]; add: (refs: CollectionReference[]) => Promise<boolean>; close: () => void; error?: string }) {
  const [query, setQuery] = useState(''), [chosen, setChosen] = useState<Set<string>>(new Set()), [busy, setBusy] = useState(false), [limit, setLimit] = useState(100);
  const existing = new Set(placements.filter(item => item.pageId === pageId).map(item => item.entityType + ':' + item.entityId));
  const candidates = [
    ...notes.model.items.map(item => ({ entityId: item.id, entityType: 'document' as const, name: item.name, home: item.folderId })),
    ...notes.model.folders.filter(item => item.id !== notes.model.rootFolderId).map(item => ({ entityId: item.id, entityType: 'folder' as const, name: folderLabel(item.humanId), home: item.parentFolderId })),
    ...(notes.collections.data ?? []).filter(item => item.id !== collectionId).map(item => ({ entityId: item.id, entityType: 'collection' as const, name: item.name, home: item.homeFolderId })),
  ].filter(item => !existing.has(item.entityType + ':' + item.entityId));
  const path = (id: string) => folderPath(notes.model.folders, id).map(folder => folderLabel(folder.humanId)).join(' / ');
  const found = candidates.filter(item => `${item.name} ${path(item.home)}`.toLowerCase().includes(query.toLowerCase()));
  return <CollectionDialog title="Add references" close={close} busy={busy}>{error && <p role="alert">{error}</p>}<p>Choose across the workspace. Originals keep their home and edits are shared.</p><input autoFocus aria-label="Search reference items" placeholder="Search names or folders…" value={query} onChange={event => { setQuery(event.target.value); setLimit(100); }}/><div className="an-collection-actions"><button disabled={busy || found.length > 1000} onClick={() => setChosen(previous => new Set([...previous, ...found.map(item => item.entityType + ':' + item.entityId)]))}>Select matches ({found.length})</button><button onClick={() => setChosen(new Set())}>Clear</button></div><div className="an-link-results">{found.slice(0, limit).map(item => { const key = item.entityType + ':' + item.entityId; return <label key={key} className="an-reference-choice"><input type="checkbox" checked={chosen.has(key)} disabled={busy} onChange={event => setChosen(previous => { const next = new Set(previous); if (event.target.checked) next.add(key); else next.delete(key); return next; })}/><span>{item.name}<small>{item.entityType === 'document' ? 'Note' : item.entityType === 'folder' ? 'Folder' : 'Collection'} · {path(item.home)}</small></span></label>; })}{limit < found.length && <button onClick={() => setLimit(value => value + 100)}>Show more</button>}{!found.length && <p>No matches.</p>}</div><button disabled={busy || !chosen.size || chosen.size > 1000} onClick={async () => { setBusy(true); try { if (await add(candidates.filter(item => chosen.has(item.entityType + ':' + item.entityId)).map(({ entityId, entityType }) => ({ entityId, entityType })))) close(); } finally { setBusy(false); } }}>{busy ? 'Adding…' : `Add ${chosen.size} references`}</button></CollectionDialog>;
}
