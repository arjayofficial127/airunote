'use client';
import { useRef, type ReactNode } from 'react';
import { PaneHeading } from '@/components/book/PaneHeading';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

export function PaneGroup({ title, panel, model, count, layout, onLayout, width, onWidth, children, actions }: {
  title: string; panel: 'organizer' | 'calendar'; model: BookWorkspaceModel; count: number;
  layout: 'row' | 'grid'; onLayout: (value: 'row' | 'grid') => void;
  width: number | null; onWidth: (value: number) => void; children: ReactNode; actions: ReactNode;
}) {
  const group = useRef<HTMLElement>(null); const drag = useRef<{ x: number; width: number } | null>(null);
  const min = panel === 'organizer' ? 300 : 380;
  return <section ref={group} className="ab-pane an-pane-group" hidden={!model.shownPanels.includes(panel)} aria-label={title}>
    <PaneHeading title={title} panel={panel} model={model} count={count}>
      <select aria-label={`${title} layout`} value={layout} onChange={event => onLayout(event.target.value === 'grid' ? 'grid' : 'row')}><option value="row">1 × 4</option><option value="grid">2 × 2</option></select>{actions}
    </PaneHeading>
    <div className="an-pane-grid" data-layout={layout} data-pane-count={count}>{children}</div>
    <div role="separator" aria-label={`Resize ${title}`} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={4000} aria-valuenow={Math.round(width ?? group.current?.clientWidth ?? min)} tabIndex={0} className="an-group-resize"
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onWidth(Math.max(min, Math.min(4000, (group.current?.clientWidth ?? min) + (event.key === 'ArrowRight' ? 40 : -40)))); } }}
      onPointerDown={event => { drag.current = { x: event.clientX, width: group.current?.clientWidth ?? min }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) onWidth(Math.max(min, Math.min(4000, drag.current.width + event.clientX - drag.current.x))); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
  </section>;
}
