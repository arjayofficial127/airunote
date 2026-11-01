'use client';
import { useEffect, useRef, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { folderLabel } from '@/components/book/domain';
import { folderState } from '@/lib/airunoteLifecycle';
import type { NotesModel } from './useNotesWorkspace';
import type { LifecycleTarget } from './useNotesLifecycle';
export function NotesLifecycleDialog({ notes }: { notes: NotesModel }) {
  const { lifecycle: actions, model } = notes;
  const folders = useAirunoteStore(state => state.foldersById), documents = useAirunoteStore(state => state.documentsById);
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false), [tab, setTab] = useState<'archived' | 'trashed'>('archived');
  const open = !!actions.target || actions.recovery;
  useEffect(() => { setDeleting(false); }, [actions.target]);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const owned = Array.from(folders.values()).filter(folder => folder.orgId === model.orgId && folder.ownerUserId === model.userId);
  const ids = new Set(owned.map(folder => folder.id));
  const entries: LifecycleTarget[] = [
    ...owned.filter(folder => folderState(folder) === tab).map(item => ({ kind: 'folder' as const, item })),
    ...Array.from(documents.values()).filter(item => item.ownerUserId === model.userId && ids.has(item.folderId) && item.state === tab).map(item => ({ kind: 'note' as const, item })),
  ];
  const target = actions.target;
  const name = target ? target.kind === 'folder' ? folderLabel(target.item.humanId) : target.item.name : '';
  const state = target?.kind === 'folder' ? folderState(target.item) : target?.item.state;
  return <dialog ref={dialog} className="an-lifecycle-dialog" aria-labelledby="an-lifecycle-title" onCancel={event => { event.preventDefault(); actions.close(); }}>
    <header><h2 id="an-lifecycle-title">{target ? name : 'Archive & Trash'}</h2><button aria-label="Close actions" disabled={actions.busy} onClick={actions.close}>×</button></header>
    {actions.error && <p role="alert" className="ab-error">{actions.error}</p>}
    {target ? <>
      {deleting ? <><p>{target.kind === 'folder' ? `Move this folder to Trash? Its direct notes and child Folders will move to ${folderLabel(folders.get(target.item.parentFolderId)?.humanId)}. Their contents and schedules stay intact.` : 'Move this note to Trash? You can restore it later.'}</p>{target.kind === 'folder' && <p className="ab-muted">Restoring this folder will not move those contents back automatically. Its saved views remain with the folder.</p>}<div className="an-dialog-actions"><button disabled={actions.busy} onClick={() => setDeleting(false)}>Cancel</button><button className="ab-primary" disabled={actions.busy} onClick={() => void actions.change(target, 'trashed')}>{actions.busy ? 'Moving…' : 'Move to Trash'}</button></div></> : <div className="an-lifecycle-choices">
        {state === 'active' ? <><button disabled={actions.busy} onClick={() => void actions.change(target, 'archived')}>Archive {target.kind === 'folder' ? 'Folder' : 'note'}</button><small>{target.kind === 'folder' ? 'Keep this folder and its contents together. Restore anytime.' : 'Keep this note for later. Restore anytime.'}</small></> : <button disabled={actions.busy} onClick={() => void actions.change(target, 'active')}>Restore {target.kind === 'folder' ? 'Folder' : 'note'}</button>}
        {state !== 'trashed' && <button disabled={actions.busy} onClick={() => setDeleting(true)}>Delete {target.kind === 'folder' ? 'Folder' : 'note'}…</button>}
      </div>}
    </> : <><div className="an-dialog-actions"><button aria-pressed={tab === 'archived'} onClick={() => setTab('archived')}>Archive</button><button aria-pressed={tab === 'trashed'} onClick={() => setTab('trashed')}>Trash</button></div><div className="an-recovery-list">{entries.map(entry => <div key={`${entry.kind}:${entry.item.id}`}><span>{entry.kind === 'folder' ? folderLabel(entry.item.humanId) : entry.item.name}<small>{entry.kind === 'folder' ? 'Folder' : 'note'} · {folderLabel(folders.get(entry.kind === 'folder' ? entry.item.parentFolderId : entry.item.folderId)?.humanId)}</small></span><button disabled={actions.busy} onClick={() => void actions.change(entry, 'active')}>Restore</button></div>)}{!entries.length && <p>Nothing in {tab === 'archived' ? 'Archive' : 'Trash'}.</p>}</div></>}
  </dialog>;
}
