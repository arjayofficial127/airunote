import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors/AppError';
import { CollectionsRepository } from '../../modules/airunote/collections.repository';
import { createCollectionSchema, updateCollectionSchema, addReferencesSchema, placementPatchSchema } from '../../modules/airunote/collections.contract';
const router: ReturnType<typeof Router> = Router({ mergeParams: true });
const repository = new CollectionsRepository();
function handler(action: (req: Request, scope: { orgId: string; userId: string }) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      const scope = { orgId: z.string().uuid().parse(req.params.orgId), userId: req.user.userId };
      if (req.params.id) z.string().uuid().parse(req.params.id);
      res.json({ success: true, data: await action(req, scope) });
    } catch (error) { next(error instanceof z.ZodError ? new AppError(error.issues[0]?.message ?? 'Invalid collection request.', 400, 'VALIDATION_ERROR') : error); }
  };
}
router.get('/', handler((_req, scope) => repository.list(scope)));
router.post('/', handler((req, scope) => repository.create(scope, createCollectionSchema.parse(req.body))));
router.get('/:id', handler((req, scope) => repository.get(scope, req.params.id!)));
router.patch('/:id', handler((req, scope) => repository.update(scope, req.params.id!, updateCollectionSchema.parse(req.body))));
router.post('/:id/duplicate', handler((req, scope) => {
  const value = z.object({ name: z.string().trim().min(1).max(120), homeFolderId: z.string().uuid().optional() }).strict().parse(req.body);
  return repository.duplicate(scope, req.params.id!, value.name, value.homeFolderId);
}));
router.post('/:id/items', handler((req, scope) => repository.add(scope, req.params.id!, addReferencesSchema.parse(req.body))));
router.patch('/:id/items', handler((req, scope) => {
  const value = z.object({ revision: z.number().int().positive(), items: z.array(placementPatchSchema).min(1).max(1000) }).strict().parse(req.body);
  return repository.arrange(scope, req.params.id!, value.revision, value.items);
}));
router.delete('/:id/items/:placementId', handler((req, scope) => repository.remove(scope, req.params.id!, z.object({ revision: z.number().int().positive() }).strict().parse(req.body).revision, z.string().uuid().parse(req.params.placementId))));
export default router;
