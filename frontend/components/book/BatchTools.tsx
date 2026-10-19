'use client';
import { useState } from 'react';
import type { BookBatch } from '@/lib/book';
import type { BookWorkspaceModel } from './useBookWorkspace';
import { PlanningEditor } from './PlanningEditor';
export function BatchTools({ model }: { model: BookWorkspaceModel }) {
  const [change, setChange] = useState<BookBatch['change']>({ kind: 'status', status: 'complete' }); const [preview, setPreview] = useState(false);
  const items = model.items.filter(item => model.batchIds.includes(item.id));
  return <div className="ab-batch"><div className="ab-form-pair"><button onClick={() => { model.setBatchIds(model.filtered.filter(item => !item.invalidPlanning).slice(0, 100).map(item => item.id)); setPreview(false); }}>Select filtered items (up to 100)</button><button onClick={() => { model.setBatchIds([]); setPreview(false); }}>Unselect all</button></div><label>Change<select value={change.kind} onChange={event => { setPreview(false); setChange(event.target.value === 'folder' ? { kind: 'folder', folderId: model.rootFolderId } : event.target.value === 'plan' ? { kind: 'plan', plan: { kind: 'unplanned' } } : { kind: 'status', status: 'complete' }); }}><option value="status">Status</option><option value="folder">Folder</option><option value="plan">Calendar placement</option></select></label>
    {change.kind === 'status' && <select aria-label="Batch status" value={change.status} onChange={event => { setPreview(false); setChange({ kind: 'status', status: event.target.value === 'open' ? 'open' : event.target.value === 'cancelled' ? 'cancelled' : 'complete' }); }}><option value="open">Open</option><option value="complete">Complete</option><option value="cancelled">Cancelled</option></select>}
    {change.kind === 'folder' && <select aria-label="Batch folder" value={change.folderId} onChange={event => { setPreview(false); setChange({ kind: 'folder', folderId: event.target.value }); }}>{model.folders.map(folder => <option value={folder.id} key={folder.id}>{folder.humanId}</option>)}</select>}
    {change.kind === 'plan' && <PlanningEditor plan={change.plan} config={model.config} onChange={plan => { setPreview(false); setChange({ kind: 'plan', plan }); }} />}
    <button disabled={!items.length || model.actions.busy || model.dirty} onClick={() => setPreview(true)}>Preview {items.length} changes</button>{preview && <div><ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul><small>All changes save together. A stale item cancels the whole batch.</small><button className="ab-primary" disabled={model.actions.busy || model.dirty} onClick={() => void model.actions.batch(items, change).then(saved => { if (saved) { setPreview(false); model.setBatchIds([]); } })}>Apply {items.length} changes</button></div>}
  </div>;
}
