import { z } from 'zod';
import { checklistSchema } from '@/lib/book';
import type { DailySnapshot } from './mergeDailyNote';

export const dailySnapshotSchema = z.object({
  checklist: checklistSchema, content: z.string().max(1000000),
  reflection: z.string().max(19986).default(''),
});
const draftSchema = dailySnapshotSchema.extend({
  step: z.string().max(2000).default(''), base: z.string(), expected: z.string().datetime(),
  slot: z.string().uuid().optional(), changedAt: z.number().default(0),
});
type Draft = z.infer<typeof draftSchema>;
type Checkpoint = { key: string; raw: string };

export function dailySnapshotKey({ content, checklist, reflection }: DailySnapshot) {
  return JSON.stringify({ checklist: checklist.map(({ id, text, done, dueDate }) => ({ id, text, done, dueDate })), content, reflection });
}

function decode(raw: string | null) {
  if (!raw) return;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch { /* Ignore an unreadable checkpoint. */ }
}

export function dailyDraftStorage(key: string) {
  // Each editor writes its own slot, so one tab cannot clear another tab's draft.
  const slot = crypto.randomUUID();
  const prefix = key + ':';
  const slotKey = prefix + slot;
  let recovered: Checkpoint | undefined;
  let written: Checkpoint | undefined;
  let lastWrite: { data: Omit<Draft, 'slot' | 'changedAt'>; durable: boolean } | undefined;

  function clear(record: Checkpoint | undefined) {
    try {
      if (record && localStorage.getItem(record.key) === record.raw) localStorage.removeItem(record.key);
    } catch { /* Storage access can be disabled by the browser. */ }
  }

  return {
    restore() {
      recovered = undefined;
      // Prefer the current tab's checkpoint, including drafts written by older builds.
      let inTab: Draft | undefined;
      let onDevice: Draft | undefined;
      try { inTab = decode(sessionStorage.getItem(key)); } catch { /* Try device storage. */ }
      try {
        if (inTab?.slot) {
          const sourceKey = prefix + inTab.slot;
          const raw = localStorage.getItem(sourceKey);
          const stored = decode(raw);
          if (raw && stored && stored.changedAt === inTab.changedAt) recovered = { key: sourceKey, raw };
        } else if (!inTab) {
          for (let i = 0; i < localStorage.length; i++) {
            const sourceKey = localStorage.key(i);
            if (!sourceKey?.startsWith(prefix)) continue;
            const raw = localStorage.getItem(sourceKey);
            const draft = decode(raw);
            if (raw && draft && (!onDevice || draft.changedAt > onDevice.changedAt)) {
              recovered = { key: sourceKey, raw };
              onDevice = draft;
            }
          }
        }
      } catch { /* The tab checkpoint may still be available. */ }
      const draft = inTab ?? onDevice;
      if (!draft) return;
      let base = draft.base;
      try {
        const parsed = dailySnapshotSchema.safeParse(JSON.parse(base));
        if (parsed.success) base = dailySnapshotKey(parsed.data);
      } catch { /* Preserve an older draft for manual recovery. */ }
      return { draft: { ...draft, base }, reopened: !inTab };
    },
    write(data: Omit<Draft, 'slot' | 'changedAt'>) {
      const previous = lastWrite?.data;
      if (lastWrite?.durable && previous?.checklist === data.checklist && previous.content === data.content
        && previous.reflection === data.reflection && previous.base === data.base && previous.expected === data.expected) return true;
      const raw = JSON.stringify({ ...data, slot, changedAt: Date.now() });
      let durable = false;
      try {
        localStorage.setItem(slotKey, raw);
        written = { key: slotKey, raw };
        clear(recovered);
        recovered = undefined;
        durable = true;
      } catch { /* Fall back to the current tab if device storage is full or unavailable. */ }
      try { sessionStorage.setItem(key, raw); } catch { /* The editor still holds the draft in memory. */ }
      lastWrite = { data, durable };
      return durable;
    },
    clear() {
      clear(written);
      clear(recovered);
      written = recovered = undefined;
      lastWrite = undefined;
      try { sessionStorage.removeItem(key); } catch { /* Storage access can be disabled. */ }
    },
  };
}
