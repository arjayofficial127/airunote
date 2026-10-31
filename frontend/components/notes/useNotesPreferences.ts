'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { today } from '@/components/book/domain';
const preferencesSchema = z.object({
  folderId: z.string(), focusId: z.string().nullable(), viewId: z.string(), asList: z.boolean(),
  selectedId: z.string().nullable(), visible: z.array(z.enum(['inbox', 'organizer', 'calendar', 'context'])),
  expandedPanel: z.enum(['inbox', 'organizer', 'calendar', 'context']).nullable(),
  theme: z.enum(['light', 'dark']), pinned: z.boolean(), closed: z.boolean(), collapsedFolders: z.array(z.string()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(`${value}T12:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }), period: z.enum(['day', 'week', 'sprint', 'month', 'year', 'unplanned']),
  plot: z.enum(['items', 'projects', 'hours']), hours: z.enum(['24', '12', '8']), savedOn: z.string(),
});
export type NotesPreferences = z.infer<typeof preferencesSchema>;
export function useNotesPreferences(key: string, loading: boolean, value: Omit<NotesPreferences, 'savedOn'>, restore: (value: NotesPreferences) => void) {
  const [ready, setReady] = useState(false); const restored = useRef(false);
  const restoreRef = useRef(restore); restoreRef.current = restore;
  const serialized = JSON.stringify({ ...value, savedOn: today() });
  useEffect(() => {
    if (loading || restored.current) return;
    restored.current = true;
    try { const parsed = preferencesSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null')); if (parsed.success) restoreRef.current(parsed.data); } catch { /* Use defaults if storage is unavailable. */ }
    setReady(true);
  }, [key, loading]);
  useEffect(() => { if (ready) { try { localStorage.setItem(key, serialized); } catch { /* Preferences are optional. */ } } }, [key, ready, serialized]);
  return ready;
}
