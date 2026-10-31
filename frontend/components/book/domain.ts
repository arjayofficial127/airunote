import type { AiruFolder, AiruDocumentMetadata } from '@/components/airunote/types';
import { readPlanning, defaultPlanning, type BookPlanning, type CalendarPlan, type BookConfig } from '@/lib/book';

export type BookItem = AiruDocumentMetadata & { planning: BookPlanning; invalidPlanning: boolean };
export type Panel = 'inbox' | 'organizer' | 'calendar' | 'context';
export type Period = 'day' | 'week' | 'sprint' | 'month' | 'year' | 'unplanned';
export type Plot = 'items' | 'projects' | 'hours';
export const panels: Panel[] = ['inbox', 'organizer', 'calendar', 'context'];
export function folderLabel(name: string | null | undefined) { return !name || name === '__user_root__' ? 'Home' : name; }
export function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value ?? '').join('-');
}
export function addDays(day: string, count: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); }
export function monday(day: string) { return addDays(day, -(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7); }
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) { return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)); }
export function daysInMonth(month: string) { const start = `${month}-01`; const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(); return Array.from({ length: end }, (_, i) => addDays(start, i)); }
export function monthName(month: string) { return formatDay(`${month}-01`, { month: 'long' }); }
export function monthShift(day: string, count: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + count); return date.toISOString().slice(0, 10); }
export function subtree(folders: AiruFolder[], rootId: string): Set<string> {
  const ids = new Set([rootId]); let changed = true;
  while (changed) { changed = false; for (const folder of folders) if (!ids.has(folder.id) && ids.has(folder.parentFolderId)) { ids.add(folder.id); changed = true; } }
  return ids;
}
export function bookItems(documents: AiruDocumentMetadata[], ids: Set<string>, userId: string): BookItem[] {
  return documents.filter(document => ids.has(document.folderId) && document.ownerUserId === userId && document.state === 'active').map(document => {
    const planning = readPlanning(document.attributes);
    return { ...document, planning: planning ?? defaultPlanning(), invalidPlanning: planning === null };
  });
}
export function planRange(plan: CalendarPlan, config: BookConfig): { start: string; end: string } | null {
  if (plan.kind === 'day') return { start: plan.date, end: plan.date };
  if (plan.kind === 'week') return { start: plan.start, end: addDays(plan.start, 6) };
  if (plan.kind === 'month') { const days = daysInMonth(plan.month); return { start: `${plan.month}-01`, end: days[days.length - 1] ?? `${plan.month}-01` }; }
  if (plan.kind === 'year') return { start: `${plan.year}-01-01`, end: `${plan.year}-12-31` };
  if (plan.kind === 'sprint') { const sprint = config.sprints.find(candidate => candidate.id === plan.sprintId); return sprint ? { start: sprint.start, end: sprint.end } : null; }
  return null;
}
export function planLabel(plan: CalendarPlan, config: BookConfig): string {
  switch (plan.kind) {
    case 'unplanned': return 'Unplanned';
    case 'day': return `${formatDay(plan.date)}${plan.time ? ` · ${plan.time}` : ''}${plan.duration ? ` · ${plan.duration} min` : ''}`;
    case 'week': return `Week of ${formatDay(plan.start)}`;
    case 'month': return `${monthName(plan.month)} ${plan.month.slice(0, 4)}`;
    case 'year': return String(plan.year);
    case 'sprint': return config.sprints.find(sprint => sprint.id === plan.sprintId)?.name ?? 'Unavailable sprint';
  }
}
export function sortItems(items: BookItem[]) {
  return [...items].sort((a, b) => {
    const ap = a.planning.plan; const bp = b.planning.plan;
    const av = ap.kind === 'day' ? `${ap.date}:${ap.time ?? ''}` : '';
    const bv = bp.kind === 'day' ? `${bp.date}:${bp.time ?? ''}` : '';
    return av.localeCompare(bv) || a.name.localeCompare(b.name);
  });
}
export function emptyDayRanges(days: string[], populated: Set<string>): Array<{ start: string; end: string; populated: boolean }> {
  const result: Array<{ start: string; end: string; populated: boolean }> = [];
  for (const day of days) { const last = result[result.length - 1]; if (!populated.has(day) && last && !last.populated) last.end = day; else result.push({ start: day, end: day, populated: populated.has(day) }); }
  return result;
}
