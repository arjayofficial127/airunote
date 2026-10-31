'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import './workspace-focus.css';

interface FocusState { focused: boolean; toggle: () => void }
const FocusContext = createContext<FocusState | null>(null);

/** Presentation only: keep the mounted workspace and its drafts intact. */
export function WorkspaceFocusFrame({ enabled, children, appRail = false, notesHome = false }: { enabled: boolean; children: ReactNode; appRail?: boolean; notesHome?: boolean }) {
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!enabled) setFocused(false); }, [enabled]);
  useEffect(() => {
    if (!focused) return;
    const escapeFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if (document.querySelector('[role="dialog"],[role="alertdialog"],dialog[open]')) return;
      setFocused(false);
    };
    window.addEventListener('keydown', escapeFocus);
    return () => window.removeEventListener('keydown', escapeFocus);
  }, [focused]);
  const value = useMemo(() => ({ focused: focused && enabled, toggle: () => setFocused(current => !current) }), [focused, enabled]);
  return <FocusContext.Provider value={enabled ? value : null}>
    <div className="workspace-focus-shell h-screen bg-gray-50 flex flex-col overflow-hidden" data-workspace-focus={value.focused ? 'on' : 'off'} data-app-rail={appRail ? 'on' : 'off'} data-notes-home={notesHome ? 'on' : 'off'}>{children}</div>
  </FocusContext.Provider>;
}

export function WorkspaceFocusButton() {
  const focus = useContext(FocusContext);
  if (!focus) return null;
  return <button type="button" onClick={focus.toggle} aria-pressed={focus.focused}
    className="workspace-focus-button" title={focus.focused ? 'Restore navigation (Escape)' : 'Hide navigation for more working space'}>
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={focus.focused ? 'M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5' : 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5'} /></svg>
    {focus.focused ? 'Exit focus' : 'Focus'}
  </button>;
}
