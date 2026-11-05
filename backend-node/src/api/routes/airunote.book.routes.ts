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
