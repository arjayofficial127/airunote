'use client';
import { useState } from 'react';
import type { PlanningFields } from '@/lib/book';
import { today, addDays, folderLabel, type BookItem } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
export function InboxDecision({ item, model }: { item: BookItem; model: BookWorkspaceModel }) {
  const [mode, setMode] = useState<'later' | 'file' | null>(null);
  const [date, setDate] = useState(addDays(today(), 1)); const [folder, setFolder] = useState(model.rootFolderId);
  const disabled = model.actions.busy || model.dirty || item.invalidPlanning;
  const note = item.planning.kind === 'note' || item.planning.kind === 'document';
  async function decide(changes: Partial<PlanningFields>, folderId?: string) {
    if (disabled) return;
    const saved = await model.actions.update(item, { ...(folderId ? { folderId } : {}), planning: { ...model.actions.fields(item), ...changes, processed: true } });
    if (saved) setMode(null);
  }
  return <div className="an-inbox-decisions">
    <div className="an-decision-buttons">{note ? <><button disabled={disabled} onClick={() => void decide({})}>✓ Keep</button><button disabled={disabled} onClick={() => setMode(mode === 'file' ? null : 'file')}>File…</button></> : <><button disabled={disabled} onClick={() => void decide({ plan: { kind: 'day', date: today(), time: item.planning.plan.kind === 'day' ? item.planning.plan.time : null, duration: item.planning.plan.kind === 'day' ? item.planning.plan.duration : null } })}>Today</button><button disabled={disabled} onClick={() => setMode(mode === 'later' ? null : 'later')}>Later…</button><button disabled={disabled} onClick={() => void decide({ status: 'complete' })}>✓ Done</button></>}</div>
    {mode === 'later' && <div className="an-decision-form"><label>Choose a day<input aria-label={`Schedule ${item.name}`} type="date" value={date} onChange={event => setDate(event.target.value)} /></label><button disabled={disabled || !date} onClick={() => void decide({ plan: { kind: 'day', date, time: item.planning.plan.kind === 'day' ? item.planning.plan.time : null, duration: item.planning.plan.kind === 'day' ? item.planning.plan.duration : null } })}>Schedule</button><button disabled={disabled} onClick={() => void decide({ plan: { kind: 'unplanned' } })}>Keep without a date</button></div>}
    {mode === 'file' && <div className="an-decision-form"><label>Move to folder<select value={folder} onChange={event => setFolder(event.target.value)}>{model.folders.map(value => <option key={value.id} value={value.id}>{folderLabel(value.humanId)}</option>)}</select></label><button disabled={disabled} onClick={() => void decide({}, folder)}>File note</button></div>}
  </div>;
}
