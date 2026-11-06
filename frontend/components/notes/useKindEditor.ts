'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useEditorSession } from '@/components/book/EditorSession';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { defaultPlanning, editablePlanning, defaultKindFields, editableKindDetails, kindFieldsSchema, kindPlanning, kindValidation, planningFieldsSchema, readKindDetails, readPlanning, type PlanningFields, type KindFields, type CalendarPlan } from '@/lib/book';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { AiruDocument } from '@/components/airunote/types';

export type KindEditorState = { name: string; content: string; folderId: string; planning: PlanningFields; kindFields: KindFields | null; step: string; eventEnd: string | null };
// Drafts may contain unfinished dates, URLs, empty rows and measures. Strict validation runs before every save.
const loosePlan = z.custom<CalendarPlan>(value => {
  if (!value || typeof value !== 'object' || !('kind' in value)) return false;
  const v = value as Record<string, unknown>;
  return v.kind === 'unplanned' || v.kind === 'day' && typeof v.date === 'string' && (v.time === null || typeof v.time === 'string') && (v.duration === null || typeof v.duration === 'number') || v.kind === 'week' && typeof v.start === 'string' || v.kind === 'month' && typeof v.month === 'string' || v.kind === 'year' && typeof v.year === 'number' || v.kind === 'sprint' && typeof v.sprintId === 'string';
});
const looseFields = planningFieldsSchema.extend({ plan: loosePlan, source: z.string().nullable(), checklist: planningFieldsSchema.shape.checklist.element.extend({ text: z.string().max(2000) }).array().max(200) });
const looseKind = kindFieldsSchema.extend({ meetingUrl: z.string().max(2000).nullable(), goal: kindFieldsSchema.shape.goal.unwrap().extend({ measure: z.string().max(120), target: z.number().finite().min(0).max(1e15) }).nullable() });
const draftSchema = z.object({ state: z.object({ name: z.string().max(255), content: z.string().max(1000000), folderId: z.string().uuid(), planning: looseFields, kindFields: looseKind.nullable(), step: z.string().max(2000), eventEnd: z.string().nullable().default(null) }), base: z.string(), expected: z.string() });
const serialized = (state: KindEditorState) => JSON.stringify({ ...state, step: '' });

export function useKindEditor(model: BookWorkspaceModel, document: AiruDocument | null, editorKey: string, capabilities: boolean) {
  const details = readKindDetails(document?.attributes);
  const original: KindEditorState = { name: document?.name ?? '', content: document?.canonicalContent ?? document?.content ?? '', folderId: document?.folderId ?? model.captureFolderId,
    planning: model.selected ? model.actions.fields(model.selected) : { ...editablePlanning(defaultPlanning('note', model.captureFolderId !== model.rootFolderId)), plan: model.capturePlan },
    kindFields: details ? editableKindDetails(details) : document ? null : defaultKindFields(), step: '', eventEnd: null };
  const originalValue = serialized(original);
  const [state, setState] = useState(original), [base, setBase] = useState(originalValue);
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false), [paused, setPaused] = useState(false);
  const expected = useRef(document ? new Date(document.updatedAt).toISOString() : '');
  const pending = useRef(false), alive = useRef(true);
  const key = `airunote:kind-draft:${model.orgId}:${model.userId}:${document?.id ?? editorKey}`;
  const value = serialized(state), dirty = value !== base || !!state.step.trim();
  const latest = useRef({ state, model, document, base, dirty }); latest.current = { state, model, document, base, dirty };
  const { load } = useBookContent(); const { setDirty, setDraftPreview } = model;
  const readOnly = !!model.selected?.invalidPlanning || details === null;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    try {
      const draft = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null'));
      if (draft.success) {
        setState(draft.data.state); setBase(draft.data.base); expected.current = draft.data.expected;
        setPaused(!!document && draft.data.base !== originalValue);
      } else if (document) {
        const old = z.object({ content: z.string(), base: z.string(), expected: z.string() }).safeParse(JSON.parse(sessionStorage.getItem(`airunote:note-draft:${model.orgId}:${model.userId}:${document.id}`) ?? 'null'));
        if (old.success && old.data.content !== original.content) {
          setState({ ...original, content: old.data.content }); setBase(serialized({ ...original, content: old.data.base })); expected.current = old.data.expected; setPaused(old.data.base !== original.content);
        }
      }
    } catch { /* Mounted drafts and close guards still work when storage is unavailable. */ }
    setReady(true);
    // A newly created tab keeps its canvas when it receives its saved ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    setDirty(dirty || saving);
    try { if (dirty) sessionStorage.setItem(key, JSON.stringify({ state, base, expected: expected.current })); else sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  }, [key, ready, dirty, saving, state, base, setDirty]);
  useEffect(() => { if (!document) setDraftPreview({ name: state.name, folderId: state.folderId }); }, [document, state.name, state.folderId, setDraftPreview]);
  useEffect(() => {
    if (!document || !ready || pending.current || expected.current === new Date(document.updatedAt).toISOString()) return;
    if (dirty) { setPaused(true); return; }
    expected.current = new Date(document.updatedAt).toISOString(); setState(original); setBase(originalValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.updatedAt, originalValue, ready, dirty]);
  function apply(change: (previous: KindEditorState) => KindEditorState) {
    const next = change(latest.current.state);
    // Update the live draft synchronously: a response can arrive before React commits a keystroke.
    latest.current = { ...latest.current, state: next, dirty: true };
    setState(next); model.setDirty(true);
  }
  function change(patch: Partial<KindEditorState>) { apply(previous => ({ ...previous, ...patch })); }
  function planning(patch: Partial<PlanningFields> | ((previous: PlanningFields) => Partial<PlanningFields>)) { apply(previous => ({ ...previous, planning: { ...previous.planning, ...(typeof patch === 'function' ? patch(previous.planning) : patch) } })); }
  function kind(patch: Partial<KindFields> | ((previous: KindFields) => Partial<KindFields>)) { apply(previous => { const fields = previous.kindFields ?? defaultKindFields(); return { ...previous, kindFields: { ...fields, ...(typeof patch === 'function' ? patch(fields) : patch) } }; }); }
  function addStep() {
    apply(previous => !previous.step.trim() || previous.planning.checklist.length >= 200 ? previous : { ...previous, step: '', planning: { ...previous.planning, checklist: [...previous.planning.checklist, { id: crypto.randomUUID(), text: previous.step.trim(), done: false }] } });
  }
  async function save(): Promise<boolean> {
    const current = latest.current;
    if (!ready || readOnly || pending.current || current.model.actions.busy) return false;
    if (!current.dirty && current.document) return true;
    const snapshot = { ...current.state, name: current.state.name.trim(), step: '', eventEnd: null, planning: { ...current.state.planning, checklist: current.state.step.trim() ? [...current.state.planning.checklist, { id: crypto.randomUUID(), text: current.state.step.trim(), done: false }] : current.state.planning.checklist } };
    if (!snapshot.name) { current.model.actions.setError('Enter a title before saving.'); return false; }
    const fields = planningFieldsSchema.safeParse(snapshot.planning), kindFields = snapshot.kindFields === null ? null : kindFieldsSchema.safeParse(snapshot.kindFields);
    if (!fields.success || kindFields && !kindFields.success) { current.model.actions.setError(!fields.success ? fields.error.issues[0]?.message ?? 'Check the item details.' : 'Check the success measure, target and meeting link.'); return false; }
    const specific = kindFields?.success ? kindFields.data : null;
    const issue = specific && kindValidation(fields.data, specific);
    if (issue) { current.model.actions.setError(issue); return false; }
    snapshot.planning = specific ? kindPlanning(fields.data, specific) : fields.data;
    pending.current = true; setSaving(true);
    const saved = current.document && current.model.selected ? await current.model.actions.update(current.model.selected, { name: snapshot.name, content: snapshot.content, folderId: snapshot.folderId, planning: snapshot.planning, ...(current.document.type === 'RTF' ? { contentType: 'RTF' as const } : {}), ...(specific && capabilities ? { kindFields: specific } : {}) }, expected.current, false)
      : await current.model.actions.capture(snapshot.name, snapshot.planning.kind, snapshot.planning.plan, snapshot.folderId, snapshot.content, snapshot.planning, specific && capabilities ? specific : undefined);
    pending.current = false;
    if (!alive.current) return false;
    setSaving(false);
    if (!saved) { setPaused(true); if (document) void load(document.id, true); return false; }
    expected.current = new Date(saved.updatedAt).toISOString();
    const savedState = { ...snapshot, planning: editablePlanning(readPlanning(saved.attributes)!), kindFields: readKindDetails(saved.attributes) ? editableKindDetails(readKindDetails(saved.attributes)!) : snapshot.kindFields };
    const recent = latest.current.state;
    const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
    const next = { ...recent, name: recent.name === current.state.name ? saved.name : recent.name, content: recent.content === current.state.content ? saved.canonicalContent ?? saved.content : recent.content,
      folderId: recent.folderId === current.state.folderId ? saved.folderId : recent.folderId,
      planning: same(recent.planning, current.state.planning) ? savedState.planning : recent.planning,
      kindFields: same(recent.kindFields, current.state.kindFields) ? savedState.kindFields : recent.kindFields,
      step: recent.step === current.state.step ? '' : recent.step, eventEnd: recent.eventEnd === current.state.eventEnd ? null : recent.eventEnd };
    const stillDirty = serialized(next) !== serialized(savedState) || !!next.step.trim();
    latest.current = { ...latest.current, state: next, base: serialized(savedState), dirty: stillDirty };
    setState(next); setBase(serialized(savedState)); setPaused(false); current.model.setDirty(stillDirty);
    try { sessionStorage.removeItem(key); if (current.document) sessionStorage.removeItem(`airunote:note-draft:${model.orgId}:${model.userId}:${current.document.id}`); } catch { /* Saved content is authoritative. */ }
    if (!current.document) { if (session) session.saved(saved.id); else { model.setSelectedId(saved.id); model.setCreating(false); } }
    return !stillDirty;
  }
  function discard() {
    if (pending.current) return;
    setState(original); setBase(originalValue); expected.current = document ? new Date(document.updatedAt).toISOString() : ''; setPaused(false); model.setDirty(false);
    try { sessionStorage.removeItem(key); if (document) sessionStorage.removeItem(`airunote:note-draft:${model.orgId}:${model.userId}:${document.id}`); } catch { /* Storage is optional. */ }
    if (!document) session?.discarded();
  }
  async function saveCopy() {
    if (pending.current || model.actions.busy) return;
    const current = latest.current.state;
    const fields = planningFieldsSchema.safeParse({ ...current.planning, checklist: current.step.trim() ? [...current.planning.checklist, { id: crypto.randomUUID(), text: current.step.trim(), done: false }] : current.planning.checklist }), specific = current.kindFields ? kindFieldsSchema.safeParse(current.kindFields) : null;
    if (!fields.success || specific && !specific.success) { model.actions.setError('Complete the pending details before saving a copy.'); return; }
    const saved = await model.actions.capture(`${current.name.slice(0, 240) || 'Untitled'} (draft)`, fields.data.kind, fields.data.plan, current.folderId, current.content, fields.data, specific?.success && capabilities ? specific.data : undefined);
    if (saved) { discard(); model.setSelectedId(saved.id); }
  }
  const session = useEditorSession({ save, discard });
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    if (!document || !ready || !dirty || state.step.trim() || paused || saving || model.actions.busy || readOnly) return;
    const timer = setTimeout(() => void saveRef.current(), 900); return () => clearTimeout(timer);
  }, [document, ready, dirty, value, state.step, paused, saving, model.actions.busy, readOnly]);
  return { state, change, planning, kind, addStep, ready, dirty, saving, paused, save, saveCopy, discard, readOnly, expected, details, live: latest };
}
export type KindEditorModel = ReturnType<typeof useKindEditor>;
