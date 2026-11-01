import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaGroups } from '../components/notes/agenda';
import { defaultPlanning, type CalendarPlan, type BookConfig } from '../lib/book';
import type { BookItem } from '../components/book/domain';
const config: BookConfig = { version: 1, revision: 0, sprints: [{ id: 'sprint-one', name: 'Sprint', start: '2026-10-26', end: '2026-11-08', closed: false }], views: [], templates: [] };
function item(id: string, plan: CalendarPlan, status: 'open' | 'complete' | 'cancelled' = 'open'): BookItem {
  return { id, name: id, folderId: 'folder', ownerUserId: 'owner', type: 'TXT', visibility: 'private', state: 'active', attributes: {}, createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-01'), planning: { ...defaultPlanning('task', false), plan, status }, invalidPlanning: false };
}
const day = (date: string): CalendarPlan => ({ kind: 'day', date, time: null, duration: null });
test('Sunday shows Monday as Tomorrow and retains future plans across week/month/year boundaries', () => {
  const result = agendaGroups([item('today', day('2026-11-01')), item('tomorrow', day('2026-11-02')), item('future', day('2027-01-01')), item('past', day('2026-10-31'))], '2026-11-01', config, false);
  assert.equal(result.today[0]?.id, 'today'); assert.equal(result.tomorrow[0]?.id, 'tomorrow'); assert.equal(result.later[0]?.id, 'future'); assert.equal(result.earlier[0]?.id, 'past');
});
test('broad plans remain broad; creation date never schedules an unplanned note', () => {
  const items = [item('week', { kind: 'week', start: '2026-10-26' }), item('month', { kind: 'month', month: '2026-11' }), item('sprint', { kind: 'sprint', sprintId: 'sprint-one' }), item('unknown-sprint', { kind: 'sprint', sprintId: 'missing' }), item('unplanned', { kind: 'unplanned' })];
  const before = JSON.stringify(items); const result = agendaGroups(items, '2026-11-01', config, false);
  assert.equal(result.week[0]?.id, 'week'); assert.equal(result.longer.length, 3); assert.equal(result.today.length, 0);
  assert.equal(Object.values(result).flat().length, 4); assert.equal(JSON.stringify(items), before);
});
test('completed and cancelled entries appear only with the explicit filter', () => {
  const items = [item('done', day('2026-11-01'), 'complete'), item('cancelled', day('2026-11-01'), 'cancelled')];
  assert.equal(agendaGroups(items, '2026-11-01', config, false).today.length, 0); assert.equal(agendaGroups(items, '2026-11-01', config, true).today.length, 2);
});
test('year boundary and past broad periods are classified once without moving dates', () => {
  const items = [item('next-year', day('2027-01-01')), item('old-week', { kind: 'week', start: '2026-12-21' }), item('next-week', { kind: 'week', start: '2027-01-04' })];
  const result = agendaGroups(items, '2026-12-31', config, false);
  assert.equal(result.tomorrow[0]?.id, 'next-year'); assert.equal(result.earlier[0]?.id, 'old-week'); assert.equal(result.later[0]?.id, 'next-week'); assert.equal(Object.values(result).flat().length, items.length);
});
