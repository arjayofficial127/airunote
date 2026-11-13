'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { readPlanning, record } from '@/lib/book';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { sameDailyChecklist, type DailySnapshot } from './mergeDailyNote';
import { dailyDraftStorage, dailySnapshotKey, dailySnapshotSchema as snapshotSchema } from './dailyDraft';
import { reflectionPrefix, savedSnapshot } from './dailySnapshot';
import { DailyMergeView } from './DailyMergeView';
import { DailyBody } from './DailyBody';
import { ItemActionsButton, type DailyItemActions } from '@/components/book/ItemActionsContext';
import { readDailyBody, writeDailyBody, type DailyBlock } from './dailyBody';
import type { writeDailyDocument } from './dailyDocument';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

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
  const [review, setReview] = useState(false);
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
        const { draft } = checkpoint;
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
    if (dirty) return;
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
  function showSnapshot(snapshot: DailySnapshot, revision: string) {
    const savedBase = dailySnapshotKey(snapshot);
    expected.current = revision;
    latest.current = { ...latest.current, ...snapshot, base: savedBase };
    loadEditor(readDailyBody(snapshot.content, snapshot.checklist));
    setBody({ content: snapshot.content, checklist: snapshot.checklist });
    setReflection(snapshot.reflection);
    setBase(savedBase);
    setPaused(false);
    model.setDirty(false);
    draftStorage.clear();
  }

  async function save(): Promise<boolean> {
    if (pending.current || latest.current.model.actions.busy) return false;
    if (!navigator.onLine) { setPaused(true); return false; }
    pending.current = true;
    setSaving(true);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const current = latest.current;
        const cached = useAirunoteStore.getState().getDocumentContentById(document.id) ?? document;
        const revision = new Date(cached.updatedAt).toISOString();
        const fromServer = savedSnapshot(cached);
        if (!fromServer || !current.model.selected || current.model.selected.invalidPlanning) return false;
        const draft = snapshotSchema.safeParse({ checklist: current.checklist, content: current.content, reflection: current.reflection });
        if (!draft.success) {
          current.model.actions.setError('This draft exceeds the note or checklist size limit.');
          setPaused(true);
          return false;
        }
        const snapshot = dailySnapshotKey(draft.data);
        const currentKey = () => dailySnapshotKey(latest.current);
        if (snapshot === dailySnapshotKey(fromServer)) {
          if (snapshot !== current.base) showSnapshot(fromServer, revision);
          return true;
        }
        if (revision !== expected.current) {
          const copy = await current.model.actions.saveDailyConflict(document.id, expected.current, draft.data);
          if (!alive.current) return false;
          if (!copy) { setPaused(true); return false; }
          if (currentKey() === snapshot) {
            showSnapshot(fromServer, revision);
            return true;
          }
          // The copy only acknowledges the snapshot it received.
          setPaused(false);
          return false;
        }

        const storedPlanning = readPlanning(cached.attributes);
        const item = storedPlanning ? { ...current.model.selected, planning: storedPlanning } : current.model.selected;
        const saved = await current.model.actions.update(item, {
          content: draft.data.content,
          planning: { ...current.model.actions.fields(item), checklist: draft.data.checklist, notes: reflectionNotes({ ...current.model, selected: item }, draft.data.reflection) },
        }, revision, false);
        if (!alive.current) return false;
        if (saved) {
          expected.current = new Date(saved.updatedAt).toISOString();
          latest.current = { ...latest.current, base: snapshot };
          setBase(snapshot);
          setPaused(false);
          if (currentKey() !== snapshot) checkpoint(latest.current, snapshot);
          return true;
        }
        await load(document.id, true);
        if (!alive.current) return false;
        const fresh = useAirunoteStore.getState().getDocumentContentById(document.id);
        if (!fresh || new Date(fresh.updatedAt).toISOString() === revision) break;
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
    if (!ready || value === base || paused || saving || model.actions.busy || review) return;
    const timer = setTimeout(() => void saveRef.current(), 600);
    return () => clearTimeout(timer);
  }, [ready, value, base, paused, saving, model.actions.busy, review]);

  useEffect(() => {
    if (!ready) return;
    function reconnect() {
      if (!navigator.onLine || pending.current || latest.current.model.actions.busy || review) return;
      if (dailySnapshotKey(latest.current) !== latest.current.base) void saveRef.current();
      else void load(document.id, true);
    }
    function visible() { if (window.document.visibilityState === 'visible') reconnect(); }
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
    window.document.addEventListener('visibilitychange', visible);
    const retry = dirty && paused ? window.setInterval(reconnect, 20_000) : undefined;
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', reconnect);
      window.document.removeEventListener('visibilitychange', visible);
      window.clearInterval(retry);
    };
  }, [ready, dirty, paused, review, load, document.id]);

  function discard() {
    if (!pending.current) showSnapshot(original, documentRevision);
  }
  const copies = model.items.filter(item => record(item.attributes.airunoteDailyConflict).originalId === document.id);
  const unresolved = copies.filter(item => !record(item.attributes.airunoteDailyConflict).mergedAt).length;
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
    {paused && <div className="an-draft-recovery" role="status">
      <p>{onDevice ? 'Your draft is saved on this device. Airunote will try again when it can connect.' : 'Your edits are in this editor. Keep it open and retry to save them.'}</p>
      <button disabled={disabled} onClick={() => void save()}>Retry save</button>
    </div>}
    {copies.length > 0 && <div className="an-draft-recovery">
      <p>{unresolved ? `${unresolved} draft ${unresolved === 1 ? 'copy needs' : 'copies need'} review.` : 'Merged copies are available to archive or move to Trash.'}</p>
      <button disabled={disabled || dirty} onClick={() => setReview(true)}>Review versions</button>
    </div>}
    {review && <DailyMergeView model={model} originalId={document.id} heading={heading} copies={copies}
      onClose={() => setReview(false)} onMerged={showSnapshot}/>}
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
