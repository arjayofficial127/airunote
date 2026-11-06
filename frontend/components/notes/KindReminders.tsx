'use client';
import { useEffect, useState } from 'react';
import { readKindDetails } from '@/lib/book';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
/** Local reminders only: no background delivery or notification permission is implied. */
export function KindReminders({ model }: { model: BookWorkspaceModel }) {
  const key = `airunote:reminder-dismissed:${model.orgId}:${model.userId}`;
  const [now, setNow] = useState(0), [dismissed, setDismissed] = useState<string[]>([]), [ready, setReady] = useState(false);
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); if (Array.isArray(saved)) setDismissed(saved.filter(value => typeof value === 'string').slice(-1000)); } catch { /* Optional storage. */ }
    setReady(true); setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer);
  }, [key]);
  if (!ready) return null;
  const reminder = model.items.map(item => ({ item, at: readKindDetails(item.attributes)?.reminderAt })).filter(({ item, at }) => item.planning.status === 'open' && at && Date.parse(at) <= now && Date.parse(at) > now - 86400000 && !dismissed.includes(item.id + ':' + at)).sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!))[0];
  if (!reminder) return null;
  function dismiss() { const next = [...dismissed.slice(-999), reminder!.item.id + ':' + reminder!.at]; setDismissed(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* The mounted reminder still dismisses. */ } }
  return <aside className="an-kind-reminder" aria-label="In-app reminder"><span><small>Reminder</small><strong>{reminder.item.name}</strong></span><button onClick={() => model.open(reminder.item)}>Open item</button><button onClick={dismiss}>Dismiss</button></aside>;
}
