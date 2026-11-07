import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';
import { BookService } from '../../modules/book/book.service';
import { updateBookDocumentSchema, updateBookConfigSchema, batchBookSchema, createBookDocumentSchema, daySchema } from '../../modules/book/contract';
import { AppError } from '../../core/errors/AppError';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });
router.use(authMiddleware, requireOrgMembership);
const service = new BookService();
router.get('/capabilities', (_req, res) => { res.json({ success: true, data: { kinds: 1, documentVersions: true, taskDueDates: true, itemCopies: true } }); });
const versionRequest = z.object({ rootFolderId: z.string().uuid(), expectedUpdatedAt: z.string().datetime() }).strict();
router.post('/documents/:id/copy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId);
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const input = versionRequest.extend({ folderId: z.string().uuid() }).parse(req.body);
    const document = await service.copy({ orgId, userId }, z.string().uuid().parse(req.params.id), input);
    res.status(201).json({ success: true, data: { document } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError('Choose a valid item and destination.', 400, 'VALIDATION_ERROR') : error); }
});
router.post('/documents/:id/ready', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const { rootFolderId, expectedUpdatedAt } = versionRequest.parse(req.body);
    const document = await service.readyDocument({ orgId: z.string().uuid().parse(req.params.orgId), userId: req.user.userId }, z.string().uuid().parse(req.params.id), rootFolderId, expectedUpdatedAt);
    res.json({ success: true, data: { document } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError('Check the document version request.', 400, 'VALIDATION_ERROR') : error); }
});
router.get('/documents/:id/versions/:revisionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const version = await service.documentVersion({ orgId: z.string().uuid().parse(req.params.orgId), userId: req.user.userId }, z.string().uuid().parse(req.params.id), z.string().uuid().parse(req.query.rootFolderId), z.string().uuid().parse(req.params.revisionId));
    res.json({ success: true, data: { version } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError('Check the document version request.', 400, 'VALIDATION_ERROR') : error); }
});
router.put('/daily/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId);
    const date = daySchema.parse(req.params.date);
    const { rootFolderId } = z.object({ rootFolderId: z.string().uuid() }).strict().parse(req.body);
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const document = await service.daily({ orgId, userId }, rootFolderId, date);
    res.json({ success: true, data: { document } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError('Choose a valid daily note date and workspace.', 400, 'VALIDATION_ERROR') : error); }
});
router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId); const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const document = await service.create({ orgId, userId }, createBookDocumentSchema.parse(req.body));
    res.status(201).json({ success: true, data: { document } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError(error.issues.map(issue => issue.message).join('; '), 400, 'VALIDATION_ERROR') : error); }
});
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId); const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const documents = await service.batch({ orgId, userId }, batchBookSchema.parse(req.body));
    res.json({ success: true, data: { documents } });
  } catch (error) { next(error instanceof z.ZodError ? new AppError(error.issues.map(issue => issue.message).join('; '), 400, 'VALIDATION_ERROR') : error); }
});
router.patch('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId);
    const id = z.string().uuid().parse(req.params.id);
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const document = await service.update({ orgId, userId }, id, updateBookDocumentSchema.parse(req.body));
    res.json({ success: true, data: { document } });
  } catch (error) {
    next(error instanceof z.ZodError ? new AppError(error.issues.map(issue => issue.message).join('; '), 400, 'VALIDATION_ERROR') : error);
  }
});
router.put('/folders/:id/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = z.string().uuid().parse(req.params.orgId);
    const id = z.string().uuid().parse(req.params.id);
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const folder = await service.configure({ orgId, userId }, id, updateBookConfigSchema.parse(req.body));
    res.json({ success: true, data: { folder } });
  } catch (error) {
    next(error instanceof z.ZodError ? new AppError(error.issues.map(issue => issue.message).join('; '), 400, 'VALIDATION_ERROR') : error);
  }
});
export default router;
