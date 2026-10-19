'use client';
import { CalendarRows, CalendarDay } from './CalendarRows';
import { DropZone } from './BookDrag';
import { addDays, monday, sortItems, type BookItem } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';
function hourLabel(hour: number) { return `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`; }
function HourColumn({ date, start, length, items, model }: { date: string; start: number; length: number; items: BookItem[]; model: BookWorkspaceModel }) {
  return <div className="ab-hour-column"><h4>{start === 0 ? 'Midnight' : hourLabel(start)} to {start + length === 24 ? 'midnight' : hourLabel(start + length)}</h4>{Array.from({ length }, (_, index) => index + start).map(hour => {
    const time = `${String(hour).padStart(2, '0')}:00`; const group = sortItems(items.filter(item => item.planning.plan.kind === 'day' && Number(item.planning.plan.time?.slice(0, 2)) === hour));
    return <DropZone key={hour} id={`hour:${date}:${hour}`} target={{ kind: 'plan', plan: { kind: 'day', date, time, duration: null } }} className="ab-hour"><button className="ab-hour-label" aria-label={`Add entry ${date} ${time}`} onClick={() => model.add({ kind: 'day', date, time, duration: null })}>{hourLabel(hour)}</button><CalendarRows items={group} model={model} /></DropZone>;
  })}<small className="ab-hour-end">{start + length === 24 ? '12am · next day' : hourLabel(start + length)}</small></div>;
}
export function HoursCalendar({ model, items }: { model: BookWorkspaceModel; items: BookItem[] }) {
  const dates = model.period === 'week' ? Array.from({ length: 7 }, (_, index) => addDays(monday(model.date), index)) : [model.date];
  const segments = model.hours === '24' ? [{ start: 0, length: 24 }] : model.hours === '12' ? [{ start: 0, length: 12 }, { start: 12, length: 12 }] : [{ start: 0, length: 8 }, { start: 8, length: 8 }, { start: 16, length: 8 }];
  return <><div className="ab-hours-controls"><small>Singapore time · Rows expand for entries</small><select aria-label="Hours layout" value={model.hours} onChange={event => model.setHours(event.target.value === '24' ? '24' : event.target.value === '8' ? '8' : '12')}><option value="24">24 hours</option><option value="12">12 + 12</option><option value="8">8 + 8 + 8</option></select></div><div className={dates.length === 7 ? 'ab-week-hours' : 'ab-day-hours'}>{dates.map(date => {
    const dated = items.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.date === date);
    const untimed = dated.filter(item => item.planning.plan.kind === 'day' && !item.planning.plan.time);
    return <div key={date} className="ab-hours-date">{dates.length > 1 && <CalendarDay date={date} model={model} items={[]} prefix="hours-heading" />}<DropZone id={`untimed:${date}`} target={{ kind: 'plan', plan: { kind: 'day', date, time: null, duration: null } }} className="ab-untimed"><small>Untimed · {untimed.length}</small><CalendarRows model={model} items={untimed} /></DropZone><div className="ab-hour-segments" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>{segments.map(segment => <HourColumn key={segment.start} {...segment} date={date} items={dated.filter(item => item.planning.plan.kind === 'day' && item.planning.plan.time)} model={model} />)}</div></div>;
  })}</div></>;
}
