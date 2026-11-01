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
  function openView(view: FolderViewSummary) { if (pane.frozen && view.folderId !== pane.folderId) { model.actions.setError('Unfreeze this view before opening another Space here.'); return; } if (!notes.followContext(view.folderId)) return; notes.updateLens(pane.id, { folderId: view.folderId, viewId: view.id, asList: false }); setBrowse(false); }
  const scope = subtree(model.folders, pane.folderId);
  const links = readSpaceLinks(model.folders.find(folder => folder.id === pane.folderId)?.metadata);
  const linkedNotes = new Set(links.filter(link => link.entityType === 'document').map(link => link.entityId));
  const linkedSpaces = new Set(links.filter(link => link.entityType === 'folder').map(link => link.entityId));
  const filtered = model.filtered.filter(item => ((selectedView && selectedView.type !== 'book' ? item.folderId === pane.folderId : scope.has(item.folderId)) || linkedNotes.has(item.id)) && (pane.closed || item.planning.status === 'open') && item.name.toLowerCase().includes(pane.query.toLowerCase()));
  const folders = model.folders.filter(folder => folder.id !== pane.folderId && (folder.parentFolderId === pane.folderId || linkedSpaces.has(folder.id)));
  const viewModel = { ...notes.scopedModel(pane.folderId, true), filtered, planningConfig: model.planningConfig,
    date: pane.date, setDate: setter('date'), period: pane.period, setPeriod: setter('period'), plot: pane.plot, setPlot: setter('plot'), hours: pane.hours, setHours: setter('hours'), closed: pane.closed, setClosed: setter('closed'),
    add: (plan?: Parameters<typeof model.add>[0]) => model.add(plan, pane.folderId) };
  return { model, viewModel, selectedView, folderId: pane.folderId, viewId: pane.viewId, setViewId: setter('viewId'), asList: pane.asList, setAsList: setter('asList'),
    browse, setBrowse, creatingView, setCreatingView, viewQuery, setViewQuery,
    links, linkedNotes, linkedSpaces, folders,
    availableViews: notes.availableViews, upsertView: notes.upsertView, selectFolder, openView, root: () => selectFolder(model.rootFolderId),
    path: folderPath(model.folders, pane.folderId), viewResults: notes.availableViews.filter(view => `${view.name} ${folderPath(model.folders, view.folderId).map(folder => folderLabel(folder.humanId)).join(' / ')}`.toLowerCase().includes(viewQuery.toLowerCase())) };
}
export type NotesLensModel = ReturnType<typeof useNotesLens>;
