import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IAttachmentUseCase } from '../../application/use-cases/AttachmentUseCase';
import { CreateAttachmentsDto } from '../../application/dtos/attachment.dto';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { orgId, postId } = req.params;
    const input = CreateAttachmentsDto.parse(req.body);
    const attachmentUseCase = container.resolve<IAttachmentUseCase>(
      TYPES.IAttachmentUseCase
    );

    const result = await attachmentUseCase.createMany(
      orgId,
      postId,
      req.user!.userId,
      input
    );

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.status(201).json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const attachmentUseCase = container.resolve<IAttachmentUseCase>(
      TYPES.IAttachmentUseCase
    );

    const result = await attachmentUseCase.findByPostId(postId);

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

router.delete('/:attachmentId', async (req: Request, res: Response, next) => {
  try {
    const { orgId, attachmentId } = req.params;
    const attachmentUseCase = container.resolve<IAttachmentUseCase>(
      TYPES.IAttachmentUseCase
    );

    const result = await attachmentUseCase.delete(
      attachmentId,
      req.user!.userId,
      orgId
    );

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

