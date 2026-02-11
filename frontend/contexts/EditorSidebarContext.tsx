'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EditorSidebarContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const EditorSidebarContext = createContext<EditorSidebarContextValue | null>(null);

export function EditorSidebarProvider({ children }: { children: ReactNode }) {
  // On mobile, keep closed by default. On desktop, open by default.
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Only open on desktop
    }
    return false; // SSR default to closed
  });

  const toggle = () => setIsOpen(prev => !prev);

  return (
    <EditorSidebarContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </EditorSidebarContext.Provider>
  );
}

export function useEditorSidebar() {
  const context = useContext(EditorSidebarContext);
  if (!context) {
    throw new Error('useEditorSidebar must be used within EditorSidebarProvider');
  }
  return context;
}

