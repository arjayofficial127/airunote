'use client';
import { useEffect, type RefObject } from 'react';

export function useNotesPopovers(container: RefObject<HTMLDivElement>) {
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      const target = event.target;
      container.current?.querySelectorAll<HTMLDetailsElement>('details.ab-popover[open]').forEach(menu => {
        if (!menu.contains(target)) menu.open = false;
      });
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      container.current?.querySelectorAll<HTMLDetailsElement>('details.ab-popover[open]').forEach(menu => {
        const restoreFocus = menu.contains(document.activeElement);
        menu.open = false;
        if (restoreFocus) { event.preventDefault(); menu.querySelector<HTMLElement>('summary')?.focus(); }
      });
    }
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', closeOutside, true); document.removeEventListener('keydown', escape); };
  }, [container]);
}
