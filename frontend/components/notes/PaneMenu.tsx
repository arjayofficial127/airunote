'use client';
import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { NotesIcon } from './NotesIcon';

export function PaneMenu({ label, active = false, trigger, above = false, keepFocus = false, children }: {
  label: string; active?: boolean; trigger?: ReactNode; above?: boolean; keepFocus?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const anchor = triggerRef.current;
    const menu = panel.current;
    if (!open || !anchor || !menu) return;
    function position() {
      if (!anchor || !menu) return;
      const box = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 8;
      const leftEdge = Math.max(anchor.closest('.airunote-notes')?.getBoundingClientRect().left ?? 0, viewport?.offsetLeft ?? 0) + 8;
      const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - 8;
      const up = Math.max(0, box.top - top - 6);
      const down = Math.max(0, bottom - box.bottom - 6);
      const menuAbove = above ? up > 96 || up >= down : menu.scrollHeight > down && up > down;
      const available = menuAbove ? up : down;
      menu.style.maxHeight = `${available}px`;
      menu.style.left = `${Math.max(leftEdge, Math.min(box.right - menu.offsetWidth, right - menu.offsetWidth))}px`;
      menu.style.top = `${menuAbove ? box.top - 6 - menu.offsetHeight : box.bottom + 6}px`;
    }
    position();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', position);
    viewport?.addEventListener('scroll', position);
    window.addEventListener('resize', position);
    return () => {
      viewport?.removeEventListener('resize', position);
      viewport?.removeEventListener('scroll', position);
      window.removeEventListener('resize', position);
    };
  }, [above, open]);
  function preserveEditorFocus(event: MouseEvent) {
    if (keepFocus && document.activeElement?.classList.contains('tiptap')) event.preventDefault();
  }
  return <details ref={ref} className="ab-popover an-pane-menu" onToggle={() => setOpen(!!ref.current?.open)}>
    <summary ref={triggerRef} aria-label={label} title={label} data-active={active} onMouseDown={preserveEditorFocus}>{trigger ?? <NotesIcon name="more"/>}{active && <i/>}</summary>
    <div ref={panel} style={{ position: 'fixed' }} onMouseDown={preserveEditorFocus} onClick={event => {
    if (event.target instanceof Element && event.target.closest('button[data-menu-action]')) ref.current!.open = false;
  }}>{children}</div></details>;
}
