'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { z } from 'zod';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { checklistSchema, readPlanning } from '@/lib/book';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { mergeDailyNote, sameDailyChecklist, type DailySnapshot } from './mergeDailyNote';
import { DailyBody } from './DailyBody';
import { ItemActionsButton, type DailyItemActions } from '@/components/book/ItemActionsContext';
import { readDailyBody, writeDailyBody, type DailyBlock } from './dailyBody';
import type { writeDailyDocument } from './dailyDocument';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

const snapshotSchema = z.object({
  checklist: checklistSchema, content: z.string().max(1000000),
  reflection: z.string().max(19986).default(''),
});
const draftSchema = snapshotSchema.extend({ step: z.string().max(2000), base: z.string(), expected: z.string().datetime() });
export const reflectionPrefix = 'Close the day\n';

function dailySnapshotKey({ content, checklist, reflection }: DailySnapshot) {
  return JSON.stringify({ checklist: checklist.map(({ id, text, done, dueDate }) => ({ id, text, done, dueDate })), content, reflection });
}

function savedSnapshot(document: AiruDocument): DailySnapshot | null {
  const planning = readPlanning(document.attributes);
  if (!planning) return null;
  return {
    checklist: planning.checklist,
    content: document.canonicalContent ?? document.content,
    reflection: planning.notes.find(note => note.text.startsWith(reflectionPrefix))?.text.slice(reflectionPrefix.length) ?? '',
  };
}

export function DailyNote({ model, document, heading, details, close, writingTools }: {
  model: BookWorkspaceModel; document: AiruDocument; heading: string;
  details: DailyItemActions['details']; close: () => void;
  writingTools: HTMLDivElement | null;
}) {
  const original = savedSnapshot(document) ?? {
    checklist: model.selected!.planning.checklist,
    content: document.canonicalContent ?? document.content,
    reflection: model.selected!.planning.notes.find(note => note.text.startsWith(reflectionPrefix))?.text.slice(reflectionPrefix.length) ?? '',
  };
  const originalBase = dailySnapshotKey(original);
  const [editorBlocks, loadEditor] = useState<DailyBlock[]>(() => readDailyBody(original.content, original.checklist));
  const [body, setBody] = useState({ content: original.content, checklist: original.checklist });
  const { content, checklist } = body;
  const [reflection, setReflection] = useState(original.reflection);
  const [reflectionOpen, setReflectionOpen] = useState(!!original.reflection);
  const reflectionField = useRef<HTMLTextAreaElement>(null);
  const [base, setBase] = useState(originalBase);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [compare, setCompare] = useState(false);
  const expected = useRef(new Date(document.updatedAt).toISOString());
  const pending = useRef(false);
  const alive = useRef(true);
  const key = `airunote:daily-draft:${model.orgId}:${model.userId}:${document.id}`;
  const value = dailySnapshotKey({ checklist, content, reflection });
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
        loadEditor(restored);
        setBody(draft.data.step.trim() ? writeDailyBody(restored) : { content: draft.data.content, checklist: draft.data.checklist });
        setReflection(draft.data.reflection);
        let restoredBase = draft.data.base;
        try {
          const draftBase = snapshotSchema.safeParse(JSON.parse(restoredBase));
          if (draftBase.success) restoredBase = dailySnapshotKey(draftBase.data);
        } catch { /* The draft can still be copied or reviewed. */ }
        setBase(restoredBase);
        setPaused(restoredBase !== originalBase || draft.data.expected !== expected.current);
        expected.current = draft.data.expected;
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

  const documentRevision = new Date(document.updatedAt).toISOString();
  useEffect(() => {
    if (!ready || pending.current || expected.current === documentRevision) return;
    // A render queued before our write finished must never reapply its older snapshot.
    const cached = useAirunoteStore.getState().getDocumentContentById(document.id);
    if (cached && new Date(cached.updatedAt).toISOString() !== documentRevision) return;
    if (dirty) {
      setPaused(true);
      void saveRef.current();
      return;
    }
    expected.current = documentRevision;
    if (content !== original.content || !sameDailyChecklist(checklist, original.checklist)) {
      loadEditor(readDailyBody(original.content, original.checklist));
    }
    setBody({ content: original.content, checklist: original.checklist });
    setReflection(original.reflection);
    setBase(originalBase);
  }, [ready, dirty, documentRevision, originalBase]); // eslint-disable-line react-hooks/exhaustive-deps

  function reflectionNotes(currentModel: BookWorkspaceModel, text: string) {
    const notes = currentModel.selected!.planning.notes;
    const existing = notes.find(note => note.text.startsWith(reflectionPrefix));
    const others = notes.filter(note => note.id !== existing?.id);
    return text.trim() ? [...others, { id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date().toISOString(), text: reflectionPrefix + text }] : others;
  }
  async function save(keepDraft = false): Promise<boolean> {
    if (pending.current || latest.current.model.actions.busy) return false;
    pending.current = true;
    setSaving(true);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const current = latest.current;
        const cached = useAirunoteStore.getState().getDocumentContentById(document.id) ?? document;
        const revision = new Date(cached.updatedAt).toISOString();
        const fromServer = savedSnapshot(cached);
        if (!fromServer || !current.model.selected || current.model.selected.invalidPlanning) return false;
        const draft = { checklist: current.checklist, content: current.content, reflection: current.reflection };
        let original: unknown;
        try { original = JSON.parse(current.base); } catch { /* An outdated draft is still recoverable. */ }
        const parsedBase = snapshotSchema.safeParse(original);
        const changed = revision !== expected.current;
        const merged = changed && !keepDraft ? parsedBase.success && mergeDailyNote(parsedBase.data, fromServer, draft) : draft;
        if (!merged) {
          current.model.actions.setError(null);
          setConflict(true);
          setPaused(true);
          return false;
        }
        const validated = snapshotSchema.safeParse(merged);
        if (!validated.success) {
          current.model.actions.setError('This draft exceeds the note or checklist size limit.');
          setPaused(true);
          return false;
        }
        const snapshot = dailySnapshotKey(validated.data);
        if (!changed && snapshot === current.base) {
          setBody({ checklist: validated.data.checklist, content: validated.data.content });
          setReflection(validated.data.reflection);
          setPaused(false);
          setConflict(false);
          return true;
        }

        const storedPlanning = readPlanning(cached.attributes);
        const item = storedPlanning ? { ...current.model.selected, planning: storedPlanning } : current.model.selected;
        const saved = await current.model.actions.update(item, {
          content: validated.data.content,
          planning: { ...current.model.actions.fields(item), checklist: validated.data.checklist, notes: reflectionNotes({ ...current.model, selected: item }, validated.data.reflection) },
        }, revision, false);
        if (!alive.current) return false;
        if (saved) {
          expected.current = new Date(saved.updatedAt).toISOString();
          const latestDraft = { checklist: latest.current.checklist, content: latest.current.content, reflection: latest.current.reflection };
          // Schema normalization may reorder checklist fields without changing the writing surface.
          const sentDraft = draft.content === validated.data.content
            && draft.reflection === validated.data.reflection && sameDailyChecklist(draft.checklist, validated.data.checklist);
          const next = sentDraft ? latestDraft : mergeDailyNote(draft, validated.data, latestDraft);
          if (next) {
            if (next.content !== latestDraft.content || !sameDailyChecklist(next.checklist, latestDraft.checklist)) {
              loadEditor(readDailyBody(next.content, next.checklist));
              setBody({ content: next.content, checklist: next.checklist });
            }
            if (next.reflection !== latestDraft.reflection) setReflection(next.reflection);
          }
          setBase(snapshot);
          if (!next) {
            setConflict(true);
            setPaused(true);
            return false;
          }
          setPaused(false);
          setConflict(false);
          setCompare(false);
          return true;
        }
        await load(document.id, true);
        if (!alive.current) return false;
        const fresh = useAirunoteStore.getState().getDocumentContentById(document.id);
        if (!fresh || new Date(fresh.updatedAt).toISOString() === revision) break;
        // An explicit choice applies to the reviewed revision only.
        keepDraft = false;
      }
      setPaused(true);
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setSaving(false);
    }
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
    loadEditor(readDailyBody(original.content, original.checklist));
    setBody({ content: original.content, checklist: original.checklist });
    setReflection(original.reflection);
    setBase(originalBase);
    setPaused(false);
    setConflict(false);
    setCompare(false);
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
  useEditorSession({ save: () => save(), discard });
  const editingDisabled = !ready || !!model.selected?.invalidPlanning;
  const disabled = editingDisabled || saving || model.actions.busy;
  function openReflection() {
    flushSync(() => setReflectionOpen(true));
    reflectionField.current?.focus();
  }
  return <section className="an-daily" aria-label="Daily note editor" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); void save(); }
  }}>
    <header className="an-daily-heading">
      <h1>{heading}</h1>
      {model.selected && <ItemActionsButton item={model.selected} disabled={editingDisabled} daily={{
        details, close, openReflection, hasReflection: reflectionOpen || !!reflection,
        save: dirty && !paused && !disabled ? () => { void save(); } : undefined,
      }}/>}
      <div className="an-daily-status">
        {checklist.length > 0 && <span>{checklist.filter(item => item.done).length}/{checklist.length} done</span>}
        <small role="status">{saving ? 'Saving…' : paused ? 'Draft kept on this device' : dirty ? 'Unsaved changes' : 'Saved'}</small>
      </div>
    </header>
    {paused && <div className="an-draft-recovery" role="alert">
      {conflict ? <>
        <p>The saved note and your draft changed in the same place. Your draft is still in the editor.</p>
        <button disabled={disabled} onClick={() => setCompare(value => !value)} aria-expanded={compare}>{compare ? 'Hide saved note' : 'Review saved note'}</button>
        {compare && <div className="an-daily-compare"><strong>Saved version</strong>
          <pre>{original.content.replace(/^\[\/\/\]: # \(airunote-daily[^\n]*\)\n?/gm, '').replace(/!\[([^\]]*)\]\(<data:image[^>]*>\)/g, '[$1]')}</pre>
          <button disabled={disabled} onClick={() => void save(true)}>Replace saved note with draft</button>
        </div>}
      </> : <><p>Your changes are still here. Retry to save or bring in any new changes.</p>
        <button disabled={disabled} onClick={() => void save()}>Retry save</button></>}
      <button disabled={disabled} onClick={() => void saveCopy()}>Save a copy</button>
      <button disabled={disabled} onClick={discard}>Use saved version</button>
    </div>}
    <fieldset disabled={editingDisabled}>
      <legend className="ab-sr-only">Daily note content</legend>
      <DailyBody blocks={editorBlocks} disabled={editingDisabled} onChange={(next: ReturnType<typeof writeDailyDocument>) => setBody(next)} writingTools={writingTools}>
        {(reflectionOpen || !!reflection) && <label className="an-daily-notes">
          <span>Daily reflection</span>
          <textarea ref={reflectionField} rows={3} value={reflection} maxLength={19986} placeholder="What got done? What’s next?" onChange={event => { setReflection(event.target.value); model.setDirty(true); }}/>
        </label>}
      </DailyBody>
    </fieldset>
  </section>;
}
