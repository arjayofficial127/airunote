'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { readBookConfig, type CalendarPlan, type WorkspaceView } from '@/lib/book';
import { subtree, bookItems, today, panels, type Panel, type Period, type Plot, type BookItem } from './domain';
import { useBookActions } from './useBookActions';

export function useBookWorkspace(rootFolderId: string, orgId: string, userId: string) {
  const store = useAirunoteStore(); const root = store.foldersById.get(rootFolderId);
  const folders = useMemo(() => Array.from(store.foldersById.values()).filter(folder => folder.orgId === orgId && folder.ownerUserId === userId), [store.foldersById, orgId, userId]);
  const ids = useMemo(() => subtree(folders, rootFolderId), [folders, rootFolderId]);
  const scopedFolders = useMemo(() => folders.filter(folder => ids.has(folder.id)), [folders, ids]);
  const items = useMemo(() => bookItems(Array.from(store.documentsById.values()), ids, userId), [store.documentsById, ids, userId]);
  const parsedConfig = readBookConfig(root?.metadata);
  const config = parsedConfig ?? { version: 1 as const, revision: 0, sprints: [], views: [], templates: [] };
  const actions = useBookActions(orgId, userId, rootFolderId, config);
  const [visible, setVisible] = useState<Panel[]>([...panels]);
  const [folderFilter, setFolderFilter] = useState<string[] | null>(null);
  const [query, setQuery] = useState(''); const [closed, setClosed] = useState(false);
  const [layout, setLayout] = useState<'tree' | 'columns'>('columns');
  const [period, setPeriod] = useState<Period>('week'); const [date, setDate] = useState(today);
  const [plot, setPlot] = useState<Plot>('items'); const [hours, setHours] = useState<'24' | '12' | '8'>('12');
  const [selectedId, setSelectedId] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  const [capturePlan, setCapturePlan] = useState<CalendarPlan>({ kind: 'unplanned' });
  const [dirty, setDirty] = useState(false);
  const [draftFlags, setDraftFlags] = useState<string[]>([]);
  const setDraftFlag = useCallback((key: string, value: boolean) => setDraftFlags(previous => value ? previous.includes(key) ? previous : [...previous, key] : previous.filter(flag => flag !== key)), []);
  const [batchMode, setBatchMode] = useState(false); const [batchIds, setBatchIds] = useState<string[]>([]);
  const selectedFolders = folderFilter ?? scopedFolders.map(folder => folder.id);
  const filtered = items.filter(item => selectedFolders.includes(item.folderId) && item.name.toLowerCase().includes(query.toLowerCase()));
  function reveal() { setVisible(previous => previous.includes('context') ? previous : [...previous, 'context']); }
  function open(item: BookItem) {
    if (dirty) { actions.setError('Save or discard your Context draft before opening another item.'); return; }
    setSelectedId(item.id); setCreating(false); reveal();
  }
  function add(plan: CalendarPlan = { kind: 'unplanned' }) {
    if (dirty) { actions.setError('Save or discard your Context draft before starting another item.'); return; }
    setSelectedId(null); setCreating(true); setCapturePlan(plan); reveal();
  }
  function applyView(view: WorkspaceView) { setVisible(panels.filter(panel => view.panels.includes(panel))); setFolderFilter(view.folders); setPeriod(view.period); setDate(view.date); setPlot(view.plot); setHours(view.hours); setLayout(view.layout); setClosed(view.closed); }
  function view(name: string): WorkspaceView { return { id: crypto.randomUUID(), name, panels: visible, folders: selectedFolders, period, date, plot, hours, layout, closed }; }
  useEffect(() => {
    if (!dirty && !draftFlags.length) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]'); if (!link || link.getAttribute('target') === '_blank') return;
      if (!window.confirm('Leave this page and discard your unsaved Book draft?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, draftFlags.length]);
  return { root, folders: scopedFolders, items, filtered, config, configError: !parsedConfig, actions, visible, setVisible, selectedFolders, setFolderFilter, query, setQuery, closed, setClosed, layout, setLayout, period, setPeriod, date, setDate, plot, setPlot, hours, setHours, selected: items.find(item => item.id === selectedId) ?? null, creating, setCreating, setSelectedId, capturePlan, dirty, setDirty, setDraftFlag, open, add, applyView, view, batchMode, setBatchMode, batchIds, setBatchIds, loading: store.isLoading || store.lastFetched === null, error: store.error, orgId, userId, rootFolderId };
}
export type BookWorkspaceModel = ReturnType<typeof useBookWorkspace>;
