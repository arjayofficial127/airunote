import { z } from 'zod';
import type { PlanningFields } from './contract';

const amount = z.number().finite().min(0).max(1e15);
const httpUrl = z.string().url().max(2000).refine(value => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS meeting link');
export const kindFieldsSchema = z.object({
  version: z.literal(1), taskMode: z.enum(['single', 'list']),
  location: z.string().max(2000), meetingUrl: httpUrl.nullable(), reminderAt: z.string().datetime().nullable(),
  goal: z.object({ measure: z.string().trim().min(1).max(120), unit: z.string().trim().max(30), current: amount, target: amount.refine(value => value > 0, 'The target must be greater than zero'), nextTaskId: z.string().uuid().nullable() }).strict().nullable(),
}).strict();
export const releaseSchema = z.object({ id: z.string().uuid(), number: z.number().int().positive(), name: z.string(), type: z.enum(['MD', 'TXT', 'RTF']), sha256: z.string().regex(/^[a-f0-9]{64}$/), createdAt: z.string().datetime() }).strict();
export const kindDetailsSchema = kindFieldsSchema.extend({
  goalHistory: z.array(z.object({ at: z.string().datetime(), measure: z.string(), unit: z.string(), current: amount, target: amount })).max(1000),
  releases: z.array(releaseSchema).max(100),
}).strict();
export type KindFields = z.infer<typeof kindFieldsSchema>;
export type KindDetails = z.infer<typeof kindDetailsSchema>;
export type DocumentRelease = z.infer<typeof releaseSchema>;
export function defaultKindFields(): KindFields { return { version: 1, taskMode: 'single', location: '', meetingUrl: null, reminderAt: null, goal: null }; }
export function readKindDetails(attributes: unknown): KindDetails | undefined | null {
  const raw = attributes && typeof attributes === 'object' && 'airunoteKinds' in attributes ? attributes.airunoteKinds : undefined;
  if (raw === undefined) return undefined;
  const parsed = kindDetailsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
export function editableKindDetails(value: KindDetails): KindFields {
  const { version, taskMode, location, meetingUrl, reminderAt, goal } = value;
  return { version, taskMode, location, meetingUrl, reminderAt, goal };
}
export function kindValidation(planning: PlanningFields, fields: KindFields): string | null {
  if (planning.kind === 'task' && fields.taskMode === 'list' && !planning.checklist.length) return 'Add at least one list item or choose Single task.';
  if (planning.kind === 'event' && (planning.plan.kind !== 'day' || !planning.plan.time || !planning.plan.duration)) return 'Choose an event date, start time and an end time after the start (same day).';
  if (planning.kind === 'goal' && !fields.goal) return 'Define the goal’s success measure and target.';
  return null;
}
export function kindPlanning(planning: PlanningFields, fields: KindFields): PlanningFields {
  if (planning.status === 'cancelled') return planning;
  if (planning.kind === 'task' && fields.taskMode === 'list') return { ...planning, status: planning.checklist.length > 0 && planning.checklist.every(item => item.done) ? 'complete' : 'open' };
  if (planning.kind === 'goal' && fields.goal) return { ...planning, status: fields.goal.current >= fields.goal.target ? 'complete' : 'open' };
  return planning;
}
