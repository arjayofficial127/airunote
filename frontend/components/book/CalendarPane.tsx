'use client';
import { useState } from 'react';
import type { CalendarPlan } from '@/lib/book';
import { addDays, daysInMonth, formatDay, monday, monthShift, planRange, today, type Period, type BookItem } from './domain';
import { CalendarDay, CalendarRows } from './CalendarRows';
import { DropZone } from './BookDrag';
import { HoursCalendar } from './HoursCalendar';
import { YearCalendar } from './YearCalendar';
import { SprintControls } from './SprintControls';
import type { BookWorkspaceModel } from './useBookWorkspace';

function Intentions({ model, plan, label, items }: { model: BookWorkspaceModel; plan: CalendarPlan; label: string; items: BookItem[] }) {
  return <DropZone id={`period:${JSON.stringify(plan)}`} target={{ kind: 'plan', plan }} className="ab-intentions"><details open><summary>{label} <span className="ab-count">{items.length}</span></summary><CalendarRows items={items} model={model} /></details><button className="ab-link" onClick={() => model.add(plan)}>+ Add intention</button></DropZone>;
}
export function CalendarPane({ model }: { model: BookWorkspaceModel }) {
  const [monthGrid, setMonthGrid] = useState(false); const [sprintId, setSprintId] = useState('');
  const week = monday(model.date); const month = model.date.slice(0, 7); const year = Number(model.date.slice(0, 4));
  const selectedSprint = model.config.sprints.find(sprint => sprint.id === sprintId);
  const periodPlan: CalendarPlan = model.period === 'week' ? { kind: 'week', start: week } : model.period === 'month' ? { kind: 'month', month } : model.period === 'year' ? { kind: 'year', year } : model.period === 'sprint' && selectedSprint ? { kind: 'sprint', sprintId } : { kind: 'unplanned' };
  const range = model.period === 'day' ? { start: model.date, end: model.date } : planRange(periodPlan, model.config);
  const items = model.filtered;
  const exactPlans = items.filter(item => JSON.stringify(item.planning.plan) === JSON.stringify(periodPlan));
  const overlapping = range ? items.filter(item => {
    if (['day', 'unplanned'].includes(item.planning.plan.kind) || exactPlans.some(exact => exact.id === item.id)) return false;
    const ownRange = planRange(item.planning.plan, model.config); return ownRange && ownRange.start <= range.end && ownRange.end >= range.start;
  }) : [];
  const dated = items.filter(item => item.planning.plan.kind === 'day' && range && item.planning.plan.date >= range.start && item.planning.plan.date <= range.end);
  function shift(direction: number) {
    if (model.period === 'month') model.setDate(monthShift(model.date, direction));
    else if (model.period === 'year') model.setDate(`${year + direction}-01-01`);
    else model.setDate(addDays(model.date, direction * (model.period === 'week' ? 7 : 1)));
  }
  const title = model.period === 'year' ? String(year) : model.period === 'month' ? formatDay(`${month}-01`, { month: 'long', year: 'numeric' }) : model.period === 'week' ? `${formatDay(week)} to ${formatDay(addDays(week, 6))} ${year}` : model.period === 'sprint' ? selectedSprint?.name ?? 'Choose a sprint' : model.period === 'unplanned' ? 'No calendar placement' : formatDay(model.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const plot = model.plot === 'hours' && !['day', 'week'].includes(model.period) ? 'items' : model.plot;
  return <section className="ab-pane ab-calendar" hidden={!model.visible.includes('calendar')} aria-label="03 Calendar"><header><h2><small>03</small> Calendar</h2><small>Singapore time</small></header>
    <div className="ab-calendar-toolbar"><select aria-label="Calendar period" value={model.period} onChange={event => { const period = ['day', 'week', 'sprint', 'month', 'year', 'unplanned'].find(value => value === event.target.value); if (period) model.setPeriod(period as Period); }}><option value="day">Day</option><option value="week">Week</option><option value="sprint">Sprint</option><option value="month">Month</option><option value="year">Year</option><option value="unplanned">Unplanned</option></select>{!['sprint', 'unplanned'].includes(model.period) && <button aria-label="Previous period" onClick={() => shift(-1)}>←</button>}<strong>{title}</strong>{!['sprint', 'unplanned'].includes(model.period) && <button aria-label="Next period" onClick={() => shift(1)}>→</button>}<button className="ab-link" onClick={() => model.setDate(today())}>Today</button><button aria-label="Add calendar entry" onClick={() => model.add(model.period === 'day' ? { kind: 'day', date: model.date, time: null, duration: null } : periodPlan)}>+</button><select aria-label="Calendar display" value={plot} onChange={event => model.setPlot(event.target.value === 'projects' ? 'projects' : event.target.value === 'hours' ? 'hours' : 'items')}><option value="items">Items</option><option value="projects">Projects</option>{['day', 'week'].includes(model.period) && <option value="hours">Hours</option>}</select></div>
    {model.period === 'sprint' && <SprintControls model={model} selected={sprintId} onSelect={setSprintId} />}
    {model.period === 'month' && <div className="ab-organizer-tools"><button aria-pressed={!monthGrid} onClick={() => setMonthGrid(false)}>Agenda</button><button aria-pressed={monthGrid} onClick={() => setMonthGrid(true)}>Grid</button></div>}
    <div className="ab-scroll ab-calendar-body">
      {['week', 'month', 'year'].includes(model.period) || (model.period === 'sprint' && selectedSprint) ? <Intentions model={model} plan={periodPlan} label={model.period === 'week' ? 'Any day this week' : model.period === 'month' ? 'Any day this month' : model.period === 'year' ? 'Any time this year' : 'Any time this sprint'} items={exactPlans} /> : null}
      {overlapping.length > 0 && model.period !== 'year' && <details className="ab-overlapping"><summary>Other overlapping period plans · {overlapping.length}</summary><CalendarRows model={model} items={overlapping} /></details>}
      {model.period === 'unplanned' && <DropZone id="ab-unplanned" target={{ kind: 'plan', plan: { kind: 'unplanned' } }} className="ab-calendar-day"><CalendarRows model={model} items={items.filter(item => item.planning.plan.kind === 'unplanned')} />{!exactPlans.length && <p className="ab-empty">No unplanned items.</p>}</DropZone>}
      {plot === 'hours' && ['day', 'week'].includes(model.period) ? <HoursCalendar model={model} items={dated} /> : <>
        {model.period === 'day' && <CalendarDay date={model.date} model={model} items={dated} />}
        {model.period === 'week' && Array.from({ length: 7 }, (_, index) => addDays(week, index)).map(date => <CalendarDay key={date} model={model} date={date} items={dated.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.date === date)} />)}
        {model.period === 'month' && <div className={monthGrid ? 'ab-month-grid' : ''}>{monthGrid && Array.from({ length: (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7 }, (_, index) => <div key={`blank:${index}`} />)}{daysInMonth(month).filter(date => monthGrid || dated.some(item => item.planning.plan.kind === 'day' && item.planning.plan.date === date)).map(date => <CalendarDay prefix="month" key={date} model={model} date={date} items={dated.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.date === date)} />)}{!monthGrid && !dated.length && <p className="ab-empty">No exact dates in this month. Use Grid to choose a day.</p>}</div>}
        {model.period === 'year' && <YearCalendar model={model} items={items} />}
        {model.period === 'sprint' && selectedSprint && <><small>{selectedSprint.start} to {selectedSprint.end}{selectedSprint.closed ? ' · Closed' : ''}</small><CalendarRows model={model} items={dated} /><button className="ab-link" disabled={model.actions.busy} onClick={() => void model.actions.configure({ ...model.config, sprints: model.config.sprints.map(sprint => sprint.id === selectedSprint.id ? { ...sprint, closed: !sprint.closed } : sprint) })}>{selectedSprint.closed ? 'Reopen sprint' : 'Close sprint'}</button></>}
      </>}
    </div>
    <footer><small>Plans stay where you place them. Nothing rolls forward automatically.</small></footer>
  </section>;
}
