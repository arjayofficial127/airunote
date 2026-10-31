'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { defaultPlanning, editablePlanning, planningFieldsSchema, type PlanningFields } from '@/lib/book';
import { PlanningEditor } from './PlanningEditor';
import { folderLabel, planLabel } from './domain';
import { PaneHeading } from './PaneHeading';
import type { BookWorkspaceModel } from './useBookWorkspace';
import type { AiruDocument } from '@/components/airunote/types';

function ContextEditor({ model, document }: { model: BookWorkspaceModel; document: AiruDocument | null }) {
  const current = model.selected;
  const [name, setName] = useState(document?.name ?? ''); const [content, setContent] = useState(document?.canonicalContent ?? document?.content ?? '');
  const [folderId, setFolderId] = useState(document?.folderId ?? model.captureFolderId);
  const [fields, setFields] = useState<PlanningFields>(() => current ? model.actions.fields(current) : { ...editablePlanning(defaultPlanning(model.natural ? 'note' : 'task', false)), plan: model.capturePlan });
  const [step, setStep] = useState(''); const [note, setNote] = useState(''); const [templateName, setTemplateName] = useState('');
  const expected = useRef(document ? new Date(document.updatedAt).toISOString() : '');
  function reset() {
    setName(document?.name ?? ''); setContent(document?.canonicalContent ?? document?.content ?? ''); setFolderId(document?.folderId ?? model.captureFolderId);
    const initial = current ? model.actions.fields(current) : editablePlanning(defaultPlanning(model.natural ? 'note' : 'task', false));
    setFields({ ...initial, plan: current ? initial.plan : model.capturePlan });
    expected.current = document ? new Date(document.updatedAt).toISOString() : '';
    model.setDirty(false); setStep(''); setNote('');
  }
  useEffect(() => { if (!model.dirty) reset(); /* Preserve drafts when remote metadata changes. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.updatedAt, model.capturePlan]);
  function change<K extends keyof PlanningFields>(key: K, value: PlanningFields[K]) { setFields(previous => ({ ...previous, [key]: value })); model.setDirty(true); }
  async function save() {
    const parsed = planningFieldsSchema.safeParse(fields);
    if (!parsed.success) { model.actions.setError(parsed.error.issues[0]?.message ?? 'Check the planning fields'); return; }
    if (step.trim() || note.trim()) { model.actions.setError('Add or clear the pending checklist step and note before saving.'); return; }
    const saved = current ? await model.actions.update(current, { name: name.trim(), ...(document?.type !== 'RTF' ? { content } : {}), folderId, planning: parsed.data }, expected.current) : await model.actions.capture(name.trim(), fields.kind, fields.plan, folderId, content, parsed.data);
    if (saved) { model.setDirty(false); model.setCreating(false); model.setSelectedId(saved.id); expected.current = new Date(saved.updatedAt).toISOString(); }
  }
  const readonly = current?.invalidPlanning ?? false;
  return <form className="ab-context-editor" onSubmit={event => { event.preventDefault(); void save(); }}>
    {!current && model.config.templates.length > 0 && <label>Start from a template<select defaultValue="" onChange={event => {
      const template = model.config.templates.find(candidate => candidate.id === event.target.value); if (!template) return;
      setContent(template.content); setFields(previous => ({ ...previous, kind: template.kind, checklist: template.steps.map(text => ({ id: crypto.randomUUID(), text, done: false })) })); model.setDirty(true);
    }}><option value="">Blank entry</option>{model.config.templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>}
    <fieldset disabled={readonly || model.actions.busy}>
      <label className="ab-sr-only" htmlFor="ab-context-name">Entry title</label><input id="ab-context-name" className="ab-context-title" required maxLength={255} value={name} placeholder="What is on your mind?" onChange={event => { setName(event.target.value); model.setDirty(true); }} />
      <div className="ab-form-pair"><label>Kind<select value={fields.kind} onChange={event => { const parsed = planningFieldsSchema.shape.kind.safeParse(event.target.value); if (parsed.success) change('kind', parsed.data); }}><option value="task">• Task</option><option value="event">○ Event</option><option value="note">– Note</option><option value="goal">★ Goal</option><option value="document">Document</option></select></label><label>Status<select value={fields.status} onChange={event => { const parsed = planningFieldsSchema.shape.status.safeParse(event.target.value); if (parsed.success) change('status', parsed.data); }}><option value="open">• Open</option><option value="complete">✓ Complete</option><option value="cancelled">× Cancelled</option></select></label></div>
      <label>Folder<select id="ab-context-folder" value={folderId} onChange={event => { setFolderId(event.target.value); if (event.target.value !== model.rootFolderId) change('processed', true); else model.setDirty(true); }}>{model.folders.map(folder => <option key={folder.id} value={folder.id}>{folderLabel(folder.humanId)}</option>)}</select></label>
      <label>Brief{document?.type === 'RTF' ? <span>Rich text is preserved. Use the original document editor below.</span> : <textarea rows={5} maxLength={1000000} value={content} placeholder="Instructions, context, or useful links" onChange={event => { setContent(event.target.value); model.setDirty(true); }} />}</label>
      <section><h3>Planning</h3><PlanningEditor plan={fields.plan} onChange={plan => change('plan', plan)} config={model.planningConfig} /><small>{planLabel(fields.plan, model.planningConfig)}</small></section>
      <div className="ab-context-checks"><label><input type="checkbox" checked={fields.priority} onChange={event => change('priority', event.target.checked)} /> Priority</label><label><input type="checkbox" checked={fields.processed} onChange={event => change('processed', event.target.checked)} /> Processed from Inbox</label></div>
      <section><h3>Next steps</h3>{fields.checklist.map(check => <div className="ab-checklist-row" key={check.id}><label><input type="checkbox" checked={check.done} onChange={event => change('checklist', fields.checklist.map(item => item.id === check.id ? { ...item, done: event.target.checked } : item))} /><span>{check.text}</span></label><button type="button" aria-label={`Remove step ${check.text}`} onClick={() => change('checklist', fields.checklist.filter(item => item.id !== check.id))}>×</button></div>)}<div className="ab-inline-add"><input aria-label="New checklist step" maxLength={2000} placeholder="Add a next step" value={step} onChange={event => { setStep(event.target.value); model.setDirty(true); }} /><button type="button" disabled={!step.trim()} onClick={() => { change('checklist', [...fields.checklist, { id: crypto.randomUUID(), text: step.trim(), done: false }]); setStep(''); }}>+</button></div></section>
      <section><h3>Notes</h3>{fields.notes.map(item => <div className="ab-context-note" key={item.id}><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</small></div>)}<div className="ab-inline-add"><textarea aria-label="New context note" rows={2} maxLength={20000} value={note} placeholder="Add a note" onChange={event => { setNote(event.target.value); model.setDirty(true); }} /><button type="button" disabled={!note.trim()} onClick={() => { change('notes', [...fields.notes, { id: crypto.randomUUID(), text: note.trim(), createdAt: new Date().toISOString() }]); setNote(''); }}>+</button></div></section>
      <details><summary>Other context</summary><label>Source link<input type="url" value={fields.source ?? ''} onChange={event => change('source', event.target.value || null)} placeholder="https://" /></label>{fields.source && /^https?:\/\//i.test(fields.source) && <a href={fields.source} target="_blank" rel="noreferrer">Open source ↗</a>}</details>
    </fieldset>
    <div className="ab-context-save"><button className="ab-primary" disabled={model.actions.busy || readonly || (!model.dirty && !!current)}>{model.actions.busy ? 'Saving…' : current ? model.dirty ? 'Save changes' : 'Saved' : 'Capture entry'}</button><button type="button" disabled={model.actions.busy || (!model.dirty && !!current)} onClick={reset}>Discard draft</button><small role="status">{model.dirty ? 'Unsaved changes' : current ? 'All changes saved' : 'New entry'}</small></div>
    {current && <><Link className="ab-link" href={`/orgs/${model.orgId}/airunote/document/${current.id}?bookFolderId=${model.rootFolderId}`}>Open in document editor ↗</Link><details><summary>Activity · {current.planning.history.length}</summary>{!current.planning.history.length && <p className="ab-empty">No Book changes recorded yet.</p>}{[...current.planning.history].reverse().map(event => <p key={event.id}>{event.action}<small>{new Date(event.at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} · {event.actorId === model.userId ? 'You' : event.actorId}</small></p>)}</details><details><summary>Save as a template</summary><label>Template name<input maxLength={100} value={templateName} onChange={event => setTemplateName(event.target.value)} /></label><button type="button" disabled={!templateName.trim() || model.actions.busy || model.dirty} onClick={() => void model.actions.configure({ ...model.config, templates: [...model.config.templates, { id: crypto.randomUUID(), name: templateName.trim(), kind: fields.kind, content, steps: fields.checklist.map(check => check.text) }] }).then(saved => { if (saved) setTemplateName(''); })}>Save template</button><small>Creates fresh steps. Dates, status, ownership, and history are excluded.</small></details></>}
  </form>;
}
export function ContextPane({ model, onClose }: { model: BookWorkspaceModel; onClose?: () => void }) {
  const loader = useBookContent();
  const selectedId = model.selected?.id; const { load } = loader;
  const document = useAirunoteStore(state => model.selected ? state.documentContentById.get(model.selected.id) ?? null : null);
  useEffect(() => { if (selectedId) void load(selectedId); }, [selectedId, load]);
  return <section className="ab-pane ab-context" hidden={!model.shownPanels.includes('context')} aria-label={model.natural ? "Note details" : "04 Context"}><PaneHeading panel="context" title={model.natural ? "Note details" : undefined} model={model}><button aria-label="Clear Context" onClick={() => { if (model.dirty) { model.actions.setError('Save or discard your Context draft first.'); return; } if (onClose) onClose(); else { model.setSelectedId(null); model.setCreating(false); } }}>×</button></PaneHeading>
    <div className="ab-scroll">{model.selected && !document ? <div><p role={loader.error ? 'alert' : 'status'}>{loader.error ?? 'Loading this item…'}</p>{loader.error && <button onClick={() => void loader.load(model.selected?.id ?? '', true)}>Retry</button>}</div> : model.creating || (model.selected && document) ? <ContextEditor key={model.selected?.id ?? 'new'} model={model} document={document} /> : <div className="ab-context-empty"><div className="ab-orbit" aria-hidden="true">·</div><p>One thing at a time.</p><small>Choose an item to open its context here.</small><button className="ab-link" onClick={() => model.add()}>+ Write with context</button></div>}</div>
  </section>;
}
