'use client';
import { useState } from 'react';
import { defaultKindFields, type CalendarPlan } from '@/lib/book';
import { today, planLabel } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { KindEditorModel } from './useKindEditor';
import { GrowingField } from './GrowingField';

export function KindChecklist({ editor, disabled, label = 'Checklist', required = false }: { editor: KindEditorModel; disabled: boolean; label?: string; required?: boolean }) {
  const { state } = editor; const items = state.planning.checklist;
  const done = items.filter(item => item.done).length;
  return <section className="an-kind-checklist" aria-label={label}>
    <div className="an-kind-count"><span>{done}/{items.length} done</span>{items.length > 0 && <span>{Math.round(done / items.length * 100)}%</span>}</div>
    {items.length > 0 && <progress aria-label={`${label} progress`} max={items.length} value={done}/>}
    {items.map((item, index) => <div className="an-kind-checkrow" key={item.id} data-done={item.done}>
      <input type="checkbox" aria-label={item.text || `Item ${index + 1}`} disabled={disabled} checked={item.done} onChange={event => { const done = event.target.checked; editor.planning(previous => ({ checklist: previous.checklist.map(value => value.id === item.id ? { ...value, done } : value) })); }}/>
      <GrowingField aria-label={`Edit checklist item ${index + 1}`} value={item.text} maxLength={2000} disabled={disabled} onChange={event => { const text = event.target.value; editor.planning(previous => ({ checklist: previous.checklist.map(value => value.id === item.id ? { ...value, text } : value) })); }}/>
      <button type="button" title={required && items.length === 1 ? 'Keep one item or choose Single task' : 'Remove item'} aria-label={`Remove checklist item ${index + 1}`} disabled={disabled || required && items.length === 1} onClick={() => editor.planning(previous => ({ checklist: previous.checklist.filter(value => value.id !== item.id) }))}>×</button>
    </div>)}
    <div className="an-kind-add"><input aria-label="New checklist item" placeholder="Add a step…" disabled={disabled} maxLength={2000} value={state.step} onChange={event => editor.change({ step: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); editor.addStep(); } }}/><button type="button" aria-label="Add checklist item" disabled={disabled || !state.step.trim() || items.length >= 200} onClick={editor.addStep}>+</button></div>
  </section>;
}

export function KindDueDate({ editor, model, disabled }: { editor: KindEditorModel; model: BookWorkspaceModel; disabled: boolean }) {
  const plan = editor.state.planning.plan;
  return <label className="an-kind-due">{editor.state.planning.kind === 'goal' ? 'Target date' : 'Due date'}<input aria-label="Due date" type="date" disabled={disabled} value={plan.kind === 'day' ? plan.date : ''} onChange={event => editor.planning({ plan: event.target.value ? { kind: 'day', date: event.target.value, time: plan.kind === 'day' ? plan.time : null, duration: plan.kind === 'day' ? plan.duration : null } : { kind: 'unplanned' } })}/>{plan.kind !== 'day' && plan.kind !== 'unplanned' && <small>{planLabel(plan, model.planningConfig)}</small>}</label>;
}

export function KindEvent({ editor, disabled, capabilities }: { editor: KindEditorModel; disabled: boolean; capabilities: boolean }) {
  const plan = editor.state.planning.plan;
  const date = plan.kind === 'day' ? plan.date : today();
  const start = plan.kind === 'day' ? plan.time ?? '' : '';
  const minutes = start ? Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) : 0;
  const endMinutes = plan.kind === 'day' && plan.duration ? minutes + plan.duration : null;
  const end = endMinutes !== null ? `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}` : '';
  const draftEnd = editor.state.eventEnd;
  function change(patch: { date?: string; start?: string; end?: string }) {
    const current = editor.live.current.state;
    const plan = current.planning.plan;
    const day = patch.date ?? (plan.kind === 'day' ? plan.date : today());
    const time = patch.start ?? (plan.kind === 'day' ? plan.time ?? '' : '');
    const priorStart = plan.kind === 'day' && plan.time ? Number(plan.time.slice(0, 2)) * 60 + Number(plan.time.slice(3)) : 0;
    const priorEnd = plan.kind === 'day' && plan.duration ? priorStart + plan.duration : null;
    const endTime = patch.end ?? current.eventEnd ?? (priorEnd !== null ? `${String(Math.floor(priorEnd / 60)).padStart(2, '0')}:${String(priorEnd % 60).padStart(2, '0')}` : '');
    const startMinutes = time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : 0;
    const finish = endTime ? Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) : null;
    const next: CalendarPlan = { kind: 'day', date: day, time: time || null, duration: time && finish !== null && finish > startMinutes ? finish - startMinutes : null };
    editor.change({ planning: { ...current.planning, plan: next }, eventEnd: patch.end ?? current.eventEnd }); if (capabilities) editor.kind({});
  }
  const fields = editor.state.kindFields ?? defaultKindFields();
  return <section className="an-kind-event" aria-label="Event details">
    <div className="an-kind-event-time"><label>Date<input aria-label="Event date" type="date" value={date} disabled={disabled} required onChange={event => change({ date: event.target.value })}/></label><label>Start<input aria-label="Event start" type="time" value={start} disabled={disabled} required onChange={event => change({ start: event.target.value })}/></label><label>End<input aria-label="Event end" type="time" value={draftEnd ?? end} disabled={disabled} required onChange={event => change({ end: event.target.value })}/></label></div>
    <small>Singapore time{plan.kind === 'day' && plan.duration ? ` · ${plan.duration} minutes` : ' · Choose an end time after the start, on the same day.'}</small>
    {capabilities && <><label>Location <span className="ab-muted">(optional)</span><input aria-label="Event location" maxLength={2000} disabled={disabled} value={fields.location} onChange={event => editor.kind({ location: event.target.value })} placeholder="A place or video meeting"/></label><label>Meeting link <span className="ab-muted">(optional)</span><input aria-label="Meeting link" type="url" disabled={disabled} value={fields.meetingUrl ?? ''} maxLength={2000} onChange={event => editor.kind({ meetingUrl: event.target.value || null })} placeholder="https://…"/></label>{fields.meetingUrl && /^https?:\/\//i.test(fields.meetingUrl) && <a className="an-kind-join" href={fields.meetingUrl} target="_blank" rel="noopener noreferrer">Join call ↗</a>}</>}
  </section>;
}

export function KindGoal({ editor, model, disabled, saved, capabilities }: { editor: KindEditorModel; model: BookWorkspaceModel; disabled: boolean; saved: boolean; capabilities: boolean }) {
  const goal = editor.state.kindFields?.goal;
  const [updating, setUpdating] = useState(false), [amount, setAmount] = useState('');
  function update(patch: Partial<NonNullable<typeof goal>>) { editor.kind(previous => ({ goal: { measure: '', unit: '', current: 0, target: 1, nextTaskId: null, ...previous.goal, ...patch } })); }
  if (!goal) return capabilities ? <button type="button" disabled={disabled} onClick={() => update({})}>Define success measure</button> : null;
  const progress = Math.max(0, Math.min(100, goal.target > 0 ? goal.current / goal.target * 100 : 0));
  const task = model.items.find(item => item.id === goal.nextTaskId);
  const configure = !saved || !goal.measure.trim();
  const form = <div className="an-kind-goal-fields"><label>Success measure<input aria-label="Success measure" value={goal.measure} maxLength={120} disabled={disabled} onChange={event => update({ measure: event.target.value })} placeholder="Revenue received, chapters read…"/></label><label>Unit <span className="ab-muted">(optional)</span><input aria-label="Goal unit" maxLength={30} value={goal.unit} disabled={disabled} onChange={event => update({ unit: event.target.value })} placeholder="PHP, chapters…"/></label><div className="an-kind-pair"><label>Current<input aria-label="Goal current" type="number" min="0" max="1000000000000000" step="any" value={goal.current} disabled={disabled} onChange={event => update({ current: Number(event.target.value) })}/></label><label>Target<input aria-label="Goal target" type="number" min="0.000001" max="1000000000000000" step="any" value={goal.target} disabled={disabled} onChange={event => update({ target: Number(event.target.value) })}/></label></div><label>Next action <span className="ab-muted">(optional)</span><select aria-label="Goal next task" value={goal.nextTaskId ?? ''} disabled={disabled} onChange={event => update({ nextTaskId: event.target.value || null })}><option value="">Choose a task</option>{model.items.filter(item => item.planning.kind === 'task').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>;
  return <section className="an-kind-goal" aria-label="Goal progress">
    <KindDueDate editor={editor} model={model} disabled={disabled}/>
    {configure ? form : <><div className="an-kind-metric"><small>{goal.measure}</small><p><strong>{goal.current.toLocaleString()}</strong> <span>{goal.unit} of {goal.target.toLocaleString()}</span></p><progress aria-label="Goal progress" value={progress} max={100}/><div className="an-kind-count"><span>{Math.round(progress)}% of target</span><span>{Math.max(0, goal.target - goal.current).toLocaleString()} {goal.unit} to go</span></div></div>
      {updating ? <div className="an-kind-add"><label>New progress<input autoFocus aria-label="New goal progress" type="number" step="any" min="0" max="1000000000000000" value={amount} onChange={event => setAmount(event.target.value)}/></label><button type="button" disabled={disabled || !amount || !Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 1e15} onClick={() => { update({ current: Number(amount) }); setUpdating(false); }}>Record progress</button><button type="button" onClick={() => setUpdating(false)}>Cancel</button></div> : <div className="an-kind-progress-actions"><small>Progress measures the outcome, independently of tasks.</small><button type="button" disabled={disabled} onClick={() => { setAmount(String(goal.current)); setUpdating(true); }}>Update progress</button></div>}
      {goal.nextTaskId && <div className="an-kind-next"><small>Next action</small>{task ? <button type="button" onClick={() => model.open(task)}>{task.name} ↗</button> : <p>Linked task is unavailable.</p>}</div>}
      <details className="an-kind-details"><summary>Goal settings</summary>{form}</details></>}
    {editor.details?.goalHistory.length ? <details className="an-kind-details"><summary>Progress history</summary>{[...editor.details.goalHistory].reverse().map((entry, index) => <p key={index}><strong>{entry.current.toLocaleString()} / {entry.target.toLocaleString()} {entry.unit}</strong><br/><small>{entry.measure} · {new Date(entry.at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</small></p>)}</details> : null}
  </section>;
}
