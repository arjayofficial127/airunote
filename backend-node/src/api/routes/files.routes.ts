import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID, createHash } from 'crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  orgFilesTable as files,
  examAssetUsageTable as usage,
} from '../../infrastructure/db/drizzle/schema';
import { AppearanceError } from '../../modules/exam-appearance/service';
import {
  configuredProvider,
  detectType,
  validateImage,
  getFile,
  putFile,
  removeFile,
} from '../../modules/files/storage';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgRole } from '../middleware/requireOrgRole';
import rateLimit from 'express-rate-limit';
const nativeUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `native-upload:${req.user!.userId}`,
  message: { success: false, error: { message: 'Upload limit reached. Try again later.' } },
});
const router: ReturnType<typeof Router> = Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
const admin = requireOrgRole(['admin', 'superadmin']);
router.use(authMiddleware, requireOrgRole(['admin', 'superadmin', 'member', 'viewer']));
const wrap =
  (fn: (r: Request, s: Response) => Promise<void>) =>
  async (r: Request, s: Response, n: NextFunction) => {
    try {
      await fn(r, s);
    } catch (e) {
      n(e);
    }
  };
const ok = (s: Response, data: unknown) => {
  s.json({ success: true, data });
};
async function owned(r: Request) {
  const id = z.string().uuid().parse(r.params.fileId);
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, r.params.orgId)));
  if (!file) throw new AppearanceError('File not found.', 404);
  return file;
}
// Public metadata contains no storage keys; private content is always served through authorization.
function view(file: typeof files.$inferSelect) {
  const { storageKey, objectKey, previewObjectKey, url, ...rest } = file;
  return { ...rest, url: '' };
}
router.get(
  '/capabilities',
  wrap(async (_r, s) =>
    ok(s, {
      uploadsAvailable: Boolean(configuredProvider()),
      maxBytes: 10 * 1024 * 1024,
      types: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    })
  )
);
router.get(
  '/',
  wrap(async (r, s) => {
    const rows = await db
      .select()
      .from(files)
      .where(and(eq(files.orgId, r.params.orgId), isNull(files.deletedAt)));
    // Org admins manage all assets. Other roles receive only shared/owned files.
    const memberships: any = container.resolve(TYPES.IOrgUserRepository);
    const roles: any = container.resolve(TYPES.IOrgUserRoleRepository);
    const roleRepo: any = container.resolve(TYPES.IRoleRepository);
    const membership = await memberships.findByOrgIdAndUserId(r.params.orgId, r.user!.userId);
    const grants = await roles.findByOrgUserId(membership.id);
    const roleNames = await Promise.all(
      grants.map(async (g: any) => (await roleRepo.findById(g.roleId))?.code.toLowerCase())
    );
    const isAdmin = roleNames.some((role) => role === 'admin' || role === 'superadmin');
    ok(
      s,
      rows
        .filter(
          (f) =>
            isAdmin ||
            f.ownerUserId === r.user!.userId ||
            f.visibility === 'org' ||
            f.visibility === 'public'
        )
        .map(view)
    );
  })
);
router.post(
  '/upload',
  admin,
  nativeUploadRateLimit,
  upload.single('file'),
  wrap(async (r, s) => {
    const provider = configuredProvider();
    if (!provider)
      throw new AppearanceError(
        'Upload storage is not configured. You can still select built-in images.',
        503
      );
    if (!r.file) throw new AppearanceError('Choose a file.');
    const mime = detectType(r.file.buffer);
    if (!mime)
      throw new AppearanceError('Use PNG, JPEG, WebP, or PDF. Uploaded SVG is not supported.');
    if (mime.startsWith('image/')) await validateImage(r.file.buffer);
    const visibility = z.enum(['private', 'org', 'public']).parse(r.body.visibility ?? 'private');
    const id = r.body.uploadId ? z.string().uuid().parse(r.body.uploadId) : randomUUID();
    const key = `orgs/${r.params.orgId}/files/${id}`;
    const checksum = createHash('sha256').update(r.file.buffer).digest('hex');
    const uploaded = r.file;
    const file = await db.transaction(async (tx) => {
      // A retry of the same upload must not create a second file or overwrite an existing asset.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`);
      const [existing] = await tx.select().from(files).where(eq(files.id, id));
      if (existing) {
        if (
          existing.orgId !== r.params.orgId ||
          existing.ownerUserId !== r.user!.userId ||
          existing.checksum !== checksum ||
          existing.deletedAt
        )
          throw new AppearanceError(
            'Upload reference conflicts with an existing file. Choose the file again.',
            409
          );
        return existing;
      }
      await putFile(provider, key, uploaded.buffer, mime);
      try {
        const [created] = await tx
          .insert(files)
          .values({
            id,
            orgId: r.params.orgId,
            ownerUserId: r.user!.userId,
            storageProvider: provider,
            storageKey: key,
            url: '',
            fileName: uploaded.originalname.replace(/[\x00-\x1f]/g, '').slice(0, 255),
            mimeType: mime,
            sizeBytes: uploaded.size,
            checksum,
            visibility,
          })
          .returning();
        return created;
      } catch (error) {
        await removeFile(provider, key).catch(() => undefined);
        throw error;
      }
    });
    s.status(201);
    ok(s, view(file));
  })
);
router.get(
  '/cleanup',
  admin,
  wrap(async (r, s) => {
    const rows = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.orgId, r.params.orgId),
          sql`${files.deletedAt} IS NOT NULL`,
          isNull(files.storageDeletedAt)
        )
      );
    ok(s, rows.map(view));
  })
);
router.get(
  '/:fileId',
  admin,
  wrap(async (r, s) => {
    const file = await owned(r);
    const refs = await db.execute(
      sql`SELECT u.owner_kind AS "ownerKind", u.owner_id AS "ownerId", COALESCE(t.name,e.title,ae.title,'Saved appearance') AS label FROM exam_asset_usage u LEFT JOIN exam_templates t ON u.owner_kind='template' AND t.id=u.owner_id LEFT JOIN exams e ON u.owner_kind='exam' AND e.id=u.owner_id LEFT JOIN exam_attempts a ON u.owner_kind='attempt' AND a.id=u.owner_id LEFT JOIN exams ae ON ae.id=a.exam_id WHERE u.file_id=${file.id} AND u.org_id=${r.params.orgId}`
    );
    ok(s, { ...view(file), uses: refs });
  })
);
router.get(
  '/:fileId/content',
  admin,
  wrap(async (r, s) => {
    const file = await owned(r);
    if (file.deletedAt) throw new AppearanceError('File removed.', 404);
    s.set({
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    s.send(await getFile(file.storageProvider, file.storageKey));
  })
);
router.patch(
  '/:fileId/visibility',
  admin,
  wrap(async (r, s) => {
    const visibility = z.enum(['private', 'org', 'public']).parse(r.body.visibility);
    const file = await owned(r);
    const updated = await db.transaction(async (tx) => {
      await tx.select().from(files).where(eq(files.id, file.id)).for('update');
      const refs = await tx.select().from(usage).where(eq(usage.fileId, file.id));
      if (refs.length && visibility !== 'public')
        throw new AppearanceError(
          'This image is used by an exam or template. Replace those references first.',
          409
        );
      const [row] = await tx
        .update(files)
        .set({ visibility, updatedAt: new Date() })
        .where(and(eq(files.id, file.id), isNull(files.deletedAt)))
        .returning();
      if (!row) throw new AppearanceError('File removed.', 404);
      return row;
    });
    ok(s, view(updated));
  })
);
router.delete(
  '/:fileId',
  admin,
  wrap(async (r, s) => {
    const file = await owned(r);
    await db.transaction(async (tx) => {
      await tx.select().from(files).where(eq(files.id, file.id)).for('update');
      const refs = await tx.select().from(usage).where(eq(usage.fileId, file.id));
      if (refs.length)
        throw new AppearanceError(
          'This file is still used by exams, templates, or saved attempts. View its usage before removing it.',
          409
        );
      await tx.update(files).set({ deletedAt: new Date() }).where(eq(files.id, file.id));
    });
    try {
      await removeFile(file.storageProvider, file.storageKey);
      await db.update(files).set({ storageDeletedAt: new Date() }).where(eq(files.id, file.id));
      ok(s, { deleted: true, cleanupPending: false });
    } catch {
      ok(s, { deleted: true, cleanupPending: true });
    }
  })
);
router.use((error: unknown, _r: Request, s: Response, next: NextFunction) => {
  if (
    error instanceof AppearanceError ||
    error instanceof z.ZodError ||
    error instanceof multer.MulterError
  ) {
    s.status(error instanceof AppearanceError ? error.status : 400).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Invalid file request.' },
    });
  } else next(error);
});
export const publicAssetRouter: ReturnType<typeof Router> = Router();
publicAssetRouter.get(
  '/:fileId',
  wrap(async (r, s) => {
    const parsed = z.string().uuid().safeParse(r.params.fileId);
    if (!parsed.success) {
      s.sendStatus(404);
      return;
    }
    const id = parsed.data;
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.visibility, 'public'), isNull(files.deletedAt)));
    if (!file) {
      s.sendStatus(404);
      return;
    }
    const result = await db.execute(
      sql`SELECT 1 FROM exam_asset_usage u JOIN exams e ON (u.owner_kind = 'exam' AND e.id = u.owner_id) OR (u.owner_kind = 'attempt' AND e.id = (SELECT a.exam_id FROM exam_attempts a WHERE a.id = u.owner_id)) WHERE u.file_id = ${id} AND e.org_id = u.org_id AND e.archived_at IS NULL AND e.status IN ('published','closed') LIMIT 1`
    );
    if (!result.length) {
      s.sendStatus(404);
      return;
    }
    s.set({
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    s.send(await getFile(file.storageProvider, file.storageKey));
  })
);
export default router;
