'use client';
import { useRef, useState } from 'react';
import { planningFieldsSchema, type CalendarPlan } from '@/lib/book';
import { PlanningEditor } from '@/components/book/PlanningEditor';
import { addDays, folderLabel, monday, today } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { folderPath } from './useNotesWorkspace';

/** Small edits use the same revision-checked update as the full details editor. */
export function NoteQuickDetails({ model, target, close, allDetails }: { model: BookWorkspaceModel; target: 'folder' | 'planning'; close: () => void; allDetails: () => void }) {
  const item = model.selected!;
  const original = useRef({ folderId: item.folderId, plan: item.planning.plan, revision: new Date(item.updatedAt).toISOString() });
  const [folderId, setFolderId] = useState(original.current.folderId);
  const [plan, setPlan] = useState<CalendarPlan>(original.current.plan);
  const dirty = target === 'folder' ? folderId !== original.current.folderId : JSON.stringify(plan) !== JSON.stringify(original.current.plan);
  function choosePlan(value: CalendarPlan) { setPlan(value); model.setDirty(JSON.stringify(value) !== JSON.stringify(original.current.plan)); }
  function cancel() { if (model.actions.busy) return; model.setDirty(false); close(); }
  async function save() {
    if (!dirty || model.actions.busy || item.invalidPlanning) return;
    const parsed = planningFieldsSchema.safeParse({ ...model.actions.fields(item), ...(target === 'planning' ? { plan } : folderId !== model.rootFolderId ? { processed: true } : {}) });
    if (!parsed.success) { model.actions.setError(parsed.error.issues[0]?.message ?? 'Check the schedule.'); return; }
    const saved = await model.actions.update(item, { planning: parsed.data, ...(target === 'folder' ? { folderId } : {}) }, original.current.revision);
    if (saved) { model.setDirty(false); close(); }
  }
  return <section className="an-quick-details" aria-label={target === 'planning' ? 'Schedule note' : 'Move note'} onKeyDown={event => {
    if (event.key === 'Escape' && !dirty) { event.preventDefault(); cancel(); }
  }}>
    <h2>{target === 'planning' ? 'Schedule' : 'Move to folder'}</h2><p className="an-quick-note-title">{item.name}</p>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={model.actions.busy || item.invalidPlanning}>
        {target === 'planning' ? <>
          <div className="an-schedule-shortcuts"><button type="button" onClick={() => choosePlan({ kind: 'day', date: today(), time: plan.kind === 'day' ? plan.time : null, duration: plan.kind === 'day' ? plan.duration : null })}>Today</button><button type="button" onClick={() => choosePlan({ kind: 'day', date: addDays(today(), 1), time: plan.kind === 'day' ? plan.time : null, duration: plan.kind === 'day' ? plan.duration : null })}>Tomorrow</button><button type="button" onClick={() => choosePlan({ kind: 'week', start: addDays(monday(today()), 7) })}>Next week</button></div>
          <PlanningEditor plan={plan} config={model.planningConfig} onChange={choosePlan}/>
        </> : <label>Folder<select id="ab-context-folder" autoFocus value={folderId} onChange={event => { setFolderId(event.target.value); model.setDirty(event.target.value !== original.current.folderId); }}>{model.folders.map(folder => <option key={folder.id} value={folder.id}>{folderPath(model.folders, folder.id).map(part => folderLabel(part.humanId)).join(' / ')}</option>)}</select></label>}
      </fieldset>
      <div className="an-quick-actions"><button className="ab-primary" disabled={!dirty || model.actions.busy || item.invalidPlanning}>{model.actions.busy ? 'Saving…' : target === 'planning' ? 'Save schedule' : 'Move note'}</button><button type="button" disabled={model.actions.busy} onClick={cancel}>Cancel</button></div>
      <small role="status">{dirty ? 'Unsaved changes' : target === 'planning' ? 'Choose a day or a broader intention.' : 'The note and its references stay connected.'}</small>
    </form>
    <button className="ab-link" disabled={dirty || model.actions.busy} onClick={allDetails}>All note details</button>
  </section>;
}
