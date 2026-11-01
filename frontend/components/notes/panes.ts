import { z } from 'zod';
import { today } from '@/components/book/domain';

const folderPaneSchema = z.object({
  id: z.string(), folderId: z.string(), focusId: z.string().nullable(),
  collapsedFolders: z.array(z.string()), query: z.string(), closed: z.boolean(),
});
export const lensPaneSchema = z.object({
  id: z.string(), folderId: z.string(), viewId: z.string(), asList: z.boolean(), frozen: z.boolean(),
  destinationId: z.string().optional(), sort: z.enum(['name', 'updated', 'type']).optional(), calendarDisplay: z.enum(['grid', 'agenda']).optional(), collectionPageId: z.string().optional(), query: z.string(), closed: z.boolean(), descendants: z.boolean().optional(), planningFolderId: z.string().nullable().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(`${value}T12:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }),
  period: z.enum(['day', 'week', 'sprint', 'month', 'year', 'unplanned']),
  plot: z.enum(['items', 'projects', 'hours']), hours: z.enum(['24', '12', '8']),
});
export const panesSchema = z.object({
  folders: z.array(folderPaneSchema).min(1).max(4), lenses: z.array(lensPaneSchema).min(1).max(4),
  destinations: z.array(z.object({ key: z.string(), pane: lensPaneSchema })).default([]), activeLens: z.string().optional(), destinationsClosed: z.boolean().optional(),
  defaults: z.record(z.string()).default({}),
  activeFolder: z.string(), folderLayout: z.enum(['row', 'grid']), lensLayout: z.enum(['row', 'grid']),
  folderWidth: z.number().min(300).max(4000).nullable(), lensWidth: z.number().min(380).max(5000).nullable(),
}).refine(value => new Set(value.folders.map(pane => pane.id)).size === value.folders.length
  && new Set(value.lenses.map(pane => pane.id)).size === value.lenses.length
  && value.folders.some(pane => pane.id === value.activeFolder));
export type FolderPane = z.infer<typeof folderPaneSchema>;
export type LensPane = z.infer<typeof lensPaneSchema>;
export type NotesPanes = z.infer<typeof panesSchema>;
export function initialPanes(root: string): NotesPanes {
  return { folders: [{ id: 'folders-1', folderId: root, focusId: null, collapsedFolders: [], query: '', closed: false }],
    lenses: [{ id: 'lens-1', folderId: root, viewId: 'box', asList: false, frozen: false, query: '', closed: false, date: today(), period: 'week', plot: 'items', hours: '12' }],
    destinations: [], defaults: {}, activeFolder: 'folders-1', folderLayout: 'row', lensLayout: 'row', folderWidth: null, lensWidth: null };
}
export function addFolderPane(state: NotesPanes, id: string): NotesPanes {
  const active = state.folders.find(pane => pane.id === state.activeFolder) ?? state.folders[0];
  if (state.folders.length >= 4 || !active) return state;
  return { ...state, activeFolder: id, folderWidth: null, folders: [...state.folders, { ...active, id }] };
}
export function removeFolderPane(state: NotesPanes, id: string, viewForFolder: (id: string) => string = () => 'list'): NotesPanes {
  if (state.folders.length <= 1) return state;
  const folders = state.folders.filter(pane => pane.id !== id);
  const next = { ...state, folders, folderWidth: null, activeFolder: state.activeFolder === id ? folders[0]?.id ?? state.activeFolder : state.activeFolder };
  const active = folders.find(pane => pane.id === next.activeFolder);
  return state.activeFolder === id && active ? followFolder(next, active.id, active.folderId, viewForFolder(active.folderId)) : next;
}
// Freezing is independent of pane creation; legacy frozen/following arrays remain valid.
export function freezeLens(state: NotesPanes, id: string): NotesPanes {
  return { ...state, lenses: state.lenses.map(pane => pane.id === id ? { ...pane, frozen: true } : pane) };
}
export function unfreezeLens(state: NotesPanes, id: string, folderId: string, viewId: string): NotesPanes {
  return { ...state, lenses: state.lenses.map(pane => pane.id === id ? {
    ...pane, frozen: false, folderId,
    viewId: pane.folderId === folderId ? pane.viewId : viewId,
    asList: pane.folderId === folderId ? pane.asList : false,
  } : pane) };
}
export function addLensPane(state: NotesPanes, id: string, folderId: string, viewId: string): NotesPanes {
  if (state.lenses.length >= 4 || state.lenses.some(pane => pane.id === id)) return state;
  const pane = initialPanes(folderId).lenses[0]!;
  return { ...state, lensWidth: null, lenses: [...state.lenses, { ...pane, id, viewId }] };
}
export function removeLensPane(state: NotesPanes, id: string): NotesPanes {
  if (state.lenses.length <= 1 || !state.lenses.some(pane => pane.id === id)) return state;
  return { ...state, lensWidth: null, lenses: state.lenses.filter(pane => pane.id !== id) };
}
export function followFolder(state: NotesPanes, paneId: string, folderId: string, viewId: string): NotesPanes {
  return { ...state, activeFolder: paneId,
    folders: state.folders.map(pane => pane.id === paneId ? { ...pane, folderId } : pane),
    lenses: state.lenses.map(pane => pane.frozen ? pane : { ...pane, folderId, viewId, asList: false }) };
}
