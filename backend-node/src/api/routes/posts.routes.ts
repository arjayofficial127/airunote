import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IPostUseCase } from '../../application/use-cases/PostUseCase';
import { IPostRepository } from '../../application/interfaces/IPostRepository';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { IAttachmentRepository } from '../../application/interfaces/IAttachmentRepository';
import { ICommentRepository } from '../../application/interfaces/ICommentRepository';
import { ILikeRepository } from '../../application/interfaces/ILikeRepository';
import { CreatePostDto, UpdatePostDto } from '../../application/dtos/post.dto';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = Math.floor(offset / limit) + 1;

    const postUseCase = container.resolve<IPostUseCase>(TYPES.IPostUseCase);
    const postRepo = container.resolve<IPostRepository>(TYPES.IPostRepository);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);
    
    const result = await postUseCase.listByOrg(orgId, limit, offset);
    const total = await postRepo.countByOrgId(orgId);
    const totalPages = Math.ceil(total / limit);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const posts = result.unwrap();
    
    // Fetch author info for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await userRepo.findById(post.authorUserId);
        return {
          ...post,
          author: author ? { id: author.id, name: author.name, email: author.email } : null,
        };
      })
    );

    res.json({
      success: true,
      data: postsWithAuthors,
      pagination: {
        total,
        totalPages,
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const input = CreatePostDto.parse(req.body);
    const postUseCase = container.resolve<IPostUseCase>(TYPES.IPostUseCase);

    // Validate attachments if provided
    if (input.attachments) {
      // Attachments are validated by DTO schema
      // They should come from UploadThing with metadata
    }

    const result = await postUseCase.create(orgId, req.user!.userId, input);

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

router.get('/:postId', async (req: Request, res: Response, next) => {
  try {
    const { orgId, postId } = req.params;
    const postUseCase = container.resolve<IPostUseCase>(TYPES.IPostUseCase);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const attachmentRepo = container.resolve<IAttachmentRepository>(TYPES.IAttachmentRepository);
    const commentRepo = container.resolve<ICommentRepository>(TYPES.ICommentRepository);
    const likeRepo = container.resolve<ILikeRepository>(TYPES.ILikeRepository);

    const result = await postUseCase.getById(postId, orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const post = result.unwrap();

    // Fetch author
    const author = await userRepo.findById(post.authorUserId);

    // Fetch attachments
    const attachments = await attachmentRepo.findByPostId(postId);

    // Fetch comments
    const comments = await commentRepo.findByPostId(postId);
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const commentAuthor = await userRepo.findById(comment.authorUserId);
        return {
          ...comment,
          author: commentAuthor ? { id: commentAuthor.id, name: commentAuthor.name } : null,
        };
      })
    );

    // Fetch like count and user liked status
    const likes = await likeRepo.findByPostId(postId);
    const likeCount = likes.length;
    const userLiked = likes.some((like) => like.userId === req.user!.userId);

    res.json({
      success: true,
      data: {
        ...post,
        author: author ? { id: author.id, name: author.name, email: author.email } : null,
        attachments,
        comments: commentsWithAuthors,
        likeCount,
        userLiked,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:postId', async (req: Request, res: Response, next) => {
  try {
    const { orgId, postId } = req.params;
    const input = UpdatePostDto.parse(req.body);
    const postUseCase = container.resolve<IPostUseCase>(TYPES.IPostUseCase);

    const result = await postUseCase.update(postId, req.user!.userId, orgId, input);

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

router.delete('/:postId', async (req: Request, res: Response, next) => {
  try {
    const { orgId, postId } = req.params;
    const postUseCase = container.resolve<IPostUseCase>(TYPES.IPostUseCase);

    const result = await postUseCase.delete(postId, req.user!.userId, orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

