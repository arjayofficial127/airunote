'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** A small, nonmodal sidebar popover. Position stays within the viewport, even on phones. */
export function RailPopover({ label, trigger, children, className = '' }: { label: string; trigger: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const id = useId();
  function close(restore = true) { setOpen(false); if (restore) button.current?.focus(); }
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!button.current || !panel.current) return;
      const anchor = button.current.getBoundingClientRect(), box = panel.current.getBoundingClientRect();
      panel.current.style.left = `${Math.max(8, Math.min(anchor.right + 8, innerWidth - box.width - 8))}px`;
      panel.current.style.top = `${Math.max(8, Math.min(anchor.top, innerHeight - box.height - 8))}px`;
    };
    position();
    const observer = new ResizeObserver(position); if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', position);
    panel.current?.querySelector<HTMLElement>('input,select,button,a[href]')?.focus();
    return () => { observer.disconnect(); window.removeEventListener('resize', position); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => { if (event.target instanceof Node && !panel.current?.contains(event.target) && !button.current?.contains(event.target)) close(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); close(); } };
    const another = () => close(false);
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', escape);
    window.addEventListener('airunote:rail-popover', another);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape); window.removeEventListener('airunote:rail-popover', another); };
  }, [open]);
  return <div className={`an-rail-control ${className}`}><button ref={button} className="an-rail-trigger" aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { if (open) close(); else { window.dispatchEvent(new Event('airunote:rail-popover')); setOpen(true); } }}>{trigger}</button>{open && <div ref={panel} id={id} role="dialog" aria-label={label} className="an-rail-popover">{children(() => close())}</div>}</div>;
}
