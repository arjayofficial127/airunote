import { z } from 'zod';
import { kindFieldsSchema } from './kinds';

export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid calendar date');
const clockSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const planSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('unplanned') }).strict(),
  z.object({ kind: z.literal('day'), date: daySchema, time: clockSchema.nullable(), duration: z.number().int().min(1).max(1440).nullable() }).strict(),
  z.object({ kind: z.literal('week'), start: daySchema.refine(value => new Date(`${value}T00:00:00Z`).getUTCDay() === 1, 'Weeks start on Monday') }).strict(),
  z.object({ kind: z.literal('month'), month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/) }).strict(),
  z.object({ kind: z.literal('year'), year: z.number().int().min(1900).max(9999) }).strict(),
  z.object({ kind: z.literal('sprint'), sprintId: z.string().uuid() }).strict(),
]).superRefine((plan, context) => {
  if (plan.kind !== 'day' || plan.duration === null) return;
  if (plan.time === null || Number(plan.time.slice(0, 2)) * 60 + Number(plan.time.slice(3)) + plan.duration > 1440) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Duration needs a start time and must finish by midnight' });
  }
});
export const checklistSchema = z.array(z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(2000), done: z.boolean(), dueDate: daySchema.optional() }).strict()).max(200);
export const planningFieldsSchema = z.object({
  kind: z.enum(['task', 'event', 'note', 'goal', 'document']),
  status: z.enum(['open', 'complete', 'cancelled']),
  processed: z.boolean(), priority: z.boolean(), plan: planSchema,
  checklist: checklistSchema,
  notes: z.array(z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(20000), createdAt: z.string().datetime() }).strict()).max(1000),
  source: z.string().url().refine(value => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS link').nullable(),
}).strict();
export const historyEventSchema = z.object({ id: z.string().uuid(), at: z.string().datetime(), actorId: z.string().uuid(), action: z.string().max(500) }).strict();
export const planningSchema = planningFieldsSchema.extend({ version: z.literal(1), history: z.array(historyEventSchema) });
export const updateBookDocumentSchema = z.object({
  rootFolderId: z.string().uuid(), expectedUpdatedAt: z.string().datetime(),
  name: z.string().trim().min(1).max(255).optional(),
  content: z.string().max(1000000).optional(), folderId: z.string().uuid().optional(),
  planning: planningFieldsSchema.optional(),
  kindFields: kindFieldsSchema.optional(),
  contentType: z.literal('RTF').optional(),
}).strict().refine(value => value.name !== undefined || value.content !== undefined || value.folderId !== undefined || value.planning !== undefined || value.kindFields !== undefined, 'Nothing to save');
export const createBookDocumentSchema = z.object({ rootFolderId: z.string().uuid(), folderId: z.string().uuid(), name: z.string().trim().min(1).max(255), content: z.string().max(1000000), planning: planningFieldsSchema, kindFields: kindFieldsSchema.optional() }).strict();
export type BookDocumentCreate = z.infer<typeof createBookDocumentSchema>;
export const sprintSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120), start: daySchema, end: daySchema, closed: z.boolean() }).strict().refine(value => value.end >= value.start, 'Sprint end must follow its start');
export const workspaceViewSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(100),
  panels: z.array(z.enum(['inbox', 'organizer', 'calendar', 'context'])).max(4),
  folders: z.array(z.string().uuid()).max(1000),
  period: z.enum(['day', 'week', 'sprint', 'month', 'year', 'unplanned']), date: daySchema,
  plot: z.enum(['items', 'projects', 'hours']), hours: z.enum(['24', '12', '8']),
  layout: z.enum(['tree', 'columns']), closed: z.boolean(),
}).strict();
export const templateSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(100), kind: planningFieldsSchema.shape.kind, content: z.string().max(100000), steps: z.array(z.string().max(2000)).max(200) }).strict();
export const bookConfigFieldsSchema = z.object({ sprints: z.array(sprintSchema).max(200), views: z.array(workspaceViewSchema).max(100), templates: z.array(templateSchema).max(100) }).strict();
export const bookConfigSchema = bookConfigFieldsSchema.extend({ version: z.literal(1), revision: z.number().int().nonnegative() });
export const updateBookConfigSchema = z.object({ expectedRevision: z.number().int().nonnegative(), config: bookConfigFieldsSchema }).strict();
export const batchBookSchema = z.object({ rootFolderId: z.string().uuid(), entries: z.array(z.object({ id: z.string().uuid(), expectedUpdatedAt: z.string().datetime() }).strict()).min(1).max(100).refine(entries => new Set(entries.map(entry => entry.id)).size === entries.length, 'Choose each item once'), change: z.discriminatedUnion('kind', [z.object({ kind: z.literal('status'), status: planningFieldsSchema.shape.status }).strict(), z.object({ kind: z.literal('folder'), folderId: z.string().uuid() }).strict(), z.object({ kind: z.literal('plan'), plan: planSchema }).strict()]) }).strict();
export type BookBatch = z.infer<typeof batchBookSchema>;
export type CalendarPlan = z.infer<typeof planSchema>;
export type PlanningFields = z.infer<typeof planningFieldsSchema>;
export type BookPlanning = z.infer<typeof planningSchema>;
export type BookConfig = z.infer<typeof bookConfigSchema>;
export type BookConfigFields = z.infer<typeof bookConfigFieldsSchema>;
export type BookDocumentUpdate = z.infer<typeof updateBookDocumentSchema>;
export type BookConfigUpdate = z.infer<typeof updateBookConfigSchema>;
export type BookSprint = z.infer<typeof sprintSchema>;
export type WorkspaceView = z.infer<typeof workspaceViewSchema>;
export type BookTemplate = z.infer<typeof templateSchema>;
export function editablePlanning(value: BookPlanning): PlanningFields {
  return { kind: value.kind, status: value.status, processed: value.processed, priority: value.priority, plan: value.plan, checklist: value.checklist, notes: value.notes, source: value.source };
}
export function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}
export function defaultPlanning(kind: PlanningFields['kind'] = 'note', processed = true): BookPlanning {
  return { version: 1, kind, status: 'open', processed, priority: false, plan: { kind: 'unplanned' }, checklist: [], notes: [], source: null, history: [] };
}
export function readPlanning(attributes: unknown): BookPlanning | null {
  const value = record(attributes).airunoteBook;
  if (value === undefined) return defaultPlanning();
  const parsed = planningSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function readBookConfig(metadata: unknown): BookConfig | null {
  const value = record(metadata).airunoteBook;
  if (value === undefined) return { version: 1, revision: 0, sprints: [], views: [], templates: [] };
  const parsed = bookConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
