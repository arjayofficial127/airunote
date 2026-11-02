import { z } from 'zod';
import type { CalendarPlan } from '@/lib/book';

export type EditorTab = {
  key: string; noteId: string | null; folderId: string; name: string;
  plan: CalendarPlan; dirty: boolean;
};
export type EditorLayout = 'single' | 'row' | 'grid';
export type EditorTabs = { tabs: EditorTab[]; active: string | null; visible: string[]; layout: EditorLayout };
export const editorPreferencesSchema = z.object({
  noteIds: z.array(z.string()).max(100), active: z.string().nullable(),
  visible: z.array(z.string()).max(4), layout: z.enum(['single', 'row', 'grid']),
});
export const initialEditorTabs = (): EditorTabs => ({ tabs: [], active: null, visible: [], layout: 'single' });
export function focusEditor(state: EditorTabs, key: string): EditorTabs {
  if (!state.tabs.some(tab => tab.key === key)) return state;
  const visible = state.visible.includes(key) ? state.visible : [...state.visible.slice(state.visible.length >= 4 ? 1 : 0), key];
  return state.active === key && visible === state.visible ? state : { ...state, active: key, visible };
}
export function openEditor(state: EditorTabs, tab: EditorTab): EditorTabs {
  const existing = state.tabs.find(value => tab.noteId ? value.noteId === tab.noteId : value.key === tab.key);
  return focusEditor(existing ? state : { ...state, tabs: [...state.tabs, tab] }, existing?.key ?? tab.key);
}
export function removeEditor(state: EditorTabs, key: string): EditorTabs {
  const tabs = state.tabs.filter(tab => tab.key !== key);
  const remaining = state.visible.filter(id => id !== key);
  const active = state.active === key ? remaining.at(-1) ?? tabs.at(-1)?.key ?? null : state.active;
  const visible = remaining.length ? remaining : active ? [active] : [];
  return { ...state, tabs, active, visible };
}
export function saveEditor(state: EditorTabs, key: string, noteId: string): EditorTabs {
  // Keep the draft's identity, position and visible slot when it becomes a saved note.
  const duplicate = state.tabs.find(tab => tab.noteId === noteId && tab.key !== key);
  const next = duplicate ? removeEditor(state, duplicate.key) : state;
  return { ...next, tabs: next.tabs.map(tab => tab.key === key ? { ...tab, noteId, dirty: false } : tab) };
}
export function toggleEditor(state: EditorTabs, key: string): EditorTabs {
  if (!state.tabs.some(tab => tab.key === key)) return state;
  if (!state.visible.includes(key)) return state.visible.length === 4 ? state : focusEditor(state, key);
  if (state.visible.length === 1) return state;
  const visible = state.visible.filter(id => id !== key);
  return { ...state, visible, active: state.active === key ? visible[0] ?? null : state.active };
}
export function editorPreferences(state: EditorTabs): z.infer<typeof editorPreferencesSchema> {
  const noteFor = (key: string | null) => state.tabs.find(tab => tab.key === key)?.noteId ?? null;
  return { noteIds: state.tabs.flatMap(tab => tab.noteId ? [tab.noteId] : []), active: noteFor(state.active),
    visible: state.visible.flatMap(key => { const id = noteFor(key); return id ? [id] : []; }), layout: state.layout };
}
export function reconcileEditors(state: EditorTabs, available: ReadonlySet<string>): EditorTabs {
  return state.tabs.reduce((next, tab) => tab.noteId && !tab.dirty && !available.has(tab.noteId) ? removeEditor(next, tab.key) : next, state);
}
