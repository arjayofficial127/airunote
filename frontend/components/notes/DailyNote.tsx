'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { checklistSchema, readPlanning } from '@/lib/book';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { mergeDailyNote, sameDailyChecklist, type DailySnapshot } from './mergeDailyNote';
import { dailyDraftStorage, dailySnapshotKey, dailySnapshotSchema as snapshotSchema } from './dailyDraft';
import { DailyBody } from './DailyBody';
import { ItemActionsButton, type DailyItemActions } from '@/components/book/ItemActionsContext';
import { readDailyBody, writeDailyBody, type DailyBlock } from './dailyBody';
import type { writeDailyDocument } from './dailyDocument';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

export const reflectionPrefix = 'Close the day\n';

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
  const [onDevice, setOnDevice] = useState(false);
  const expected = useRef(new Date(document.updatedAt).toISOString());
  const pending = useRef(false);
  const alive = useRef(true);
  const key = `airunote:daily-draft:${model.orgId}:${model.userId}:${document.id}`;
  const [draftStorage] = useState(() => dailyDraftStorage(key));
  const value = dailySnapshotKey({ checklist, content, reflection });
  const dirty = value !== base;
  const latest = useRef({ model, checklist, content, reflection, base });
  latest.current = { model, checklist, content, reflection, base };
  const { setDirty } = model;
  const { load } = useBookContent();

  useEffect(() => {
    alive.current = true;
    try {
      const checkpoint = draftStorage.restore();
      if (checkpoint) {
        const { draft, reopened } = checkpoint;
        const restored = readDailyBody(draft.content, draft.checklist);
        if (draft.step.trim()) {
          const id = crypto.randomUUID();
          restored.push(draft.checklist.length < 200
            ? { kind: 'task', key: id, task: { id, text: draft.step.trim(), done: false } }
            : { kind: 'text', key: id, text: draft.step });
        }
        const body = draft.step.trim() ? writeDailyBody(restored) : { content: draft.content, checklist: draft.checklist };
        if (dailySnapshotKey({ ...body, reflection: draft.reflection }) === originalBase) draftStorage.clear();
        else {
          loadEditor(restored);
          setBody(body);
          setReflection(draft.reflection);
          setBase(draft.base);
          setPaused(reopened || draft.base !== originalBase || draft.expected !== expected.current);
          expected.current = draft.expected;
        }
      }
    } catch { /* In-memory drafts and close guards remain available. */ }
    setReady(true);
    return () => { alive.current = false; };
    // The editor is keyed by note ID. Revisions must not reinitialize a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const checkpoint = useCallback((draft: DailySnapshot, savedBase: string) => {
    if (dailySnapshotKey(draft) !== savedBase || pending.current) {
      setOnDevice(draftStorage.write({ ...draft, base: savedBase, expected: expected.current, step: '' }));
    } else draftStorage.clear();
  }, [draftStorage]);
  useEffect(() => {
    if (!ready) return;
    setDirty(dirty || saving);
    checkpoint({ checklist, content, reflection }, base);
  }, [ready, dirty, saving, checklist, content, reflection, base, setDirty, checkpoint]);

  function changeDraft(change: Partial<DailySnapshot>) {
    const next = { ...latest.current, ...change };
    latest.current = next;
    checkpoint({ checklist: next.checklist, content: next.content, reflection: next.reflection }, next.base);
    if (change.reflection !== undefined) setReflection(next.reflection);
    else setBody({ content: next.content, checklist: next.checklist });
  }

  const documentRevision = new Date(document.updatedAt).toISOString();
  useEffect(() => {
    if (!ready || pending.current || expected.current === documentRevision) return;
    // A render queued before our write finished must never reapply its older snapshot.
    const cached = useAirunoteStore.getState().getDocumentContentById(document.id);
    if (cached && new Date(cached.updatedAt).toISOString() !== documentRevision) return;
    if (dirty) {
      if (paused) return;
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
  }, [ready, dirty, paused, documentRevision, originalBase]); // eslint-disable-line react-hooks/exhaustive-deps

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
    draftStorage.clear();
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
        <small role="status">{saving ? 'Saving…' : paused && onDevice ? 'Draft kept on this device' : dirty ? 'Unsaved changes' : 'Saved'}</small>
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
      </> : <><p>{onDevice ? 'Your edits are on this device. Retry to save them to Airunote.' : 'Your edits are in this editor. Keep it open and retry to save them.'}</p>
        <button disabled={disabled} onClick={() => void save()}>Retry save</button></>}
      <button disabled={disabled} onClick={() => void saveCopy()}>Save a copy</button>
      <button disabled={disabled} onClick={discard}>Use saved version</button>
    </div>}
    <fieldset disabled={editingDisabled}>
      <legend className="ab-sr-only">Daily note content</legend>
      <DailyBody blocks={editorBlocks} disabled={editingDisabled} onChange={(next: ReturnType<typeof writeDailyDocument>) => changeDraft(next)} writingTools={writingTools}>
        {(reflectionOpen || !!reflection) && <label className="an-daily-notes">
          <span>Daily reflection</span>
          <textarea ref={reflectionField} rows={3} value={reflection} maxLength={19986} placeholder="What got done? What’s next?" onChange={event => changeDraft({ reflection: event.target.value })}/>
        </label>}
      </DailyBody>
    </fieldset>
  </section>;
}
