import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgRole } from '../middleware/requireOrgRole';
import { appearanceService, AppearanceError } from '../../modules/exam-appearance/service';
import {
  appearanceInputSchema,
  templateInputSchema,
  builtinAssets,
} from '../../modules/exam-appearance/contract';
const router: ReturnType<typeof Router> = Router({ mergeParams: true });
router.use(authMiddleware, requireOrgRole(['admin', 'superadmin', 'member']));
const admin = requireOrgRole(['admin', 'superadmin']);
const run =
  (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof AppearanceError) {
        res.status(error instanceof AppearanceError ? error.status : 400).json({
          success: false,
          error: {
            message: error instanceof z.ZodError ? error.issues[0]?.message : error.message,
          },
        });
      } else next(error);
    }
  };
router.get(
  '/assets',
  run(async () => builtinAssets)
);
router.get(
  '/templates',
  run((r) => appearanceService.list(r.params.orgId))
);
router.post(
  '/templates',
  admin,
  run((r) => {
    const v = templateInputSchema.parse(r.body);
    return appearanceService.create(r.params.orgId, r.user!.userId, v.name, v.config);
  })
);
router.put(
  '/templates/:id',
  admin,
  run((r) => {
    const v = templateInputSchema.parse(r.body);
    return appearanceService.update(
      r.params.orgId,
      z.string().uuid().parse(r.params.id),
      v.name,
      v.config,
      v.revision
    );
  })
);
router.post(
  '/templates/:id/archive',
  admin,
  run((r) => appearanceService.archive(r.params.orgId, z.string().uuid().parse(r.params.id)))
);
router.put(
  '/default',
  admin,
  run(async (r) => {
    const v = z.object({ templateId: z.string().uuid().nullable() }).strict().parse(r.body);
    await appearanceService.setDefault(r.params.orgId, v.templateId);
    return v;
  })
);
router.get(
  '/exams/:id',
  run((r) => appearanceService.get(r.params.orgId, z.string().uuid().parse(r.params.id)))
);
router.put(
  '/exams/:id',
  admin,
  run((r) => {
    const v = appearanceInputSchema.parse(r.body);
    return appearanceService.save(
      r.params.orgId,
      z.string().uuid().parse(r.params.id),
      v.config,
      v.templateId,
      v.revision
    );
  })
);
export default router;
