'use client';
import type { BookItem } from './domain';
import { folderLabel, formatDay, sortItems, today } from './domain';
import { BookItemRow } from './BookItemRow';
import { DropZone } from './BookDrag';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function CalendarRows({ items, model }: { items: BookItem[]; model: BookWorkspaceModel }) {
  if (model.plot !== 'projects') return <>{sortItems(items).map(item => <BookItemRow key={item.id} item={item} model={model} calendarEntry={model.natural} />)}</>;
  const ids = Array.from(new Set(items.map(item => item.folderId)));
  return <>{ids.map(id => <div className="ab-project-plot" key={id}><h4>▱ {folderLabel(model.folders.find(folder => folder.id === id)?.humanId)}</h4>{sortItems(items.filter(item => item.folderId === id)).map(item => <BookItemRow key={item.id} item={item} model={model} calendarEntry={model.natural} />)}</div>)}</>;
}
export function CalendarDay({ date, model, items, prefix = 'day', maxVisible }: { date: string; model: BookWorkspaceModel; items: BookItem[]; prefix?: string; maxVisible?: number }) {
  const visible = maxVisible === undefined ? items : sortItems(items).slice(0, maxVisible);
  const remaining = items.length - visible.length;
  const openDay = () => { model.setDate(date); model.setPeriod('day'); };
  return <DropZone id={`${prefix}:${date}`} target={{ kind: 'plan', preserveTime: true, plan: { kind: 'day', date, time: null, duration: null } }} className={`ab-calendar-day ${date === today() ? 'ab-today' : ''}`}><div className="ab-day-heading"><button className="ab-link" onClick={openDay}><strong>{formatDay(date, { weekday: 'short' })}</strong> {formatDay(date)}{date === today() && <small>Today</small>}</button><button aria-label={`Add entry on ${date}`} onClick={() => model.add({ kind: 'day', date, time: null, duration: null })}>+</button></div><CalendarRows items={visible} model={model} />{remaining > 0 && <button className="ab-link an-calendar-more" aria-label={`Show ${remaining} more entries on ${date}`} onClick={openDay}>+{remaining} more</button>}</DropZone>;
}
