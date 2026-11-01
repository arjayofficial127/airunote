'use client';
import { useEffect, useState, type RefObject } from 'react';
import type { Panel } from '@/components/book/domain';
import type { NotesModel } from './useNotesWorkspace';
import { allocateWidths, resizeWidths, type PaneWidths } from './workspaceLayout';

export function useWorkspaceSizing(notes: NotesModel, container: RefObject<HTMLDivElement>, visible: Panel[]) {
  const [available, setAvailable] = useState(0);
  const { workspace, setWorkspace } = notes;
  const focused = workspace.preset === 'cards';
  const compact = available > 0 && available <= 700;
  const paneLimit = focused && compact ? Math.max(220, available - 20) : Infinity;
  const minimum: PaneWidths = { inbox: 280, organizer: focused ? 260 : 300, calendar: 360, context: 360 };
  // Fit individual phone panes without replacing the user's desktop preferences.
  const preferred = { ...workspace.widths[workspace.preset] };
  for (const key of Object.keys(preferred) as Panel[]) {
    minimum[key] = Math.min(minimum[key], paneLimit);
    preferred[key] = Math.min(preferred[key], paneLimit);
  }
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setAvailable(element.clientWidth);
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    return () => observer.disconnect();
  }, [container]);
  const space = Math.max(0, available - Math.max(0, visible.length - 1) * (focused ? 10 : 1) - (focused ? 20 : 0));
  const widths = allocateWidths(visible, preferred, minimum, space, workspace.sizing === 'auto');
  if (notes.model.expandedPanel && visible.length === 1) { const key = visible[0]; if (key) widths[key] = Math.max(minimum[key], space); }
  function resize(key: Panel, value: number) {
    const next = resizeWidths(visible, widths, minimum, key, value, workspace.sizing === 'auto');
    const saved = workspace.sizing === 'auto' ? next : { [key]: next[key] };
    setWorkspace(previous => ({ ...previous, widths: { ...previous.widths, [previous.preset]: { ...previous.widths[previous.preset], ...saved } } }));
  }
  return { compact, widths, minimum, resize, style: { gridTemplateColumns: visible.map(key => widths[key] + 'px').join(' ') } };
}
