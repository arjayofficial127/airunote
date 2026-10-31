'use client';
import { readBookConfig } from '@/lib/book';
import { useMemo, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useBookWorkspace } from '@/components/book/useBookWorkspace';
import { subtree, folderLabel } from '@/components/book/domain';
import type { AiruFolder, FolderViewSummary } from '@/components/airunote/types';

export function folderPath(folders: AiruFolder[], id: string): AiruFolder[] {
  const result: AiruFolder[] = []; const seen = new Set<string>();
  let folder = folders.find(value => value.id === id);
  while (folder && !seen.has(folder.id)) {
    result.unshift(folder); seen.add(folder.id);
    folder = folders.find(value => value.id === folder?.parentFolderId);
  }
  return result;
}

export function viewLabel(view: FolderViewSummary, views: FolderViewSummary[]) {
  const matches = views.filter(other => other.folderId === view.folderId && other.name.trim().toLowerCase() === view.name.trim().toLowerCase()).sort((a, b) => a.id.localeCompare(b.id));
  return matches.length > 1 ? `${view.name} ${matches.findIndex(other => other.id === view.id) + 1}` : view.name;
}

export function useNotesWorkspace(rootFolderId: string, orgId: string, userId: string) {
  const base = useBookWorkspace(rootFolderId, orgId, userId);
  const allSprints = base.folders.flatMap(folder => readBookConfig(folder.metadata)?.sprints ?? []);
  const model = { ...base, planningConfig: { ...base.config, sprints: [...new Map(allSprints.map(sprint => [sprint.id, sprint])).values()] } };
  const views = useAirunoteStore(state => state.folderViews);
  const upsertView = useAirunoteStore(state => state.upsertFolderView);
  const [folderId, setFolderId] = useState(rootFolderId);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [viewId, setViewId] = useState('calendar');
  const [asList, setAsList] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [creatingView, setCreatingView] = useState(false);
  const [viewQuery, setViewQuery] = useState('');
  const availableViews = useMemo(() => views.filter(view => model.folders.some(folder => folder.id === view.folderId)), [views, model.folders]);
  const selectedView = availableViews.find(view => view.id === viewId) ?? null;
  const scope = subtree(model.folders, folderId);
  const viewItems = model.filtered.filter(item => selectedView && selectedView.type !== 'book' ? item.folderId === folderId : scope.has(item.folderId));
  function scopedModel(id: string, ownFolder = false) {
    const path = folderPath(model.folders, id);
    const owner = (ownFolder ? path[path.length - 1] : [...path].reverse().find(folder => folder.metadata && 'airunoteBook' in folder.metadata)) ?? model.root;
    const config = readBookConfig(owner?.metadata) ?? model.config;
    const inheritedSprints = path.flatMap(folder => readBookConfig(folder.metadata)?.sprints ?? []);
    const configFolderId = owner?.id ?? rootFolderId;
    return { ...model, config, configFolderId, configError: !readBookConfig(owner?.metadata),
      planningConfig: { ...config, sprints: [...new Map(inheritedSprints.map(sprint => [sprint.id, sprint])).values()] },
      actions: { ...model.actions, configure: (fields: Parameters<typeof model.actions.configure>[0]) => model.actions.configure(fields, configFolderId) } };
  }
  const viewModel = { ...scopedModel(folderId, true), filtered: viewItems, planningConfig: model.planningConfig, add: (plan?: Parameters<typeof model.add>[0]) => model.add(plan, folderId) };
  const contentModel = scopedModel(model.selected?.folderId ?? model.captureFolderId);
  function selectFolder(id: string) {
    if (!model.folders.some(folder => folder.id === id)) return;
    setFolderId(id); setAsList(false);
    setViewId(availableViews.find(view => view.folderId === id && view.isDefault)?.id ?? 'list');
  }
  function openView(view: FolderViewSummary) {
    if (!model.folders.some(folder => folder.id === view.folderId)) return;
    setFolderId(view.folderId); setViewId(view.id); setAsList(false); setBrowse(false);
    if (focusId && !subtree(model.folders, focusId).has(view.folderId)) setFocusId(null);
  }
  function root() { setFocusId(null); setFolderId(rootFolderId); setViewId('calendar'); setAsList(false); }
  const path = folderPath(model.folders, folderId);
  const viewResults = availableViews.filter(view => `${view.name} ${folderPath(model.folders, view.folderId).map(folder => folderLabel(folder.humanId)).join(' / ')}`.toLowerCase().includes(viewQuery.toLowerCase()));
  return { model, viewModel, contentModel, folderId, focusId, setFocusId, viewId, setViewId, selectedView, asList, setAsList, browse, setBrowse, creatingView, setCreatingView, viewQuery, setViewQuery, viewResults, availableViews, upsertView, selectFolder, openView, root, path };
}
export type NotesModel = ReturnType<typeof useNotesWorkspace>;
