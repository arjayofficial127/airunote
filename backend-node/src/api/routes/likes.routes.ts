import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { ILikeUseCase } from '../../application/use-cases/LikeUseCase';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

router.post('/toggle', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const likeUseCase = container.resolve<ILikeUseCase>(TYPES.ILikeUseCase);

    const result = await likeUseCase.toggleLike(postId, req.user!.userId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/count', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const likeUseCase = container.resolve<ILikeUseCase>(TYPES.ILikeUseCase);

    const result = await likeUseCase.getLikeCount(postId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: { count: result.unwrap() },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const likeUseCase = container.resolve<ILikeUseCase>(TYPES.ILikeUseCase);

    const result = await likeUseCase.hasUserLiked(postId, req.user!.userId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
      data: { liked: result.unwrap() },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

