'use client';
import { addDays, monday, today } from './domain';
import type { CalendarPlan, BookConfig } from '@/lib/book';
export function PlanningEditor({ plan, onChange, config }: { plan: CalendarPlan; onChange: (plan: CalendarPlan) => void; config: BookConfig }) {
  const date = plan.kind === 'day' ? plan.date : today();
  return <div className="ab-planning-editor"><label>Calendar bucket<select aria-label="Calendar bucket" value={plan.kind} onChange={event => {
    const kind = event.target.value;
    if (kind === 'day') onChange({ kind, date, time: null, duration: null });
    else if (kind === 'week') onChange({ kind, start: monday(date) });
    else if (kind === 'month') onChange({ kind, month: date.slice(0, 7) });
    else if (kind === 'year') onChange({ kind, year: Number(date.slice(0, 4)) });
    else if (kind === 'sprint' && config.sprints[0]) onChange({ kind, sprintId: config.sprints[0].id });
    else onChange({ kind: 'unplanned' });
  }}><option value="unplanned">Unplanned</option><option value="day">Day</option><option value="week">Week</option><option value="sprint" disabled={!config.sprints.length}>Sprint</option><option value="month">Month</option><option value="year">Year</option></select></label>
    {plan.kind === 'day' && <><label>Day<input aria-label="Planning date" type="date" required value={plan.date} onChange={event => onChange({ ...plan, date: event.target.value })} /></label><div className="ab-form-pair"><label>Time<input type="time" value={plan.time ?? ''} onChange={event => onChange({ ...plan, time: event.target.value || null, duration: event.target.value ? plan.duration : null })} /></label><label>Minutes<input type="number" min={1} max={1440} disabled={!plan.time} value={plan.duration ?? ''} onChange={event => onChange({ ...plan, duration: event.target.value ? Number(event.target.value) : null })} /></label></div><small>Singapore time. A missing duration stays unknown.</small></>}
    {plan.kind === 'week' && <label>Week containing<input type="date" required value={plan.start} onChange={event => { if (event.target.value) onChange({ ...plan, start: monday(event.target.value) }); }} /><small>Monday through Sunday, ending {addDays(plan.start, 6)}</small></label>}
    {plan.kind === 'month' && <label>Month<input type="month" required value={plan.month} onChange={event => onChange({ ...plan, month: event.target.value })} /></label>}
    {plan.kind === 'year' && <label>Year<input type="number" min={1900} max={9999} required value={plan.year} onChange={event => onChange({ ...plan, year: Number(event.target.value) })} /></label>}
    {plan.kind === 'sprint' && <label>Sprint<select value={plan.sprintId} onChange={event => onChange({ ...plan, sprintId: event.target.value })}>{config.sprints.map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.name}{sprint.closed ? ' (closed)' : ''}</option>)}</select></label>}
  </div>;
}
