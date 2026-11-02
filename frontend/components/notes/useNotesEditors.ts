'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { CalendarPlan } from '@/lib/book';
import type { BookItem } from '@/components/book/domain';
import type { BookEditorSelection, BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { EditorControls, EditorSession } from '@/components/book/EditorSession';
import { editorPreferences, focusEditor, initialEditorTabs, openEditor, reconcileEditors, removeEditor, saveEditor, toggleEditor, type EditorTab, type EditorLayout } from './editorTabs';

const resolve = <T,>(value: SetStateAction<T>, previous: T): T => typeof value === 'function' ? (value as (previous: T) => T)(previous) : value;
export function useNotesEditors(rootFolderId: string) {
  const [state, setState] = useState(initialEditorTabs);
  const latest = useRef(state); latest.current = state;
  const controls = useRef(new Map<string, EditorControls>());
  const bindings = useRef(new Map<string, ReturnType<typeof makeBindings>>());
  const [closing, setClosing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const active = state.tabs.find(tab => tab.key === state.active);
  useEffect(() => {
    const keys = new Set(state.tabs.map(tab => tab.key));
    for (const key of bindings.current.keys()) if (!keys.has(key)) bindings.current.delete(key);
    for (const key of controls.current.keys()) if (!keys.has(key)) controls.current.delete(key);
  }, [state.tabs]);
  const reconcile = useCallback((items: BookItem[]) => {
    const available = new Set(items.map(item => item.id));
    setState(previous => reconcileEditors(previous, available));
  }, []);
  const remove = useCallback((key: string) => { setState(previous => removeEditor(previous, key)); setClosing(null); }, []);
  const focus = useCallback((key: string) => setState(previous => focusEditor(previous, key)), []);
  function makeBindings(key: string) {
    const update = (change: (tab: EditorTab) => EditorTab) => setState(previous => {
      const tab = previous.tabs.find(value => value.key === key); if (!tab) return previous;
      const next = change(tab); return next === tab ? previous : { ...previous, tabs: previous.tabs.map(value => value.key === key ? next : value) };
    });
    const setDirty: Dispatch<SetStateAction<boolean>> = value => update(tab => { const dirty = resolve(value, tab.dirty); return dirty === tab.dirty ? tab : { ...tab, dirty }; });
    const setDraftPreview: BookWorkspaceModel['setDraftPreview'] = value => update(tab => {
      const preview = resolve(value, { name: tab.name, folderId: tab.folderId });
      return !preview || (preview.name === tab.name && preview.folderId === tab.folderId) ? tab : { ...tab, ...preview };
    });
    const saved = (id: string) => setState(previous => saveEditor(previous, key, id));
    const session: EditorSession = { saved, discarded: () => remove(key), register: value => {
      controls.current.set(key, value);
      return () => { if (controls.current.get(key) === value) controls.current.delete(key); };
    } };
    const setSelectedId: BookWorkspaceModel['setSelectedId'] = value => {
      const id = resolve(value, latest.current.tabs.find(tab => tab.key === key)?.noteId ?? null);
      if (id) saved(id); else remove(key);
    };
    const setCreating: BookWorkspaceModel['setCreating'] = () => { /* Save/discard is atomic through the editor session. */ };
    return { setDirty, setDraftPreview, setSelectedId, setCreating, session };
  }
  function forTab(key: string) {
    let value = bindings.current.get(key);
    if (!value) { value = makeBindings(key); bindings.current.set(key, value); }
    return value;
  }
  function open(item: Pick<BookItem, 'id' | 'folderId' | 'name'>) {
    setState(previous => openEditor(previous, { key: `note:${item.id}`, noteId: item.id, folderId: item.folderId, name: item.name, plan: { kind: 'unplanned' }, dirty: false }));
  }
  function add(plan: CalendarPlan = { kind: 'unplanned' }, folderId = rootFolderId) {
    setState(previous => openEditor(previous, { key: crypto.randomUUID(), noteId: null, folderId, name: '', plan, dirty: false }));
  }
  const selection: BookEditorSelection = {
    selectedId: active?.noteId ?? null, creating: !!active && !active.noteId,
    captureFolderId: active?.folderId ?? rootFolderId, capturePlan: active?.plan ?? { kind: 'unplanned' },
    draftPreview: active && !active.noteId ? { name: active.name, folderId: active.folderId } : null,
    dirty: state.tabs.some(tab => tab.dirty),
    setDirty: forTab(active?.key ?? '').setDirty, setCreating: forTab(active?.key ?? '').setCreating,
    setDraftPreview: forTab(active?.key ?? '').setDraftPreview,
    setSelectedId: value => {
      const id = resolve(value, active?.noteId ?? null);
      if (!id) { if (active) remove(active.key); }
      else if (active) forTab(active.key).setSelectedId(id);
      else open({ id, folderId: rootFolderId, name: '' });
    },
  };
  function requestClose(key: string) {
    if (saving) return;
    if (latest.current.tabs.find(tab => tab.key === key)?.dirty) { focus(key); setClosing(key); }
    else remove(key);
  }
  async function confirmClose(save: boolean) {
    if (!closing || saving) return;
    const editor = controls.current.get(closing);
    if (!editor) return;
    if (!save) { editor.discard(); remove(closing); return; }
    setSaving(true);
    try { if (await editor.save()) remove(closing); } finally { setSaving(false); }
  }
  function modelFor(tab: EditorTab, model: BookWorkspaceModel): BookWorkspaceModel {
    return { ...model, ...forTab(tab.key), selected: model.items.find(item => item.id === tab.noteId) ?? null,
      creating: !tab.noteId, dirty: tab.dirty, captureFolderId: tab.folderId, capturePlan: tab.plan,
      draftPreview: tab.noteId ? null : { name: tab.name, folderId: tab.folderId } };
  }
  function restore(saved: ReturnType<typeof editorPreferences>, items: BookItem[]) {
    let restored = initialEditorTabs();
    for (const id of saved.noteIds) { const item = items.find(item => item.id === id); if (item) restored = openEditor(restored, { key: `note:${id}`, noteId: id, folderId: item.folderId, name: item.name, plan: { kind: 'unplanned' }, dirty: false }); }
    const visible = saved.visible.map(id => `note:${id}`).filter(key => restored.tabs.some(tab => tab.key === key));
    restored = { ...restored, layout: saved.layout, visible: visible.length ? visible : restored.visible };
    setState(focusEditor(restored, `note:${saved.active}`));
  }
  return { state, selection, open, add, focus, remove, requestClose, closing, saving, confirmClose, cancelClose: () => setClosing(null),
    forTab, modelFor, restore, reconcile, preferences: editorPreferences(state),
    layout: (layout: EditorLayout) => setState(previous => ({ ...previous, layout })),
    toggle: (key: string) => setState(previous => toggleEditor(previous, key)) };
}
