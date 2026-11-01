'use client';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { subtree, folderLabel } from '@/components/book/domain';
import { folderPath, type NotesModel } from './useNotesWorkspace';
import type { LensPane } from './panes';
import type { FolderViewSummary } from '@/components/airunote/types';
import { readSpaceLinks } from '@/lib/spaceLinks';

export function useNotesLens(notes: NotesModel, pane: LensPane) {
  const { model } = notes;
  const [browse, setBrowse] = useState(false), [creatingView, setCreatingView] = useState(false), [viewQuery, setViewQuery] = useState('');
  const selectedView = notes.availableViews.find(view => view.id === pane.viewId && view.folderId === pane.folderId) ?? null;
  function setter<K extends keyof LensPane>(key: K): Dispatch<SetStateAction<LensPane[K]>> {
    return value => notes.updateLens(pane.id, previous => ({ [key]: typeof value === 'function' ? value(previous[key]) : value }));
  }
  function selectFolder(id: string) { notes.selectFolder(notes.panes.activeFolder, id); }
  function openView(view: FolderViewSummary) { if (view.type === 'book') { if (!notes.allowDestinationChange()) return; notes.openTool('calendar'); notes.setPanes(previous => ({ ...previous, lenses: previous.lenses.map(value => value.viewId === 'calendar' ? { ...value, planningFolderId: view.folderId } : value) })); setBrowse(false); return; } if (pane.frozen && view.folderId !== pane.folderId) { model.actions.setError('Unfreeze this view before opening another folder here.'); return; } if (!notes.followContext(view.folderId)) return; notes.updateLens(pane.id, { folderId: view.folderId, viewId: view.id, asList: false }); setBrowse(false); }
  const descendants = pane.descendants ?? false;
  const isPlanning = pane.viewId === 'agenda' || pane.viewId === 'calendar' || selectedView?.type === 'book';
  const planningFolderId = pane.planningFolderId === undefined && selectedView?.type === 'book' ? pane.folderId : pane.planningFolderId ?? null;
  const scope = subtree(model.folders, isPlanning ? planningFolderId ?? model.rootFolderId : pane.folderId);
  const links = readSpaceLinks(model.folders.find(folder => folder.id === pane.folderId)?.metadata);
  const linkedNotes = new Set(links.filter(link => link.entityType === 'document').map(link => link.entityId));
  const linkedSpaces = new Set(links.filter(link => link.entityType === 'folder').map(link => link.entityId));
  const filtered = model.items.filter(item => (isPlanning ? scope.has(item.folderId) : ((descendants ? scope.has(item.folderId) : item.folderId === pane.folderId) || linkedNotes.has(item.id))) && (pane.closed || item.planning.status === 'open') && item.name.toLowerCase().includes(pane.query.toLowerCase()) && item.name.toLowerCase().includes(model.query.toLowerCase()));
  const folders = model.folders.filter(folder => folder.id !== pane.folderId && (descendants ? scope.has(folder.parentFolderId) : folder.parentFolderId === pane.folderId || linkedSpaces.has(folder.id)) && folderLabel(folder.humanId).toLowerCase().includes(pane.query.toLowerCase()));
  const viewModel = { ...notes.scopedModel(isPlanning ? planningFolderId ?? model.rootFolderId : pane.folderId, true), filtered, sort: pane.sort, query: pane.query, planningConfig: model.planningConfig,
    date: pane.date, setDate: setter('date'), period: pane.period, setPeriod: setter('period'), plot: pane.plot, setPlot: setter('plot'), hours: pane.hours, setHours: setter('hours'), closed: pane.closed, setClosed: setter('closed'),
    add: (plan?: Parameters<typeof model.add>[0]) => model.add(plan, isPlanning ? planningFolderId ?? model.rootFolderId : pane.folderId) };
  return { paneId: pane.id, model, viewModel, selectedView, folderId: pane.folderId, viewId: pane.viewId, setViewId: setter('viewId'), asList: pane.asList, setAsList: setter('asList'),
    browse, setBrowse, creatingView, setCreatingView, viewQuery, setViewQuery,
    scope, descendants, planningFolderId, links, linkedNotes, linkedSpaces, folders,
    availableViews: notes.availableViews, upsertView: notes.upsertView, selectFolder, openView, root: () => selectFolder(model.rootFolderId),
    path: folderPath(model.folders, pane.folderId), viewResults: notes.availableViews.filter(view => `${view.name} ${folderPath(model.folders, view.folderId).map(folder => folderLabel(folder.humanId)).join(' / ')}`.toLowerCase().includes(viewQuery.toLowerCase())) };
}
export type NotesLensModel = ReturnType<typeof useNotesLens>;
