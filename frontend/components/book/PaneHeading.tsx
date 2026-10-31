'use client';
import type { ReactNode } from 'react';
import { panels, type Panel } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';

export function PaneHeading({ panel, model, count, children, title: label }: { panel: Panel; model: BookWorkspaceModel; count?: number; children?: ReactNode; title?: string }) {
  const title = label ?? `${panel[0]?.toUpperCase()}${panel.slice(1)}`;
  const expanded = model.expandedPanel === panel;
  return <header>
    <h2><small>0{panels.indexOf(panel) + 1}</small>{title}{count !== undefined && <span className="ab-count">{count}</span>}</h2>
    <div className="ab-pane-actions">{children}<button type="button" className="ab-expand" aria-label={`${expanded ? 'Restore' : 'Expand'} ${title} panel`} title={expanded ? 'Restore all panels' : `Expand ${title}`} aria-pressed={expanded} onClick={() => model.setExpandedPanel(expanded ? null : panel)}>{expanded ? '↙' : '↗'}</button></div>
  </header>;
}
