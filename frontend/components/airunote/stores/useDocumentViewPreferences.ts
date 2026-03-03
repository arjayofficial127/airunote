/**
 * Document View Preferences Store
 * UI-level store for global default view mode
 * Separate from domain store (airunoteStore)
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode } from '@/lib/api/airunoteLensesApi';

interface DocumentViewPreferencesState {
  globalDefaultView: ViewMode;
  setGlobalDefaultView: (mode: ViewMode) => void;
}

const STORAGE_KEY = 'airunote_globalViewMode';

export const useDocumentViewPreferences = create<DocumentViewPreferencesState>()(
  persist(
    (set) => ({
      globalDefaultView: 'list',
      setGlobalDefaultView: (mode: ViewMode) => {
        set({ globalDefaultView: mode });
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
