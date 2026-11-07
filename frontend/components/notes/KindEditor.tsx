'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useItemCapabilities } from './useItemCapabilities';
import { PlanningEditor } from '@/components/book/PlanningEditor';
import { folderLabel } from '@/components/book/domain';
import { defaultKindFields, type PlanningFields } from '@/lib/book';
import { ItemActionsButton } from '@/components/book/ItemActionsContext';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { useKindEditor } from './useKindEditor';
import { KindBody } from './KindBody';
import { KindChecklist, KindDueDate, KindEvent, KindGoal } from './KindFields';
import { KindDocumentActions } from './KindDocumentActions';
import { GrowingField } from './GrowingField';
import './kinds.css';
const names = { task: 'Task', event: 'Event', note: 'Note', goal: 'Goal', document: 'Document' };
type Kind = PlanningFields['kind'];

export function KindEditor({ model, document, editorKey, onAdvanced }: { model: BookWorkspaceModel; document: AiruDocument | null; editorKey: string; onAdvanced: () => void }) {
  const features = useItemCapabilities(model.orgId);
  const capabilities = !!features;
  const editor = useKindEditor(model, document, editorKey, capabilities);
  const { state } = editor, kind = state.planning.kind;
  const fields = state.kindFields ?? defaultKindFields();
  const disabled = !editor.ready || model.actions.busy && !editor.saving || editor.readOnly;
  const list = kind === 'task' && fields.taskMode === 'list';
  const [checklist, setChecklist] = useState(false), [conversion, setConversion] = useState<Kind | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), id = useId();
  const stepInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (conversion) dialog.current?.showModal(); else dialog.current?.close(); }, [conversion]);
  function convert(next: Kind) {
    const current = editor.live.current.state;
    const nextFields = current.kindFields ?? defaultKindFields();
    const goal = next === 'goal' ? nextFields.goal ?? { measure: '', unit: '', current: 0, target: 1, nextTaskId: null }
      : nextFields.goal?.measure.trim() && nextFields.goal.target > 0 ? nextFields.goal : null;
    editor.change({ planning: { ...current.planning, kind: next }, kindFields: { ...nextFields, goal } });
    setConversion(null);
  }
  function choose(next: Kind) { if (next === kind) return; if (document) setConversion(next); else convert(next); }
  function addChecklist() { setChecklist(true); requestAnimationFrame(() => stepInput.current?.focus()); }
  const visibility = document?.visibility === 'org' ? 'Shared with organisation' : document?.visibility === 'public' ? 'Public' : 'Private · Only you';
  return <section className="an-kind" aria-label={`${names[kind]} editor`} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void editor.save(); } }}>
    <div className="an-kind-header"><span>{folderLabel(model.folders.find(folder => folder.id === state.folderId)?.humanId)}</span><select aria-label="Item kind" value={kind} disabled={disabled} onChange={event => choose(event.target.value as Kind)}>{(Object.keys(names) as Kind[]).map(value => <option key={value} value={value} disabled={!capabilities && (value === 'goal' || value === 'document') && value !== kind}>{names[value]}</option>)}</select>{document && model.selected && <ItemActionsButton item={model.selected} disabled={disabled || editor.dirty}/>}</div>
    {editor.readOnly && <p role="alert">This item has an unsupported details format. Its saved content has been preserved.</p>}
    {editor.paused && <div className="an-draft-recovery" role="alert"><p>Your draft is kept on this device. The connection failed or the saved item changed.</p><button disabled={disabled} onClick={() => void editor.save()}>Retry save</button>{document?.type === 'RTF' ? <button onClick={() => void navigator.clipboard.writeText(state.content).catch(() => model.actions.setError('Clipboard unavailable. Your HTML source is still in the editor.'))}>Copy HTML source</button> : <button disabled={disabled} onClick={() => void editor.saveCopy()}>Save a copy</button>}<button disabled={disabled} onClick={editor.discard}>Use saved version</button></div>}
    <div className="an-kind-canvas">
      <div className="an-kind-title-row">{kind === 'task' && !list && <input type="checkbox" aria-label="Complete task" checked={state.planning.status === 'complete'} disabled={disabled} onChange={event => editor.planning({ status: event.target.checked ? 'complete' : 'open' })}/>}<h1 className="ab-sr-only">{state.name || `New ${names[kind].toLowerCase()}`}</h1><GrowingField className="an-kind-title" aria-label="Item title" limit={150} autoFocus={!document} required maxLength={255} value={state.name} placeholder={kind === 'task' ? 'What needs to be done?' : kind === 'goal' ? 'What do you want to achieve?' : kind === 'event' ? 'Event title…' : 'What is on your mind?'} disabled={disabled} onChange={event => editor.change({ name: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); if (kind === 'task') { if (state.name.trim()) addChecklist(); } else { event.currentTarget.closest('.an-kind')?.querySelector<HTMLTextAreaElement>('[aria-label="Item content"]')?.focus(); } } }}/></div>
      {kind === 'task' && <KindDueDate editor={editor} model={model} disabled={disabled}/>}
      {kind === 'event' && <KindEvent editor={editor} disabled={disabled} capabilities={capabilities}/>}
      {kind === 'goal' && <KindGoal editor={editor} model={model} disabled={disabled} saved={!!document} capabilities={capabilities}/>}
      {kind === 'task' && (list || checklist || state.planning.checklist.length > 0 || state.step.trim()
        ? <KindChecklist editor={editor} disabled={disabled} task taskDates={!!features?.taskDueDates} required={list} label={list ? 'Tasks' : 'More tasks'} inputRef={stepInput}/>
        : <div className="an-kind-quick-task"><button type="button" className="ab-link" disabled={disabled || !state.name.trim()} onClick={addChecklist}>+ Add another task</button><small>Press <kbd>Enter</kbd> from the title</small></div>)}
      {kind === 'document' && (document
        ? <KindDocumentActions editor={editor} model={model} document={document} capabilities={capabilities} disabled={disabled}/>
        : <div className="an-kind-release-bar"><span><strong>Version</strong> · Working draft</span><span>Save the draft to mark a version ready or export a copy.</span></div>)}
      {kind === 'task' || kind === 'goal' ? <details className="an-kind-details"><summary>Notes</summary><KindBody value={state.content} type={document?.type} onChange={content => editor.change({ content })} disabled={disabled} onChecklist={kind === 'task' ? undefined : addChecklist}/></details> : <KindBody value={state.content} type={document?.type} onChange={content => editor.change({ content })} disabled={disabled} label={kind === 'event' ? 'Agenda' : 'Writing area'} onChecklist={kind === 'document' ? undefined : addChecklist}/>}
      {kind !== 'task' && (checklist || state.planning.checklist.length > 0 || state.step.trim()) && <KindChecklist editor={editor} disabled={disabled} inputRef={stepInput}/>}
      {kind === 'note' && capabilities && document && <button className="ab-link" disabled={disabled} onClick={() => choose('document')}>Turn into a document…</button>}
      <details className="an-kind-details"><summary>Details</summary><fieldset disabled={disabled}>
        <label>Folder<select aria-label="Item folder" value={state.folderId} onChange={event => { editor.change({ folderId: event.target.value }); if (event.target.value !== model.rootFolderId) editor.planning({ processed: true }); }}>{model.folders.map(folder => <option key={folder.id} value={folder.id}>{folderLabel(folder.humanId)}</option>)}</select></label>
        <label>Status<select aria-label="Item status" value={state.planning.status} onChange={event => editor.planning({ status: event.target.value as PlanningFields['status'] })}><option value="open">Open</option><option value="complete" disabled={list || kind === 'goal'}>Complete</option><option value="cancelled">Cancelled</option></select></label>
        {kind !== 'event' && <PlanningEditor plan={state.planning.plan} config={model.planningConfig} onChange={plan => editor.planning({ plan })}/>}
        <label className="an-kind-checklabel"><input type="checkbox" checked={state.planning.priority} onChange={event => editor.planning({ priority: event.target.checked })}/>Priority</label><label className="an-kind-checklabel"><input type="checkbox" checked={state.planning.processed} onChange={event => editor.planning({ processed: event.target.checked })}/>Processed from Inbox</label>
        {capabilities && <label>In-app reminder<input aria-label="In-app reminder" type="datetime-local" value={fields.reminderAt ? new Date(Date.parse(fields.reminderAt) + 8 * 3600000).toISOString().slice(0, 16) : ''} onChange={event => editor.kind({ reminderAt: event.target.value ? new Date(event.target.value + '+08:00').toISOString() : null })}/><small>Singapore time. Reminders appear while Airunote is open.</small></label>}
        <label>Source link<input type="url" aria-label="Item source link" maxLength={2000} value={state.planning.source ?? ''} onChange={event => editor.planning({ source: event.target.value || null })}/></label>
        {state.planning.notes.length > 0 && <div><h3>Context notes</h3>{state.planning.notes.map(note => <p className="an-kind-context-note" key={note.id}>{note.text}</p>)}</div>}
      </fieldset>{document && <button type="button" disabled={disabled || editor.dirty} onClick={onAdvanced}>Advanced details and templates</button>}</details>
    </div>
    <footer className="an-kind-footer"><small>{visibility}</small><span role="status">{editor.saving ? 'Saving…' : editor.paused ? 'Draft kept' : editor.dirty ? 'Unsaved changes' : document ? 'Saved' : 'New draft'}</span>{(!document || editor.dirty) && <><button className="ab-primary" disabled={disabled || editor.saving || !state.name.trim()} onClick={() => void editor.save()}>{document ? 'Save now' : 'Save'}</button><button disabled={disabled || editor.saving} onClick={editor.discard}>{document ? 'Discard changes' : 'Cancel'}</button></>}</footer>
    <dialog ref={dialog} className="an-kind-dialog" aria-labelledby={id} onCancel={() => setConversion(null)}><h2 id={id}>Change to {conversion && names[conversion]}?</h2><p>The title, content, checklist, folder and references stay with this item. Its available controls will change.</p>{conversion === 'event' && <p>Choose an event date and start/end time before saving.</p>}{conversion === 'goal' && <p>Define a success measure and target before saving.</p>}<div className="an-kind-dialog-actions"><button onClick={() => setConversion(null)}>Cancel</button><button className="ab-primary" onClick={() => conversion && convert(conversion)}>Change kind</button></div></dialog>
  </section>;
}
