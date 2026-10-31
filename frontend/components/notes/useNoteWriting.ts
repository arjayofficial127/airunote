'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
const draftSchema = z.object({ content: z.string(), base: z.string(), expected: z.string() });
export function useNoteWriting(model: BookWorkspaceModel, document: AiruDocument) {
  const { load } = useBookContent();
  const original = document.canonicalContent ?? document.content;
  const [content, setContent] = useState(original); const [base, setBase] = useState(original);
  const [ready, setReady] = useState(false); const [paused, setPaused] = useState(false); const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState<string | null>(null); const [editing, setEditing] = useState(false);
  const expected = useRef(new Date(document.updatedAt).toISOString()); const pending = useRef(false); const alive = useRef(true);
  const latest = useRef({ model, content, base, document }); latest.current = { model, content, base, document };
  const key = `airunote:note-draft:${model.orgId}:${model.userId}:${document.id}`;
  const dirty = content !== base;
  const { setDirty } = model;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    try {
      const parsed = draftSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? 'null'));
      if (parsed.success && parsed.data.content !== original) {
        setContent(parsed.data.content); setEditing(true);
        if (parsed.data.base !== original) { setBase(parsed.data.base); expected.current = parsed.data.expected; setPaused(true); }
      }
    } catch { /* Keep the live editor usable without storage. */ }
    setReady(true);
    // This component is keyed by document ID; remote revisions must not reinitialize a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    setDirty(dirty || saving);
    try { if (dirty) sessionStorage.setItem(key, JSON.stringify({ content, base, expected: expected.current })); else sessionStorage.removeItem(key); } catch { /* Navigation guards still protect this live draft. */ }
  }, [ready, dirty, saving, content, base, key, setDirty]);
  useEffect(() => {
    if (!ready || dirty || pending.current) return;
    if (expected.current !== new Date(document.updatedAt).toISOString()) {
      expected.current = new Date(document.updatedAt).toISOString(); setContent(original); setBase(original); setUndo(null);
    }
  }, [document.updatedAt, original, ready, dirty]);
  async function save() {
    const value = latest.current;
    if (pending.current || value.model.actions.busy || value.content === value.base || !value.model.selected || value.model.selected.invalidPlanning) return;
    pending.current = true; setSaving(true);
    const saved = await value.model.actions.update(value.model.selected, { content: value.content, ...(document.type === 'RTF' ? { contentType: 'RTF' as const } : {}) }, expected.current);
    pending.current = false;
    if (!alive.current) return;
    setSaving(false);
    if (!saved) { setPaused(true); void load(document.id, true); return; }
    expected.current = new Date(saved.updatedAt).toISOString(); setBase(value.content); setUndo(value.base); setPaused(false);
    value.model.setDirty(latest.current.content !== value.content);
  }
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    if (!ready || !dirty || paused || saving || model.actions.busy) return;
    const timer = setTimeout(() => void saveRef.current(), 900); return () => clearTimeout(timer);
  }, [ready, dirty, content, paused, saving, model.actions.busy]);
  function change(value: string) { setContent(value); model.setDirty(value !== base || pending.current); }
  function discard() {
    if (pending.current) return;
    expected.current = new Date(document.updatedAt).toISOString(); setBase(original); setContent(original); setPaused(false); setUndo(null); model.setDirty(false);
  }
  async function saveCopy() {
    if (pending.current || model.actions.busy) return;
    const saved = await model.actions.capture(`${document.name.slice(0, 240)} (draft)`, model.selected?.planning.kind ?? 'note', undefined, document.folderId, content);
    if (saved) { discard(); model.setSelectedId(saved.id); }
  }
  return { content, change, ready, dirty, paused, saving, editing, setEditing, undo: undo !== null ? () => { change(undo); setUndo(null); } : null, save, discard, saveCopy };
}
