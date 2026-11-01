'use client';
import { readBookConfig } from '@/lib/book';
import { useEffect, useMemo, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useBookWorkspace } from '@/components/book/useBookWorkspace';
import { folderLabel, today } from '@/components/book/domain';
import { initialWorkspaceLayout, type WorkspacePreset } from './workspaceLayout';
import { useNotesPreferences } from './useNotesPreferences';
import { useNotesLifecycle } from './useNotesLifecycle';
import { initialPanes, followFolder, type FolderPane, type LensPane, type NotesPanes } from './panes';
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
  const base = useBookWorkspace(rootFolderId, orgId, userId, true);
  const [workspace, setWorkspace] = useState(initialWorkspaceLayout);
  const [contextTab, setContextTab] = useState<'note' | 'folder'>('note');
  const [folderContextId, setFolderContextId] = useState<string | null>(null);
  const [folderDirty, setFolderDirty] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const lifecycle = useNotesLifecycle({ ...base, dirty: base.dirty || folderDirty });
  function allowContextChange() {
    if (folderDirty) { base.actions.setError('Save or discard your folder changes first.'); return false; }
    return true;
  }
  function revealNote() { setContextTab('note'); setViewOpen(false); base.reveal(); }
  function open(item: Parameters<typeof base.open>[0]) {
    if (!allowContextChange() || base.dirty) { if (base.dirty) base.open(item); return; }
    setContextTab('note'); setViewOpen(false); if (folderContextId) setFolderContextId(item.folderId); base.open(item);
  }
  function add(plan?: Parameters<typeof base.add>[0], folderId?: string) {
    if (!allowContextChange() || base.dirty) { if (base.dirty) base.add(plan, folderId); return; }
    setContextTab('note'); setViewOpen(false); if (folderContextId) setFolderContextId(folderId ?? rootFolderId); base.add(plan, folderId);
  }
  const allSprints = base.folders.flatMap(folder => readBookConfig(folder.metadata)?.sprints ?? []);
  const model = { ...base, open, add, reveal: revealNote, actions: { ...base.actions, busy: base.actions.busy || lifecycle.busy }, planningConfig: { ...base.config, sprints: [...new Map(allSprints.map(sprint => [sprint.id, sprint])).values()] } };
  const views = useAirunoteStore(state => state.folderViews);
  const upsertView = useAirunoteStore(state => state.upsertFolderView);
  const [panes, setPanes] = useState(() => initialPanes(rootFolderId));
  useEffect(() => {
    if (base.loading) return;
    const available = new Set(base.folders.map(folder => folder.id));
    setPanes(previous => {
      if (previous.folders.every(pane => available.has(pane.folderId) && (!pane.focusId || available.has(pane.focusId))) && previous.lenses.every(pane => available.has(pane.folderId))) return previous;
      return { ...previous, folders: previous.folders.map(pane => ({ ...pane, folderId: available.has(pane.folderId) ? pane.folderId : rootFolderId, focusId: pane.focusId && available.has(pane.focusId) ? pane.focusId : null })), lenses: previous.lenses.map(pane => available.has(pane.folderId) ? pane : { ...pane, folderId: rootFolderId, viewId: 'list', asList: false }) };
    });
  }, [base.folders, base.loading, rootFolderId]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pinned, setPinned] = useState(false);
  const availableViews = useMemo(() => views.filter(view => model.folders.some(folder => folder.id === view.folderId)), [views, model.folders]);
  // Validated preferences and transition helpers always retain at least one pane in each group.
  const activeFolder = panes.folders.find(pane => pane.id === panes.activeFolder) ?? initialPanes(rootFolderId).folders[0];
  const following = panes.lenses.find(pane => !pane.frozen) ?? initialPanes(rootFolderId).lenses[0];
  const preferenceKey = `airunote:notes:${orgId}:${userId}`;
  const ready = useNotesPreferences(preferenceKey, model.loading, {
    workspace, panes, folderId: activeFolder?.folderId ?? rootFolderId, focusId: activeFolder?.focusId ?? null,
    viewId: following?.viewId ?? 'agenda', asList: following?.asList ?? false,
    selectedId: model.selected?.id ?? null, visible: model.visible, expandedPanel: model.expandedPanel, theme, pinned,
    closed: model.closed, collapsedFolders: activeFolder?.collapsedFolders ?? [], date: model.date, period: model.period, plot: model.plot, hours: model.hours,
  }, saved => {
    const ownsFolder = (id: string) => model.folders.some(folder => folder.id === id);
    const validView = (id: string, folder: string) => ['agenda', 'calendar', 'list'].includes(id) || availableViews.some(view => view.id === id && view.folderId === folder);
    const restored = saved.panes ?? initialPanes(rootFolderId);
    if (!saved.panes) {
      restored.folders = restored.folders.map(pane => ({ ...pane, folderId: saved.folderId, focusId: saved.focusId, collapsedFolders: saved.collapsedFolders, closed: saved.closed }));
      restored.lenses = restored.lenses.map(pane => ({ ...pane, folderId: saved.folderId, viewId: saved.viewId, asList: saved.asList, date: saved.date, period: saved.period, plot: saved.plot, hours: saved.hours, closed: saved.closed }));
    }
    setPanes({ ...restored,
      folders: restored.folders.map(pane => ({ ...pane, folderId: ownsFolder(pane.folderId) ? pane.folderId : rootFolderId, focusId: pane.focusId && ownsFolder(pane.focusId) ? pane.focusId : null, collapsedFolders: pane.collapsedFolders.filter(ownsFolder) })),
      lenses: restored.lenses.map(pane => ({ ...pane, folderId: ownsFolder(pane.folderId) ? pane.folderId : rootFolderId, viewId: validView(pane.viewId, pane.folderId) ? pane.viewId : 'list', date: !pane.frozen && saved.savedOn !== today() ? today() : pane.date })),
    });
    setTheme(saved.theme); setPinned(saved.pinned);
    if (saved.workspace) setWorkspace(saved.workspace);
    else setWorkspace(previous => ({ ...previous, folderChosen: saved.folderId !== rootFolderId,
      widths: { ...previous.widths, panels: { ...previous.widths.panels, organizer: restored.folderWidth ?? 360, calendar: restored.lensWidth ?? 460 } } }));
    const selection = model.items.find(item => item.id === saved.selectedId);
    model.setSelectedId(selection?.id ?? null);
    model.setVisible(saved.visible.filter(panel => panel !== 'context' || !!selection || saved.pinned));
    model.setExpandedPanel(saved.expandedPanel); model.setClosed(saved.closed);
  });
  function closeNote() {
    if (model.dirty) { model.actions.setError('Save or discard your note draft before closing.'); return; }
    model.setSelectedId(null); model.setCreating(false);
    if (folderContextId) setContextTab('folder');
    if (!pinned && !folderContextId) model.setVisible(previous => previous.filter(panel => panel !== 'context'));
    if (model.expandedPanel === 'context') model.setExpandedPanel(null);
  }
  function openFolderDetails(id: string) {
    if (!allowContextChange() || !model.folders.some(folder => folder.id === id)) return;
    setFolderContextId(id); setContextTab('folder'); base.reveal();
  }
  function closeFolderDetails() {
    if (!allowContextChange()) return;
    setFolderContextId(null); setContextTab('note');
    if (!model.selected && !model.creating) model.setExpandedPanel(null);
    if (!model.selected && !model.creating && !pinned) model.setVisible(previous => previous.filter(panel => panel !== 'context'));
  }
  function followContext(id: string) {
    if (!allowContextChange()) return false;
    setWorkspace(previous => ({ ...previous, folderChosen: true })); setViewOpen(true);
    if (folderContextId) setFolderContextId(id);
    if (!model.dirty && !model.creating && !pinned && workspace.preset !== 'panels') {
      model.setSelectedId(null);
      if (folderContextId) setContextTab('folder');
      else model.setVisible(previous => previous.filter(panel => panel !== 'context'));
    }
    return true;
  }
  function setPreset(preset: WorkspacePreset) {
    setWorkspace(previous => ({ ...previous, preset })); model.setExpandedPanel(null);
  }
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
  function defaultView(id: string) { const preferred = panes.defaults[id]; if (preferred && (['agenda', 'calendar', 'list'].includes(preferred) || availableViews.some(view => view.id === preferred && view.folderId === id))) return preferred; return availableViews.find(view => view.folderId === id && view.isDefault)?.id ?? (id === rootFolderId ? 'agenda' : 'list'); }
  function selectFolder(paneId: string, id: string) {
    if (model.folders.some(folder => folder.id === id) && followContext(id)) setPanes(previous => followFolder(previous, paneId, id, defaultView(id)));
  }
  function updateFolder(id: string, fields: Partial<FolderPane>) { setPanes(previous => ({ ...previous, folders: previous.folders.map(pane => pane.id === id ? { ...pane, ...fields, id } : pane) })); }
  function updateLens(id: string, fields: Partial<LensPane> | ((pane: LensPane) => Partial<LensPane>)) {
    setPanes(previous => ({ ...previous, lenses: previous.lenses.map(pane => pane.id === id ? { ...pane, ...(typeof fields === 'function' ? fields(pane) : fields), id, frozen: pane.frozen } : pane) }));
  }
  function layout(group: 'folder' | 'lens', value: NotesPanes['folderLayout']) { setPanes(previous => ({ ...previous, [group === 'folder' ? 'folderLayout' : 'lensLayout']: value, [group === 'folder' ? 'folderWidth' : 'lensWidth']: null })); }
  const contentModel = scopedModel(model.selected?.folderId ?? model.draftPreview?.folderId ?? model.captureFolderId);
  return { workspace, setWorkspace, setPreset, contextTab, setContextTab, folderContextId, folderDirty, setFolderDirty, openFolderDetails, closeFolderDetails, followContext, viewOpen, setViewOpen, lifecycle, ready, preferenceKey, theme, setTheme, pinned, setPinned, closeNote, model, contentModel, scopedModel,
    panes, setPanes, updateFolder, updateLens, layout, availableViews, upsertView, selectFolder, defaultView };
}
export type NotesModel = ReturnType<typeof useNotesWorkspace>;
