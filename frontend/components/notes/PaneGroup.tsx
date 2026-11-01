'use client';
import { type ReactNode } from 'react';
import { PaneHeading } from '@/components/book/PaneHeading';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

export function PaneGroup({ title, panel, model, count, layout, onLayout, children, actions, compact = false }: {
  title: string; panel: 'organizer' | 'calendar'; model: BookWorkspaceModel; count: number;
  layout: 'row' | 'grid'; onLayout: (value: 'row' | 'grid') => void;
  children: ReactNode; actions: ReactNode; compact?: boolean;
}) {
  return <section className="ab-pane an-pane-group" data-compact={compact} hidden={!model.shownPanels.includes(panel)} aria-label={title}>
    <PaneHeading title={title} panel={panel} model={model} count={count}>
      {!compact && <select aria-label={`${title} layout`} value={layout} onChange={event => onLayout(event.target.value === 'grid' ? 'grid' : 'row')}><option value="row">1 × 4</option><option value="grid">2 × 2</option></select>}{actions}
    </PaneHeading>
    <div className="an-pane-grid" data-layout={layout} data-pane-count={count}>{children}</div>
  </section>;
}
