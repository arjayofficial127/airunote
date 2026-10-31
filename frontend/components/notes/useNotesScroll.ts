'use client';
import { useLayoutEffect, useRef, type RefObject, type UIEvent } from 'react';
export function useNotesScroll(container: RefObject<HTMLDivElement>, storageKey: string, ready: boolean, location: string) {
  const positions = useRef<Record<string, { top: number; left: number }>>({});
  const active = useRef(false);
  useLayoutEffect(() => {
    if (!ready) return;
    active.current = false;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(`${storageKey}:scroll`) ?? '{}');
      if (saved && typeof saved === 'object') for (const [key, value] of Object.entries(saved)) {
        if (value && typeof value === 'object' && 'top' in value && 'left' in value && typeof value.top === 'number' && typeof value.left === 'number') positions.current[key] = { top: value.top, left: value.left };
      }
    } catch { /* Scroll memory is optional. */ }
    const frame = requestAnimationFrame(() => {
      for (const element of [container.current, ...Array.from(container.current?.querySelectorAll<HTMLElement>('[data-scroll-key]') ?? [])]) {
        if (!element) continue;
        const key = element.dataset.scrollKey ?? 'panes'; const position = positions.current[`${key === 'inbox' || key === 'folders' ? 'shared' : location}:${key}`];
        if (position) element.scrollTo({ top: position.top, left: position.left });
      }
      active.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [container, storageKey, ready, location]);
  return (event: UIEvent<HTMLDivElement>) => {
    if (!active.current || !(event.target instanceof HTMLElement)) return;
    const element = event.target; const key = element === container.current ? 'panes' : element.dataset.scrollKey;
    if (!key) return;
    positions.current[`${key === 'inbox' || key === 'folders' ? 'shared' : location}:${key}`] = { top: element.scrollTop, left: element.scrollLeft };
    try { sessionStorage.setItem(`${storageKey}:scroll`, JSON.stringify(positions.current)); } catch { /* Keep scrolling without persistence. */ }
  };
}
