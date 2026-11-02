'use client';
import { createContext, useContext, useEffect, useRef } from 'react';

export type EditorControls = { save: () => Promise<boolean>; discard: () => void };
export type EditorSession = {
  register: (controls: EditorControls) => () => void;
  saved: (id: string) => void;
  discarded: () => void;
};
export const EditorSessionContext = createContext<EditorSession | null>(null);
/** Optional tab lifecycle. Standalone Book editors retain their existing behavior. */
export function useEditorSession(controls: EditorControls) {
  const session = useContext(EditorSessionContext);
  const latest = useRef(controls); latest.current = controls;
  useEffect(() => session?.register({ save: () => latest.current.save(), discard: () => latest.current.discard() }), [session]);
  return session;
}
