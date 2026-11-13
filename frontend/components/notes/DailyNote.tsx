'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { checklistSchema } from '@/lib/book';
import { DailyBody } from './DailyBody';
import { readDailyBody, writeDailyBody, type DailyBlock } from './dailyBody';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

const draftSchema = z.object({
  checklist: checklistSchema, content: z.string().max(1000000), step: z.string().max(2000),
  reflection: z.string().max(19986).default(''),
  base: z.string(), expected: z.string().datetime(),
});
export const reflectionPrefix = 'Close the day\n';

export function DailyNote({ model, document }: { model: BookWorkspaceModel; document: AiruDocument }) {
  const original = {
    checklist: model.selected!.planning.checklist,
    content: document.canonicalContent ?? document.content,
    reflection: model.selected!.planning.notes.find(note => note.text.startsWith(reflectionPrefix))?.text.slice(reflectionPrefix.length) ?? '',
  };
  const originalBase = JSON.stringify(original);
  const [blocks, setBlocks] = useState(() => readDailyBody(original.content, original.checklist));
  const [body, setBody] = useState({ content: original.content, checklist: original.checklist });
  const { content, checklist } = body;
  const [reflection, setReflection] = useState(original.reflection);
  const [base, setBase] = useState(originalBase);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const expected = useRef(new Date(document.updatedAt).toISOString());
  const pending = useRef(false);
  const alive = useRef(true);
  const key = `airunote:daily-draft:${model.orgId}:${model.userId}:${document.id}`;
  const value = JSON.stringify({ checklist, content, reflection });
  const dirty = value !== base;
  const latest = useRef({ model, checklist, content, reflection, base });
  latest.current = { model, checklist, content, reflection, base };
  const { setDirty } = model;
  const { load } = useBookContent();

  useEffect(() => {
    alive.current = true;
    try {
      const draft = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null'));
      if (draft.success) {
        const restored = readDailyBody(draft.data.content, draft.data.checklist);
        if (draft.data.step.trim()) {
          const id = crypto.randomUUID();
          restored.push(draft.data.checklist.length < 200
            ? { kind: 'task', key: id, task: { id, text: draft.data.step.trim(), done: false } }
            : { kind: 'text', key: id, text: draft.data.step });
        }
        setBlocks(restored);
        setBody(draft.data.step.trim() ? writeDailyBody(restored) : { content: draft.data.content, checklist: draft.data.checklist });
        setReflection(draft.data.reflection);
        setBase(draft.data.base);
        expected.current = draft.data.expected;
        setPaused(draft.data.base !== originalBase);
      }
    } catch { /* In-memory drafts and close guards remain available. */ }
    setReady(true);
    return () => { alive.current = false; };
    // The editor is keyed by note ID. Revisions must not reinitialize a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    setDirty(dirty || saving);
    try {
      if (dirty) sessionStorage.setItem(key, JSON.stringify({ checklist, content, reflection, step: '', base, expected: expected.current }));
      else sessionStorage.removeItem(key);
    } catch { /* The mounted editor still protects this draft. */ }
  }, [ready, dirty, saving, checklist, content, reflection, base, key, setDirty]);

  useEffect(() => {
    if (!ready || pending.current || expected.current === new Date(document.updatedAt).toISOString()) return;
    if (dirty) { setPaused(true); return; }
    expected.current = new Date(document.updatedAt).toISOString();
    setBlocks(readDailyBody(original.content, original.checklist));
    setBody({ content: original.content, checklist: original.checklist });
    setReflection(original.reflection);
    setBase(originalBase);
  }, [ready, dirty, document.updatedAt, originalBase]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeBody(next: DailyBlock[]) {
    setBlocks(next);
    setBody(writeDailyBody(next));
  }
  function reflectionNotes(currentModel: BookWorkspaceModel, text: string) {
    const notes = currentModel.selected!.planning.notes;
    const existing = notes.find(note => note.text.startsWith(reflectionPrefix));
    const others = notes.filter(note => note.id !== existing?.id);
    return text.trim() ? [...others, { id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date().toISOString(), text: reflectionPrefix + text }] : others;
  }
  async function save(): Promise<boolean> {
    const current = latest.current;
    if (pending.current || current.model.actions.busy || !current.model.selected || current.model.selected.invalidPlanning) return false;
    const validated = checklistSchema.safeParse(current.checklist);
    if (!validated.success) {
      current.model.actions.setError('Each item needs text. Keep the daily list within 200 items.');
      return false;
    }
    if (current.content.length > 1_000_000) { current.model.actions.setError('The daily note is too long to save.'); return false; }
    const snapshot = JSON.stringify({ checklist: validated.data, content: current.content, reflection: current.reflection });
    if (snapshot === current.base) return true;
    pending.current = true;
    setSaving(true);
    const saved = await current.model.actions.update(current.model.selected, {
      content: current.content,
      planning: { ...current.model.actions.fields(current.model.selected), checklist: validated.data, notes: reflectionNotes(current.model, current.reflection) },
    }, expected.current, false);
    pending.current = false;
    if (!alive.current) return false;
    setSaving(false);
    if (!saved) {
      setPaused(true);
      void load(document.id, true);
      return false;
    }
    expected.current = new Date(saved.updatedAt).toISOString();
    setBase(snapshot);
    setPaused(false);
    return true;
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!ready || value === base || paused || saving || model.actions.busy) return;
    const timer = setTimeout(() => void saveRef.current(), 600);
    return () => clearTimeout(timer);
  }, [ready, value, base, paused, saving, model.actions.busy]);

  function discard() {
    if (pending.current) return;
    expected.current = new Date(document.updatedAt).toISOString();
    setBlocks(readDailyBody(original.content, original.checklist));
    setBody({ content: original.content, checklist: original.checklist });
    setReflection(original.reflection);
    setBase(originalBase);
    setPaused(false);
    model.setDirty(false);
    try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  }
  async function saveCopy() {
    if (pending.current || model.actions.busy || !model.selected) return;
    const validated = checklistSchema.safeParse(checklist);
    if (!validated.success) { model.actions.setError('Check the checklist before saving a copy.'); return; }
    const saved = await model.actions.capture(`${document.name.slice(0, 240)} (draft)`, 'note', model.selected.planning.plan, document.folderId, content, {
      ...model.actions.fields(model.selected), checklist: validated.data, notes: reflectionNotes(model, reflection),
    });
    if (saved) { discard(); model.setSelectedId(saved.id); }
  }
  useEditorSession({ save, discard });
  const editingDisabled = !ready || !!model.selected?.invalidPlanning;
  const disabled = editingDisabled || saving || model.actions.busy;
  return <section className="an-daily" aria-label="Daily note editor" onKeyDown={event => {
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
    <fieldset disabled={editingDisabled}>
      <legend className="ab-sr-only">Daily note content</legend>
      <DailyBody blocks={blocks} disabled={editingDisabled} onChange={changeBody} saveAction={dirty && !paused
        ? <button type="button" className="ab-link an-daily-save" disabled={disabled} onClick={() => void save()}>Save now</button>
        : null}/>
      <details className="an-daily-notes"><summary>Close the day</summary>
        <textarea aria-label="Daily reflection" rows={3} value={reflection} maxLength={19986} placeholder="What got done? What’s next?" onChange={event => { setReflection(event.target.value); model.setDirty(true); }}/>
      </details>
    </fieldset>
  </section>;
}
