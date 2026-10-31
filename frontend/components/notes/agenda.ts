import { addDays, planRange, sortItems, type BookItem } from '@/components/book/domain';
import type { BookConfig } from '@/lib/book';
export function agendaGroups(items: BookItem[], date: string, config: BookConfig, closed: boolean) {
  const groups: Record<'today' | 'tomorrow' | 'later' | 'week' | 'earlier' | 'longer', BookItem[]> = { today: [], tomorrow: [], later: [], week: [], earlier: [], longer: [] };
  for (const item of sortItems(items)) {
    if (!closed && item.planning.status !== 'open') continue;
    const plan = item.planning.plan; if (plan.kind === 'unplanned') continue;
    const range = planRange(plan, config);
    if (range && range.end < date) groups.earlier.push(item);
    else if (plan.kind === 'day' && plan.date === date) groups.today.push(item);
    else if (plan.kind === 'day' && plan.date === addDays(date, 1)) groups.tomorrow.push(item);
    else if (range && range.start > date) groups.later.push(item);
    else if (plan.kind === 'week') groups.week.push(item);
    else groups.longer.push(item);
  }
  return groups;
}
