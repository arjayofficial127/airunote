'use client';
import { activeFolders } from '@/lib/airunoteLifecycle';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { readBookConfig, type CalendarPlan, type PlanningFields, type WorkspaceView } from '@/lib/book';
import { subtree, bookItems, today, panels, type Panel, type Period, type Plot, type BookItem } from './domain';
import { useBookActions } from './useBookActions';

export type BookEditorSelection = {
  selectedId: string | null; creating: boolean; captureFolderId: string; capturePlan: CalendarPlan;
  draftPreview: { name: string; folderId: string } | null; dirty: boolean;
  setSelectedId: Dispatch<SetStateAction<string | null>>; setCreating: Dispatch<SetStateAction<boolean>>;
  setDraftPreview: Dispatch<SetStateAction<{ name: string; folderId: string } | null>>; setDirty: Dispatch<SetStateAction<boolean>>;
};
export function useBookWorkspace(rootFolderId: string, orgId: string, userId: string, natural = false, editor?: BookEditorSelection) {
  const store = useAirunoteStore(); const root = store.foldersById.get(rootFolderId);
  const folders = useMemo(() => Array.from(store.foldersById.values()).filter(folder => folder.orgId === orgId && folder.ownerUserId === userId), [store.foldersById, orgId, userId]);
  const ids = useMemo(() => subtree(folders, rootFolderId), [folders, rootFolderId]);
  const scopedFolders = useMemo(() => activeFolders(folders.filter(folder => ids.has(folder.id))), [folders, ids]);
  const items = useMemo(() => bookItems(Array.from(store.documentsById.values()), new Set(scopedFolders.map(folder => folder.id)), userId), [store.documentsById, scopedFolders, userId]);
  const parsedConfig = readBookConfig(root?.metadata);
  const config = parsedConfig ?? { version: 1 as const, revision: 0, sprints: [], views: [], templates: [] };
  const actions = useBookActions(orgId, userId, rootFolderId, config);
  const [visible, setVisible] = useState<Panel[]>(natural ? ['inbox', 'organizer', 'calendar'] : [...panels]);
  const [expandedPanel, setExpandedPanel] = useState<Panel | null>(null);
  const [contextReveal, setContextReveal] = useState(0);
  const [folderFilter, setFolderFilter] = useState<string[] | null>(null);
  const [query, setQuery] = useState(''); const [closed, setClosed] = useState(false);
  const [layout, setLayout] = useState<'tree' | 'columns'>('columns');
  const [period, setPeriod] = useState<Period>('week'); const [date, setDate] = useState(today);
  const [plot, setPlot] = useState<Plot>('items'); const [hours, setHours] = useState<'24' | '12' | '8'>('12');
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null); const [localCreating, setLocalCreating] = useState(false);
  const [localCaptureFolderId, setLocalCaptureFolderId] = useState(rootFolderId);
  const [captureKind, setCaptureKind] = useState<PlanningFields['kind']>('note');
  const [localCapturePlan, setLocalCapturePlan] = useState<CalendarPlan>({ kind: 'unplanned' });
  const [localDraftPreview, setLocalDraftPreview] = useState<{ name: string; folderId: string } | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [localDirty, setLocalDirty] = useState(false);
  const { selectedId, creating, captureFolderId, capturePlan, draftPreview, dirty, setSelectedId, setCreating, setDraftPreview, setDirty } = editor ?? {
    selectedId: localSelectedId, creating: localCreating, captureFolderId: localCaptureFolderId, capturePlan: localCapturePlan, draftPreview: localDraftPreview, dirty: localDirty,
    setSelectedId: setLocalSelectedId, setCreating: setLocalCreating, setDraftPreview: setLocalDraftPreview, setDirty: setLocalDirty,
  };
  const [draftFlags, setDraftFlags] = useState<string[]>([]);
  const setDraftFlag = useCallback((key: string, value: boolean) => setDraftFlags(previous => value ? previous.includes(key) ? previous : [...previous, key] : previous.filter(flag => flag !== key)), []);
  const [batchMode, setBatchMode] = useState(false); const [batchIds, setBatchIds] = useState<string[]>([]);
  const selectedFolders = folderFilter ?? scopedFolders.map(folder => folder.id);
  const filtered = items.filter(item => selectedFolders.includes(item.folderId) && item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const shownPanels = expandedPanel && visible.includes(expandedPanel) ? [expandedPanel] : visible;
  function reveal() { setContextReveal(value => value + 1); setVisible(previous => previous.includes('context') ? previous : [...previous, 'context']); if (expandedPanel) setExpandedPanel('context'); }
  function open(item: BookItem) {
    if (dirty) { actions.setError('Save or discard your note draft before opening another item.'); return; }
    setSelectedId(item.id); setCreating(false); reveal();
  }
  function add(plan: CalendarPlan = { kind: 'unplanned' }, folderId = rootFolderId, kind: PlanningFields['kind'] = 'note') {
    if (dirty) { actions.setError('Save or discard your note draft before starting another item.'); return; }
    setDraftKey(value => value + 1); setDraftPreview({ name: '', folderId }); setSelectedId(null); setCreating(true); setCaptureKind(kind); setLocalCapturePlan(plan); setLocalCaptureFolderId(folderId); reveal();
  }
  function applyView(view: WorkspaceView) { setExpandedPanel(null); setVisible(panels.filter(panel => view.panels.includes(panel))); setFolderFilter(view.folders); setPeriod(view.period); setDate(view.date); setPlot(view.plot); setHours(view.hours); setLayout(view.layout); setClosed(view.closed); }
  function view(name: string): WorkspaceView { return { id: crypto.randomUUID(), name, panels: visible, folders: selectedFolders, period, date, plot, hours, layout, closed }; }
  useEffect(() => {
    if (!dirty && !draftFlags.length) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]'); if (!link || link.getAttribute('target') === '_blank') return;
      if (!window.confirm('Leave this page with unsaved changes?')) { event.preventDefault(); event.stopPropagation(); }
    };
    const leave = (event: Event) => { if (!window.confirm('Leave this page with unsaved changes?')) event.preventDefault(); };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    window.addEventListener('airunote:before-leave', leave);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); window.removeEventListener('airunote:before-leave', leave); };
  }, [dirty, draftFlags.length]);
  return { natural, root, folders: scopedFolders, items, filtered, config, planningConfig: config, configFolderId: rootFolderId, configError: !parsedConfig, actions, visible, setVisible, shownPanels, expandedPanel, setExpandedPanel, contextReveal, selectedFolders, setFolderFilter, query, setQuery, closed, setClosed, layout, setLayout, period, setPeriod, date, setDate, plot, setPlot, hours, setHours, selected: items.find(item => item.id === selectedId) ?? null, creating, setCreating, setSelectedId, capturePlan, captureFolderId, captureKind, draftPreview, setDraftPreview, draftKey, reveal, dirty, setDirty, hasDrafts: draftFlags.length > 0, setDraftFlag, open, add, applyView, view, batchMode, setBatchMode, batchIds, setBatchIds, loading: store.isLoading || store.lastFetched === null, error: store.error, orgId, userId, rootFolderId };
}
export type BookWorkspaceModel = ReturnType<typeof useBookWorkspace>;
