import { initialPanes, type LensPane, type NotesPanes } from './panes';

/** Folder navigation reuses one tab per explicit pane; named resources have stable identities. */
export function destinationKey(pane: LensPane): string {
  if (pane.viewId === 'agenda') return 'plan';
  if (pane.viewId === 'calendar') return 'calendar';
  if (pane.viewId.startsWith('collection:')) return pane.viewId;
  return pane.destinationId ?? `folder:${pane.id}`;
}
export function rememberDestinations(state: NotesPanes): NotesPanes {
  if (state.destinationsClosed) return state;
  const seen = new Set<string>();
  // Older layouts could show several copies of a calendar. Keep one workspace tool.
  state = { ...state, lenses: state.lenses.map(pane => {
    const key = destinationKey(pane);
    if (seen.has(key)) return { ...pane, viewId: 'box', destinationId: `folder:${pane.id}` };
    seen.add(key); return pane;
  }) };
  const tabs = [...new Map(state.destinations.map(tab => [tab.key, tab])).values()];
  for (const pane of state.lenses) {
    const key = destinationKey(pane), index = tabs.findIndex(tab => tab.key === key);
    if (index < 0) tabs.push({ key, pane }); else tabs[index] = { key, pane };
  }
  return { ...state, destinations: tabs, activeLens: state.lenses.some(pane => pane.id === state.activeLens) ? state.activeLens : state.lenses[0]?.id };
}
export function openDestination(state: NotesPanes, key: string, next: LensPane, preferredPane?: string): NotesPanes {
  const saved = rememberDestinations(state);
  const existing = saved.lenses.find(pane => destinationKey(pane) === key);
  if (existing && !state.destinationsClosed) return { ...saved, activeLens: existing.id };
  const target = saved.lenses.find(pane => pane.id === preferredPane && !pane.frozen)
    ?? saved.lenses.find(pane => pane.id === saved.activeLens && !pane.frozen) ?? saved.lenses.find(pane => !pane.frozen);
  if (!target) return state;
  const restored = { ...(saved.destinations.find(tab => tab.key === key)?.pane ?? next), folderId: next.folderId };
  return rememberDestinations({ ...saved, destinationsClosed: false, activeLens: target.id,
    lenses: saved.lenses.map(pane => pane.id === target.id ? { ...restored, id: target.id, frozen: false, destinationId: key.startsWith('folder:') ? key : undefined } : pane) });
}
export function closeDestination(state: NotesPanes, key: string, root: string): NotesPanes {
  const index = state.destinations.findIndex(tab => tab.key === key);
  const destinations = state.destinations.filter(tab => tab.key !== key);
  const visible = state.lenses.find(pane => destinationKey(pane) === key);
  if (!visible) return { ...state, destinations };
  const sibling = state.lenses.find(pane => pane.id !== visible.id);
  if (sibling) return { ...state, destinations, lenses: state.lenses.filter(pane => pane.id !== visible.id), activeLens: sibling.id, lensWidth: null };
  const next = destinations[Math.min(index, destinations.length - 1)];
  return { ...state, destinations, activeLens: visible.id, destinationsClosed: !next,
    lenses: [{ ...(next?.pane ?? initialPanes(root).lenses[0]!), id: visible.id, destinationId: next?.key.startsWith('folder:') ? next.key : undefined }] };
}
export function reorderDestination(state: NotesPanes, key: string, offset: number): NotesPanes {
  const destinations = [...state.destinations], from = destinations.findIndex(tab => tab.key === key), to = from + offset;
  if (from < 0 || to < 0 || to >= destinations.length) return state;
  [destinations[from], destinations[to]] = [destinations[to]!, destinations[from]!];
  return { ...state, destinations };
}
