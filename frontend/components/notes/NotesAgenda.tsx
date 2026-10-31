'use client';
import { BookItemRow } from '@/components/book/BookItemRow';
import { DropZone } from '@/components/book/BookDrag';
import { addDays, formatDay, monday, today, type BookItem } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { CalendarPlan } from '@/lib/book';
import { agendaGroups } from './agenda';
export function NotesAgenda({ model }: { model: BookWorkspaceModel }) {
  const date = model.date; const next = addDays(date, 1); const current = date === today();
  const groups = agendaGroups(model.filtered, date, model.planningConfig, model.closed);
  const rows = (items: BookItem[]) => items.map(item => <BookItemRow key={item.id} item={item} model={model} />);
  function day(day: string, label: string, items: BookItem[], primary = false) {
    const plan: CalendarPlan = { kind: 'day', date: day, time: null, duration: null };
    return <DropZone id={`notes-day:${day}`} target={{ kind: 'plan', plan, preserveTime: true }} className={`an-agenda-day ${primary ? 'an-agenda-today' : ''}`}>
      <div className="an-agenda-heading"><h3>{label} <small>{formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</small></h3><button className="ab-link" aria-label={`Add to ${label}`} onClick={() => model.add(plan)}>+ Add</button></div>
      {items.length ? rows(items) : <p className="an-agenda-empty">{primary ? 'Room for what matters today.' : 'Nothing scheduled yet.'}</p>}
    </DropZone>;
  }
  const week: CalendarPlan = { kind: 'week', start: monday(date) };
  return <>
    <div className="an-agenda-nav"><button aria-label="Previous day" onClick={() => model.setDate(addDays(date, -1))}>‹</button><strong>{formatDay(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong><button aria-label="Next day" onClick={() => model.setDate(next)}>›</button><button className="ab-link" onClick={() => model.setDate(today())}>Today</button></div>
    <div className="ab-scroll an-agenda" data-scroll-key="plan">
      {day(date, current ? 'Today' : formatDay(date, { weekday: 'long' }), groups.today, true)}
      {day(next, current ? 'Tomorrow' : formatDay(next, { weekday: 'long' }), groups.tomorrow)}
      <details className="an-agenda-group" open={groups.later.length > 0}><summary>Later <small>{groups.later.length}</small></summary>{groups.later.length ? rows(groups.later) : <p className="an-agenda-empty">Your future plans will appear here.</p>}</details>
      <DropZone id="notes-week" target={{ kind: 'plan', plan: week }}><details className="an-agenda-group" open={groups.week.length > 0}><summary>Sometime this week <small>{groups.week.length}</small></summary>{rows(groups.week)}<button className="ab-link" onClick={() => model.add(week)}>+ Add something for this week</button></details></DropZone>
      {groups.longer.length > 0 && <details className="an-agenda-group"><summary>Longer plans <small>{groups.longer.length}</small></summary>{rows(groups.longer)}</details>}
      {groups.earlier.length > 0 && <details className="an-agenda-group"><summary>Earlier <small>{groups.earlier.length}</small></summary><p className="an-agenda-empty">Still on their original dates. Move them when you decide.</p>{rows(groups.earlier)}</details>}
    </div><footer><small>Singapore time · Plans stay where you place them.</small></footer>
  </>;
}
