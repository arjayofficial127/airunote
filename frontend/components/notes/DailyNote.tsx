'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { checklistSchema } from '@/lib/book';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

const draftSchema = z.object({
  checklist: checklistSchema, content: z.string().max(1000000), step: z.string().max(2000),
  base: z.string(), expected: z.string().datetime(),
});
type Checklist = z.infer<typeof checklistSchema>;

export function DailyNote({ model, document }: { model: BookWorkspaceModel; document: AiruDocument }) {
  const original = {
    checklist: model.selected!.planning.checklist,
    content: document.canonicalContent ?? document.content,
  };
  const originalBase = JSON.stringify(original);
  const [checklist, setChecklist] = useState(original.checklist);
  const [content, setContent] = useState(original.content);
  const [step, setStep] = useState('');
  const [base, setBase] = useState(originalBase);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const expected = useRef(new Date(document.updatedAt).toISOString());
  const pending = useRef(false);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const key = `airunote:daily-draft:${model.orgId}:${model.userId}:${document.id}`;
  const value = JSON.stringify({ checklist, content });
  const dirty = value !== base || !!step.trim();
  const latest = useRef({ model, checklist, content, step, base });
  latest.current = { model, checklist, content, step, base };
  const { setDirty } = model;
  const { load } = useBookContent();

  useEffect(() => {
    alive.current = true;
    try {
      const draft = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null'));
      if (draft.success) {
        setChecklist(draft.data.checklist);
        setContent(draft.data.content);
        setStep(draft.data.step);
        setBase(draft.data.base);
        expected.current = draft.data.expected;
        setPaused(draft.data.base !== originalBase);
      }
    } catch { /* In-memory drafts and close guards remain available. */ }
    setReady(true);
    input.current?.focus();
    return () => { alive.current = false; };
    // The editor is keyed by note ID. Revisions must not reinitialize a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    setDirty(dirty || saving);
    try {
      if (dirty) sessionStorage.setItem(key, JSON.stringify({ checklist, content, step, base, expected: expected.current }));
      else sessionStorage.removeItem(key);
    } catch { /* The mounted editor still protects this draft. */ }
  }, [ready, dirty, saving, checklist, content, step, base, key, setDirty]);

  useEffect(() => {
    if (!ready || pending.current || expected.current === new Date(document.updatedAt).toISOString()) return;
    if (dirty) { setPaused(true); return; }
    expected.current = new Date(document.updatedAt).toISOString();
    setChecklist(original.checklist);
    setContent(original.content);
    setBase(originalBase);
  }, [ready, dirty, document.updatedAt, originalBase]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeChecklist(next: Checklist) {
    setChecklist(next);
    model.setDirty(true);
  }
  function add() {
    if (!step.trim() || checklist.length >= 200) return;
    changeChecklist([...checklist, { id: crypto.randomUUID(), text: step.trim(), done: false }]);
    setStep('');
    input.current?.focus();
  }
  async function save(): Promise<boolean> {
    const current = latest.current;
    if (pending.current || current.model.actions.busy || !current.model.selected || current.model.selected.invalidPlanning) return false;
    const next = current.step.trim()
      ? [...current.checklist, { id: crypto.randomUUID(), text: current.step.trim(), done: false }]
      : current.checklist;
    const validated = checklistSchema.safeParse(next);
    if (!validated.success) {
      current.model.actions.setError('Each item needs text. Keep the daily list within 200 items.');
      return false;
    }
    const snapshot = JSON.stringify({ checklist: validated.data, content: current.content });
    if (snapshot === current.base && !current.step.trim()) return true;
    pending.current = true;
    setSaving(true);
    const saved = await current.model.actions.update(current.model.selected, {
      content: current.content,
      planning: { ...current.model.actions.fields(current.model.selected), checklist: validated.data },
    }, expected.current);
    pending.current = false;
    if (!alive.current) return false;
    setSaving(false);
    if (!saved) {
      setPaused(true);
      void load(document.id, true);
      return false;
    }
    expected.current = new Date(saved.updatedAt).toISOString();
    setChecklist(validated.data);
    setContent(current.content);
    setStep('');
    setBase(snapshot);
    setPaused(false);
    current.model.setDirty(false);
    return true;
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    // An unfinished new line stays a draft until Enter, Add, or an explicit save.
    if (!ready || value === base || step.trim() || paused || saving || model.actions.busy) return;
    const timer = setTimeout(() => void saveRef.current(), 600);
    return () => clearTimeout(timer);
  }, [ready, value, base, step, paused, saving, model.actions.busy]);

  function discard() {
    if (pending.current) return;
    expected.current = new Date(document.updatedAt).toISOString();
    setChecklist(original.checklist);
    setContent(original.content);
    setStep('');
    setBase(originalBase);
    setPaused(false);
    model.setDirty(false);
    try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  }
  async function saveCopy() {
    if (pending.current || model.actions.busy || !model.selected) return;
    const next = step.trim() ? [...checklist, { id: crypto.randomUUID(), text: step.trim(), done: false }] : checklist;
    const validated = checklistSchema.safeParse(next);
    if (!validated.success) { model.actions.setError('Check the checklist before saving a copy.'); return; }
    const saved = await model.actions.capture(`${document.name.slice(0, 240)} (draft)`, 'note', model.selected.planning.plan, document.folderId, content, {
      ...model.actions.fields(model.selected), checklist: validated.data,
    });
    if (saved) { discard(); model.setSelectedId(saved.id); }
  }
  useEditorSession({ save, discard });
  const disabled = !ready || saving || model.actions.busy || model.selected?.invalidPlanning;
  return <section className="an-daily" aria-label="Daily checklist" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); void save(); }
  }}>
    <div className="an-daily-status"><span>{checklist.filter(item => item.done).length}/{checklist.length} done</span>
      <small role="status">{saving ? 'Saving…' : paused ? 'Draft kept on this device' : dirty ? 'Unsaved changes' : 'Saved'}</small>
    </div>
    {paused && <div className="an-draft-recovery" role="alert"><p>Your changes are still here. The connection failed or the saved note changed.</p>
      <button disabled={disabled} onClick={() => void save()}>Retry save</button>
      <button disabled={disabled} onClick={() => void saveCopy()}>Save a copy</button>
      <button disabled={disabled} onClick={discard}>Use saved version</button>
    </div>}
    <fieldset disabled={disabled}>
      <legend className="ab-sr-only">Checklist items</legend>
      {checklist.map((item, index) => <div className="an-daily-item" data-done={item.done} key={item.id}>
        <input type="checkbox" aria-label={item.text || `Item ${index + 1}`} checked={item.done}
          onChange={event => changeChecklist(checklist.map(check => check.id === item.id ? { ...check, done: event.target.checked } : check))}/>
        <input aria-label={`Edit item ${index + 1}`} value={item.text} maxLength={2000}
          onChange={event => changeChecklist(checklist.map(check => check.id === item.id ? { ...check, text: event.target.value } : check))}
          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); input.current?.focus(); } }}/>
        <button aria-label={`Remove item ${index + 1}`} title="Remove item" onClick={() => changeChecklist(checklist.filter(check => check.id !== item.id))}>×</button>
      </div>)}
      <form className="an-daily-add" onSubmit={event => { event.preventDefault(); add(); }}>
        <input ref={input} aria-label="New daily item" placeholder="Add an item…" value={step} maxLength={2000}
          onChange={event => { setStep(event.target.value); model.setDirty(true); }}
          onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}/>
        <button disabled={!step.trim() || checklist.length >= 200} aria-label="Add daily item">+</button>
      </form>
      <details className="an-daily-notes" open={content ? true : undefined}>
        <summary>Notes</summary><textarea aria-label="Daily notes" rows={3} value={content} maxLength={1000000}
          placeholder="Anything else to remember…" onChange={event => { setContent(event.target.value); model.setDirty(true); }}/>
      </details>
    </fieldset>
    {dirty && !paused && <button className="ab-link" disabled={disabled} onClick={() => void save()}>Save now</button>}
  </section>;
}
