import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  examAssetUsageTable as usage,
  examTemplatesTable as templates,
  examsTable as exams,
  examOrgSettingsTable as settings,
  orgFilesTable as files,
} from '../../infrastructure/db/drizzle/schema';
import {
  Appearance,
  appearanceSchema,
  assetFileIds,
  plainAppearance,
  readAppearance,
} from './contract';

export class AppearanceError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function recordAssetUsage(
  tx: Transaction,
  orgId: string,
  kind: string,
  id: string,
  config: Appearance
) {
  const ids = assetFileIds(config).sort();
  for (const fileId of ids) {
    const [file] = await tx
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.orgId, orgId)))
      .for('update');
    if (
      !file ||
      file.deletedAt ||
      !file.mimeType.startsWith('image/') ||
      file.visibility !== 'public'
    ) {
      throw new AppearanceError('Select a public image from this organization’s library.');
    }
  }
  await tx
    .delete(usage)
    .where(and(eq(usage.ownerKind, kind), eq(usage.ownerId, id), eq(usage.orgId, orgId)));
  if (ids.length)
    await tx
      .insert(usage)
      .values(ids.map((fileId) => ({ fileId, ownerKind: kind, ownerId: id, orgId })));
}
export async function defaultAppearance(
  tx: Transaction,
  orgId: string
): Promise<{ config: Appearance; templateId: string | null }> {
  const [row] = await tx
    .select({ template: templates })
    .from(settings)
    .innerJoin(
      templates,
      and(
        eq(settings.defaultExamTemplateId, templates.id),
        eq(templates.orgId, orgId),
        isNull(templates.archivedAt)
      )
    )
    .where(eq(settings.orgId, orgId));
  return {
    config: row ? readAppearance(row.template.config) : structuredClone(plainAppearance),
    templateId: row?.template.id ?? null,
  };
}
export const appearanceService = {
  async list(orgId: string) {
    const [items, [orgSettings]] = await Promise.all([
      db.select().from(templates).where(eq(templates.orgId, orgId)),
      db.select().from(settings).where(eq(settings.orgId, orgId)),
    ]);
    return { templates: items, defaultTemplateId: orgSettings?.defaultExamTemplateId ?? null };
  },
  async create(orgId: string, userId: string, name: string, config: Appearance) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(templates)
        .values({ orgId, name, config: appearanceSchema.parse(config), createdByUserId: userId })
        .returning();
      await recordAssetUsage(tx, orgId, 'template', row.id, config);
      return row;
    });
  },
  async update(orgId: string, id: string, name: string, config: Appearance, revision?: number) {
    if (!revision) throw new AppearanceError('Reload the template before saving.', 409);
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(templates)
        .set({
          name,
          config: appearanceSchema.parse(config),
          revision: revision + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(templates.orgId, orgId),
            eq(templates.id, id),
            eq(templates.revision, revision),
            isNull(templates.archivedAt)
          )
        )
        .returning();
      if (!row)
        throw new AppearanceError('Template changed or was archived. Reload before saving.', 409);
      await recordAssetUsage(tx, orgId, 'template', id, config);
      return row;
    });
  },
  async archive(orgId: string, id: string) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(templates)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
          revision: sql`${templates.revision} + 1`,
        })
        .where(and(eq(templates.id, id), eq(templates.orgId, orgId)))
        .returning();
      if (!row) throw new AppearanceError('Template not found.', 404);
      await tx
        .update(settings)
        .set({ defaultExamTemplateId: null })
        .where(and(eq(settings.orgId, orgId), eq(settings.defaultExamTemplateId, id)));
      return row;
    });
  },
  async setDefault(orgId: string, id: string | null) {
    await db.transaction(async (tx) => {
      if (id) {
        const [row] = await tx
          .select()
          .from(templates)
          .where(
            and(eq(templates.id, id), eq(templates.orgId, orgId), isNull(templates.archivedAt))
          )
          .for('update');
        if (!row) throw new AppearanceError('Choose an active template from this organization.');
      }
      await tx
        .insert(settings)
        .values({ orgId, defaultExamTemplateId: id })
        .onConflictDoUpdate({
          target: settings.orgId,
          set: { defaultExamTemplateId: id, updatedAt: new Date() },
        });
    });
  },
  async get(orgId: string, id: string) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.orgId, orgId)));
    if (!exam) throw new AppearanceError('Exam not found.', 404);
    return {
      config: readAppearance(exam.appearanceConfig),
      templateId: exam.appearanceTemplateId,
      revision: exam.appearanceRevision,
    };
  },
  async save(
    orgId: string,
    id: string,
    config: Appearance,
    templateId: string | null,
    revision: number
  ) {
    return db.transaction(async (tx) => {
      if (templateId) {
        const [template] = await tx
          .select()
          .from(templates)
          .where(and(eq(templates.id, templateId), eq(templates.orgId, orgId)))
          .for('share');
        if (!template) throw new AppearanceError('Template does not belong to this organization.');
      }
      const [exam] = await tx
        .update(exams)
        .set({
          appearanceConfig: appearanceSchema.parse(config),
          appearanceTemplateId: templateId,
          appearanceRevision: revision + 1,
          updatedAt: new Date(),
        })
        .where(
          and(eq(exams.id, id), eq(exams.orgId, orgId), eq(exams.appearanceRevision, revision))
        )
        .returning();
      if (!exam)
        throw new AppearanceError(
          'Appearance changed in another session. Reload before saving.',
          409
        );
      await recordAssetUsage(tx, orgId, 'exam', id, config);
      return { config, templateId, revision: revision + 1 };
    });
  },
};
