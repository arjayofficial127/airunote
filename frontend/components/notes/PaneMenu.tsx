'use client';
import { useRef, useState, type ReactNode } from 'react';
import { NotesIcon } from './NotesIcon';

export function PaneMenu({ label, active = false, trigger, children }: { label: string; active?: boolean; trigger?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 400 });
  return <details ref={ref} className="ab-popover an-pane-menu" onToggle={() => {
    if (!ref.current?.open) return;
    const box = ref.current.querySelector('summary')!.getBoundingClientRect();
    const leftEdge = ref.current.closest('.airunote-notes')?.getBoundingClientRect().left ?? 0;
    setPosition({ left: Math.max(leftEdge + 8, Math.min(box.right - 260, innerWidth - 268)), top: Math.min(box.bottom + 5, innerHeight - 220), maxHeight: Math.max(180, innerHeight - box.bottom - 20) });
  }}><summary aria-label={label} title={label} data-active={active}>{trigger ?? <NotesIcon name="more"/>}{active && <i/>}</summary><div style={{ position: 'fixed', ...position }} onClick={event => {
    if (event.target instanceof Element && event.target.closest('button[data-menu-action]')) ref.current!.open = false;
  }}>{children}</div></details>;
}
