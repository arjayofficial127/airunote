import { daySchema, readPlanning, record } from './contract';

export function dailyNoteNames(date: string) {
  const day = new Date(`${daySchema.parse(date)}T12:00:00Z`);
  const full = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(day);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(day);
  return [full, `${date} · ${weekday}`];
}

/** Recognize the previous scheduled date-title format without changing ordinary notes. */
export function dailyNoteDate(document: { type: string; name: string; attributes: unknown }): string | null {
  if (document.type !== 'MD') return null;
  const marker = record(record(document.attributes).airunoteDaily).date;
  if (marker !== undefined) {
    const parsed = daySchema.safeParse(marker);
    return parsed.success ? parsed.data : null;
  }
  const planning = readPlanning(document.attributes);
  if (planning?.kind !== 'note' || planning.plan.kind !== 'day') return null;
  return dailyNoteNames(planning.plan.date).includes(document.name) ? planning.plan.date : null;
}

export function dailyNoteHeading(name: string, date: string) {
  if (!dailyNoteNames(date).includes(name)) return name;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}
