'use client';
import { CalendarDay, CalendarRows } from './CalendarRows';
import { daysInMonth, emptyDayRanges, formatDay, monthName, planRange, type BookItem } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function YearCalendar({ model, items }: { model: BookWorkspaceModel; items: BookItem[] }) {
  const year = model.date.slice(0, 4);
  return <div className="ab-year">{Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`).map(month => {
    const dated = items.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.date.startsWith(month));
    const plans = items.filter(item => {
      if (['day', 'year', 'unplanned'].includes(item.planning.plan.kind)) return false;
      const range = planRange(item.planning.plan, model.planningConfig);
      return range !== null && range.start <= `${month}-31` && range.end >= `${month}-01`;
    });
    const populated = new Set(dated.flatMap(item => item.planning.plan.kind === 'day' ? [item.planning.plan.date] : []));
    return <section key={month}><h3><button className="ab-link" onClick={() => { model.setDate(`${month}-01`); model.setPeriod('month'); }}>{monthName(month)}</button></h3>{plans.length > 0 && <div className="ab-period-plans"><small>Period intentions, including overlapping weeks and sprints</small><CalendarRows items={plans} model={model} /></div>}{dated.length > 0 && emptyDayRanges(daysInMonth(month), populated).map(range => range.populated ? <CalendarDay key={range.start} prefix="year" date={range.start} model={model} items={dated.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.date === range.start)} /> : <p key={range.start} className="ab-empty-range">{formatDay(range.start)}{range.end !== range.start ? ` to ${formatDay(range.end)}` : ''}</p>)}</section>;
  })}</div>;
}
