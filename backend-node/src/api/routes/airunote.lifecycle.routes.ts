import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { AirunoteLifecycleRepository } from '../../modules/airunote/lifecycle.repository';
import { AppError } from '../../core/errors/AppError';

// Mounted below Airunote authentication and organization membership middleware.
const router: ReturnType<typeof Router> = Router({ mergeParams: true });
const repository = new AirunoteLifecycleRepository();
const state = z.enum(['active', 'archived', 'trashed']);
const folderInput = z.object({ state, expectedState: state }).strict();
const documentInput = z.object({ state, expectedUpdatedAt: z.string().datetime() }).strict();
function scope(req: Request) {
  if (!req.user?.userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  return { orgId: z.string().uuid().parse(req.params.orgId), userId: req.user.userId };
}
function fail(error: unknown, next: NextFunction) { next(error instanceof z.ZodError ? new AppError('Invalid lifecycle request.', 400, 'VALIDATION_ERROR') : error); }
router.patch('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const input = folderInput.parse(req.body); const data = await repository.folder(scope(req), z.string().uuid().parse(req.params.id), input.state, input.expectedState); res.json({ success: true, data }); }
  catch (error) { fail(error, next); }
});
router.patch('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const input = documentInput.parse(req.body); const data = await repository.document(scope(req), z.string().uuid().parse(req.params.id), input.state, input.expectedUpdatedAt); res.json({ success: true, data }); }
  catch (error) { fail(error, next); }
});
export default router;
