import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { ICommentUseCase } from '../../application/use-cases/CommentUseCase';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { CreateCommentDto, UpdateCommentDto } from '../../application/dtos/comment.dto';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const commentUseCase = container.resolve<ICommentUseCase>(TYPES.ICommentUseCase);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);

    const result = await commentUseCase.findByPostId(postId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const comments = result.unwrap();
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await userRepo.findById(comment.authorUserId);
        return {
          ...comment,
          author: author ? { id: author.id, name: author.name } : null,
        };
      })
    );

    res.json({
      success: true,
      data: commentsWithAuthors,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { postId } = req.params;
    const input = CreateCommentDto.parse(req.body);
    const commentUseCase = container.resolve<ICommentUseCase>(TYPES.ICommentUseCase);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);

    const result = await commentUseCase.create(postId, req.user!.userId, input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const comment = result.unwrap();
    const author = await userRepo.findById(comment.authorUserId);

    res.status(201).json({
      success: true,
      data: {
        ...comment,
        author: author ? { id: author.id, name: author.name } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:commentId', async (req: Request, res: Response, next) => {
  try {
    const { commentId } = req.params;
    const input = UpdateCommentDto.parse(req.body);
    const commentUseCase = container.resolve<ICommentUseCase>(TYPES.ICommentUseCase);

    const result = await commentUseCase.update(commentId, req.user!.userId, input);

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

router.delete('/:commentId', async (req: Request, res: Response, next) => {
  try {
    const { commentId } = req.params;
    const commentUseCase = container.resolve<ICommentUseCase>(TYPES.ICommentUseCase);

    const result = await commentUseCase.delete(commentId, req.user!.userId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

