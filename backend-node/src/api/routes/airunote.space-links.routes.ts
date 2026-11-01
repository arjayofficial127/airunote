import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { SpaceLinksRepository, spaceLinkSchema } from '../../modules/airunote/space-links.repository';
import { AppError } from '../../core/errors/AppError';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });
const repository = new SpaceLinksRepository();
async function change(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const scope = { orgId: z.string().uuid().parse(req.params.orgId), userId: req.user.userId };
    const link = spaceLinkSchema.parse(req.body);
    const data = await repository.change(scope, z.string().uuid().parse(req.params.folderId), link, req.method === 'DELETE');
    res.json({ success: true, data });
  } catch (error) { next(error instanceof z.ZodError ? new AppError('Invalid Space link request.', 400, 'VALIDATION_ERROR') : error); }
}
// Authentication and membership are applied by the parent router.
router.post('/folders/:folderId/links', change);
router.delete('/folders/:folderId/links', change);
export default router;
