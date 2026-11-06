/// <reference types="jest" />
import { batchBookSchema, defaultPlanning, editablePlanning, planSchema, planningSchema, readPlanning, readBookConfig, updateBookDocumentSchema } from '../../src/modules/book/contract';
import { dailyNoteDate } from '../../src/modules/book/daily';
import { kindFieldsSchema, defaultKindFields } from '../../src/modules/book/kinds';

describe('Book planning contract', () => {
  test('kind fields reject forged history, unsafe meeting URLs and invalid measures', () => {
    const fields = defaultKindFields();
    expect(kindFieldsSchema.safeParse({ ...fields, releases: [] }).success).toBe(false);
    expect(kindFieldsSchema.safeParse({ ...fields, goalHistory: [] }).success).toBe(false);
    expect(kindFieldsSchema.safeParse({ ...fields, meetingUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(kindFieldsSchema.safeParse({ ...fields, version: 99 }).success).toBe(false);
    for (const target of [0, -1, Infinity]) expect(kindFieldsSchema.safeParse({ ...fields, goal: { measure: 'Revenue', unit: 'PHP', current: 0, target, nextTaskId: null } }).success).toBe(false);
  });
  test('daily compatibility requires an explicit marker or a matching scheduled note date', () => {
    const planning = { ...defaultPlanning('note'), plan: { kind: 'day', date: '2026-11-06', time: null, duration: null } };
    const note = { type: 'MD', name: '2026-11-06 · Friday', attributes: { airunoteBook: planning } };
    expect(dailyNoteDate(note)).toBe('2026-11-06');
    expect(dailyNoteDate({ ...note, name: 'Ordinary work note' })).toBeNull();
    expect(dailyNoteDate({ ...note, attributes: { airunoteBook: { ...planning, kind: 'task' } } })).toBeNull();
    expect(dailyNoteDate({ ...note, attributes: { airunoteBook: { ...planning, plan: { kind: 'unplanned' } } } })).toBeNull();
    expect(dailyNoteDate({ ...note, name: '2026-11-06 · Thursday' })).toBeNull();
    expect(dailyNoteDate({ ...note, attributes: { airunoteDaily: { date: '2026-02-30' }, airunoteBook: planning } })).toBeNull();
    expect(dailyNoteDate({ ...note, name: 'Renamed day', attributes: { airunoteDaily: { date: '2026-11-06' } } })).toBe('2026-11-06');
  });
  test('legacy notes remain notes and processed, with no inferred schedule', () => {
    expect(readPlanning({ tags: ['existing'] })).toEqual(defaultPlanning());
    expect(readBookConfig({ existing: true })?.revision).toBe(0);
  });
  test('future or malformed planning is preserved as unsupported', () => {
    expect(readPlanning({ airunoteBook: { version: 99 } })).toBeNull();
    expect(readBookConfig({ airunoteBook: { version: 99 } })).toBeNull();
  });
  test('day/date/time/duration stays separate from broad period planning', () => {
    expect(planSchema.safeParse({ kind: 'day', date: '2026-02-30', time: null, duration: null }).success).toBe(false);
    expect(planSchema.safeParse({ kind: 'day', date: '2026-10-20', time: '23:30', duration: 60 }).success).toBe(false);
    expect(planSchema.safeParse({ kind: 'day', date: '2026-10-20', time: null, duration: 30 }).success).toBe(false);
    expect(planSchema.safeParse({ kind: 'week', start: '2026-10-20' }).success).toBe(false);
    expect(planSchema.safeParse({ kind: 'week', start: '2026-10-19', time: '09:00' }).success).toBe(false);
    expect(planSchema.safeParse({ kind: 'day', date: '2026-10-20', time: '23:30', duration: 30 }).success).toBe(true);
    expect(planSchema.safeParse({ kind: 'day', date: '2026-10-20', time: null, duration: null }).success).toBe(true);
  });
  test('server history and version cannot be supplied as editable planning', () => {
    const planning = defaultPlanning('task', false);
    const base = { rootFolderId: '10000000-0000-4000-8000-000000000001', expectedUpdatedAt: new Date().toISOString() };
    expect(updateBookDocumentSchema.safeParse({ ...base, planning }).success).toBe(false);
    expect(updateBookDocumentSchema.safeParse({ ...base, planning: editablePlanning(planning) }).success).toBe(true);
    expect(planningSchema.safeParse(planning).success).toBe(true);
  });
  test('batch updates reject repeated ids and oversized batches', () => {
    const entry = { id: '10000000-0000-4000-8000-000000000001', expectedUpdatedAt: new Date().toISOString() };
    expect(batchBookSchema.safeParse({ rootFolderId: entry.id, entries: [entry, entry], change: { kind: 'status', status: 'complete' } }).success).toBe(false);
    expect(batchBookSchema.safeParse({ rootFolderId: entry.id, entries: Array(101).fill(entry), change: { kind: 'status', status: 'complete' } }).success).toBe(false);
  });
});
