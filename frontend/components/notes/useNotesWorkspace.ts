'use client';
import { readBookConfig } from '@/lib/book';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useBookWorkspace } from '@/components/book/useBookWorkspace';
import { today } from '@/components/book/domain';
import { initialWorkspaceLayout, type WorkspacePreset } from './workspaceLayout';
import { useNotesPreferences } from './useNotesPreferences';
import { useNotesLifecycle } from './useNotesLifecycle';
import { useCollections } from './useCollections';
import { useSpaceLinks } from './useSpaceLinks';
import { destinationKey, rememberDestinations, openDestination, closeDestination, reorderDestination } from './destinations';
import { initialPanes, type FolderPane, type LensPane, type NotesPanes } from './panes';
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
export function viewOptionLabel(view: FolderViewSummary, views: FolderViewSummary[]) {
  const name = viewLabel(view, views);
  const type = view.type === 'book' ? 'Calendar' : view.type.charAt(0).toUpperCase() + view.type.slice(1);
  return name.toLowerCase() === type.toLowerCase() ? name : `${name} · ${type}`;
}
export function useNotesWorkspace(rootFolderId: string, orgId: string, userId: string) {
  const base = useBookWorkspace(rootFolderId, orgId, userId, true);
  const [workspace, setWorkspace] = useState(initialWorkspaceLayout);
  const [contextTab, setContextTab] = useState<'note' | 'folder'>('note');
  const [folderContextId, setFolderContextId] = useState<string | null>(null);
  const [folderDirty, setFolderDirty] = useState(false);
  const [spaceReveal, setSpaceReveal] = useState(0);
  const lifecycle = useNotesLifecycle({ ...base, dirty: base.dirty || folderDirty });
  function allowContextChange() {
    if (folderDirty) { base.actions.setError('Save or discard your folder changes first.'); return false; }
    return true;
  }
  function revealNote() { setContextTab('note'); base.reveal(); }
  function open(item: Parameters<typeof base.open>[0]) {
    if (!allowContextChange() || base.dirty) { if (base.dirty) base.open(item); return; }
    if (!base.visible.includes('context')) setWorkspace(previous => ({ ...previous, contextWidthMode: 'note' }));
    setContextTab('note'); if (folderContextId) setFolderContextId(item.folderId); base.open(item);
  }
  function add(plan?: Parameters<typeof base.add>[0], folderId?: string) {
    if (!allowContextChange() || base.dirty) { if (base.dirty) base.add(plan, folderId); return; }
    if (!base.visible.includes('context')) setWorkspace(previous => ({ ...previous, contextWidthMode: 'note' }));
    setContextTab('note'); if (folderContextId) setFolderContextId(folderId ?? rootFolderId); base.add(plan, folderId);
  }
  const allSprints = base.folders.flatMap(folder => readBookConfig(folder.metadata)?.sprints ?? []);
  const model = { ...base, open, add, reveal: revealNote, actions: { ...base.actions, busy: base.actions.busy || lifecycle.busy }, planningConfig: { ...base.config, sprints: [...new Map(allSprints.map(sprint => [sprint.id, sprint])).values()] } };
  const links = useSpaceLinks(model);
  const collections = useCollections(orgId);
  const refreshCollections = collections.refetch;
  useEffect(() => { if (!model.loading) void refreshCollections(); }, [model.folders, model.loading, refreshCollections]);
  const views = useAirunoteStore(state => state.folderViews);
  const upsertView = useAirunoteStore(state => state.upsertFolderView);
  const [panes, setRawPanes] = useState(() => rememberDestinations(initialPanes(rootFolderId)));
  const setPanes: Dispatch<SetStateAction<NotesPanes>> = value => setRawPanes(previous => rememberDestinations(typeof value === 'function' ? value(previous) : value));
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
  const following = panes.lenses.find(pane => !pane.frozen) ?? panes.lenses[0];
  const preferenceKey = `airunote:notes:${orgId}:${userId}`;
  const ready = useNotesPreferences(preferenceKey, model.loading, {
    workspace, folderContextId, contextTab, panes, folderId: activeFolder?.folderId ?? rootFolderId, focusId: activeFolder?.focusId ?? null,
    viewId: following?.viewId ?? 'agenda', asList: following?.asList ?? false,
    selectedId: model.selected?.id ?? null, visible: model.visible, expandedPanel: model.expandedPanel, theme, pinned,
    closed: model.closed, collapsedFolders: activeFolder?.collapsedFolders ?? [], date: model.date, period: model.period, plot: model.plot, hours: model.hours,
  }, saved => {
    const ownsFolder = (id: string) => model.folders.some(folder => folder.id === id);
    const validView = (id: string, folder: string) => /^collection:[0-9a-f-]{36}$/i.test(id) || ['agenda', 'calendar', 'list', 'details', 'box', 'cards'].includes(id) || availableViews.some(view => view.id === id && view.folderId === folder);
    const restored = saved.panes ?? initialPanes(rootFolderId);
    if (!saved.panes) {
      restored.folders = restored.folders.map(pane => ({ ...pane, folderId: saved.folderId, focusId: saved.focusId, collapsedFolders: saved.collapsedFolders, closed: saved.closed }));
      restored.lenses = restored.lenses.map(pane => ({ ...pane, folderId: saved.folderId, viewId: saved.viewId, asList: saved.asList, date: saved.date, period: saved.period, plot: saved.plot, hours: saved.hours, closed: saved.closed }));
    }
    setPanes({ ...restored,
      folders: restored.folders.map(pane => ({ ...pane, folderId: ownsFolder(pane.folderId) ? pane.folderId : rootFolderId, focusId: pane.focusId && ownsFolder(pane.focusId) ? pane.focusId : null, collapsedFolders: pane.collapsedFolders.filter(ownsFolder) })),
      lenses: restored.lenses.map(pane => ({ ...pane, folderId: ownsFolder(pane.folderId) ? pane.folderId : rootFolderId, viewId: availableViews.some(view => view.id === pane.viewId && view.type === 'book') ? 'calendar' : validView(pane.viewId, pane.folderId) ? pane.viewId : 'list', planningFolderId: pane.planningFolderId ?? (availableViews.some(view => view.id === pane.viewId && view.type === 'book') ? pane.folderId : null), date: !pane.frozen && saved.savedOn !== today() ? today() : pane.date })),
    });
    setTheme(saved.theme); setPinned(saved.pinned);
    if (saved.workspace) setWorkspace(saved.workspace);
    else setWorkspace(previous => ({ ...previous, folderChosen: saved.folderId !== rootFolderId,
      widths: { ...previous.widths, panels: { ...previous.widths.panels, organizer: restored.folderWidth ?? 360, calendar: restored.lensWidth ?? 460 } } }));
    const selection = model.items.find(item => item.id === saved.selectedId);
    model.setSelectedId(selection?.id ?? null);
    const restoredFolder = saved.folderContextId && ownsFolder(saved.folderContextId) ? saved.folderContextId : null;
    setFolderContextId(restoredFolder); setContextTab(saved.contextTab === 'folder' && restoredFolder ? 'folder' : 'note');
    model.setVisible(saved.visible);
    model.setExpandedPanel(saved.expandedPanel); model.setClosed(saved.closed);
  });
  function closeNote() {
    if (model.dirty) { model.actions.setError('Save or discard your note draft before closing.'); return; }
    model.setSelectedId(null); model.setCreating(false);
    if (folderContextId) setContextTab('folder');
    if (!folderContextId) { setPinned(false); model.setVisible(previous => previous.filter(panel => panel !== 'context')); }
    if (model.expandedPanel === 'context') model.setExpandedPanel(null);
  }
  function openFolderDetails(id: string) {
    if (!allowContextChange() || !model.folders.some(folder => folder.id === id)) return;
    if (model.dirty || model.hasDrafts) { model.actions.setError('Save or discard your edits first.'); return; }
    if (!model.visible.includes('context') || (!model.selected && !folderContextId)) setWorkspace(previous => ({ ...previous, contextWidthMode: 'properties' }));
    setFolderContextId(id); setContextTab('folder'); base.reveal();
  }
  function closeFolderDetails() {
    if (!allowContextChange()) return;
    setFolderContextId(null); setContextTab('note');
    if (!model.selected && !model.creating) model.setExpandedPanel(null);
    if (!model.selected && !model.creating) { setPinned(false); model.setVisible(previous => previous.filter(panel => panel !== 'context')); }
  }
  function followContext(id: string) {
    if (!allowContextChange()) return false;
    if (model.dirty) { model.actions.setError('Save or discard your note draft before opening a folder.'); return false; }
    setWorkspace(previous => ({ ...previous, folderChosen: true }));
    setSpaceReveal(value => value + 1);
    if (!pinned) { setFolderContextId(null); setContextTab('note'); model.setVisible(previous => previous.filter(panel => panel !== 'context')); }
    model.setVisible(previous => previous.includes('calendar') ? previous : [...previous, 'calendar']);
    model.setExpandedPanel(null);
    if (!model.creating && !pinned) model.setSelectedId(null);
    return true;
  }
  function setPreset(preset: WorkspacePreset) {
    setWorkspace(previous => ({ ...previous, preset })); model.setExpandedPanel(null);
  }
  function togglePanel(panel: 'navigation' | 'inbox' | 'organizer' | 'calendar' | 'context') {
    if (panel === 'context' && (model.dirty || folderDirty)) { model.actions.setError('Save or discard your context changes first.'); return; }
    const targets = panel === 'navigation' ? ['inbox', 'organizer'] : [panel];
    model.setExpandedPanel(null);
    model.setVisible(previous => {
      const hiding = previous.some(value => targets.includes(value));
      return (['inbox', 'organizer', 'calendar', 'context'] as const).filter(value => targets.includes(value) ? !hiding : previous.includes(value));
    });
  }
  function showAllPanels() { model.setExpandedPanel(null); model.setVisible(['inbox', 'organizer', 'calendar', 'context']); }
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
  function defaultView(id: string) { const preferred = panes.defaults[id]; if (preferred && (['list', 'details', 'box', 'cards'].includes(preferred) || availableViews.some(view => view.id === preferred && view.folderId === id && view.type !== 'book'))) return preferred; return availableViews.find(view => view.folderId === id && view.isDefault && view.type !== 'book')?.id ?? 'box'; }
  function allowDestinationChange() {
    if (model.dirty || model.hasDrafts || folderDirty) { model.actions.setError('Save or discard your edits before switching destinations.'); return false; }
    return true;
  }
  function showDestination() { model.actions.setError(null); model.setExpandedPanel(null); model.setVisible(previous => previous.includes('calendar') ? previous : [...previous, 'calendar']); setWorkspace(previous => ({ ...previous, folderChosen: true })); setSpaceReveal(value => value + 1); }
  function selectFolder(paneId: string, id: string) {
    if (!model.folders.some(folder => folder.id === id) || !allowDestinationChange() || !followContext(id)) return;
    setPanes(previous => {
      const target = previous.lenses.find(pane => destinationKey(pane).startsWith('folder:') && !pane.frozen) ?? previous.lenses.find(pane => !pane.frozen);
      const next = { ...previous, activeFolder: paneId, folders: previous.folders.map(pane => pane.id === paneId ? { ...pane, folderId: id } : pane) };
      if (!target) return next;
      const snapshot = rememberDestinations(next);
      return { ...snapshot, destinationsClosed: false, activeLens: target.id, lenses: snapshot.lenses.map(pane => pane.id === target.id ? { ...pane, folderId: id, viewId: defaultView(id), query: '', asList: false, destinationId: `folder:${target.id}` } : pane) };
    });
  }
  function activateDestination(key: string, preferredPane?: string, template?: LensPane, saved = false) {
    if (!saved && !allowDestinationChange()) return;
    const snapshot = template ?? panes.destinations.find(tab => tab.key === key)?.pane;
    const next = snapshot && { ...snapshot, folderId: model.folders.some(folder => folder.id === snapshot.folderId) ? snapshot.folderId : rootFolderId };
    if (!next) return;
    if (!panes.lenses.some(pane => destinationKey(pane) === key) && panes.lenses.every(pane => pane.frozen)) { model.actions.setError('Unfreeze a pane or add a pane to open this destination.'); return; }
    setPanes(previous => openDestination(previous, key, next, preferredPane)); showDestination();
  }
  function openTool(tool: 'calendar' | 'plan') {
    activateDestination(tool, undefined, { ...initialPanes(rootFolderId).lenses[0]!, viewId: tool === 'plan' ? 'agenda' : 'calendar', plot: 'items', calendarDisplay: 'grid' });
  }
  function openCollection(paneId: string, id: string, homeFolderId?: string, saved = false) {
    const home = homeFolderId ?? collections.data?.find(item => item.id === id)?.homeFolderId ?? rootFolderId;
    activateDestination(`collection:${id}`, paneId, { ...initialPanes(home).lenses[0]!, viewId: `collection:${id}` }, saved);
  }
  function closeResource(key: string) {
    if (!allowDestinationChange()) return;
    setRawPanes(previous => closeDestination(rememberDestinations(previous), key, rootFolderId));
  }
  function moveResource(key: string, offset: number) { setPanes(previous => reorderDestination(previous, key, offset)); }
  function updateFolder(id: string, fields: Partial<FolderPane>) { setPanes(previous => ({ ...previous, folders: previous.folders.map(pane => pane.id === id ? { ...pane, ...fields, id } : pane) })); }
  function updateLens(id: string, fields: Partial<LensPane> | ((pane: LensPane) => Partial<LensPane>)) {
    setPanes(previous => ({ ...previous, lenses: previous.lenses.map(pane => pane.id === id ? { ...pane, ...(typeof fields === 'function' ? fields(pane) : fields), id, frozen: pane.frozen } : pane) }));
  }
  function layout(group: 'folder' | 'lens', value: NotesPanes['folderLayout']) { setPanes(previous => ({ ...previous, [group === 'folder' ? 'folderLayout' : 'lensLayout']: value, [group === 'folder' ? 'folderWidth' : 'lensWidth']: null })); }
  const contentModel = scopedModel(model.selected?.folderId ?? model.draftPreview?.folderId ?? model.captureFolderId);
  return { activateDestination, openTool, closeResource, moveResource, allowDestinationChange, collections, openCollection, links, spaceReveal, workspace, setWorkspace, setPreset, contextTab, setContextTab, folderContextId, folderDirty, setFolderDirty, openFolderDetails, closeFolderDetails, followContext, togglePanel, showAllPanels, lifecycle, ready, preferenceKey, theme, setTheme, pinned, setPinned, closeNote, model, contentModel, scopedModel,
    panes, setPanes, updateFolder, updateLens, layout, availableViews, upsertView, selectFolder, defaultView };
}
export type NotesModel = ReturnType<typeof useNotesWorkspace>;
