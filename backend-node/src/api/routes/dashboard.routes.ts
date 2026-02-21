import { Router, Request, Response, NextFunction } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IPostRepository } from '../../application/interfaces/IPostRepository';
import { ICollectionRepository } from '../../application/interfaces/ICollectionRepository';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { authMiddleware } from '../middleware/authMiddleware';
import { ForbiddenError, UnauthorizedError } from '../../core/errors/AppError';

const router: ReturnType<typeof Router> = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Middleware to validate org membership from query params
 */
async function requireOrgMembershipFromQuery(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.query.orgId as string;
    const userId = req.user?.userId;

    // Check authentication first
    if (!userId) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Check orgId exists in query
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: { message: 'orgId is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }

    // Check if user is a member of the org
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
    const orgUser = await orgUserRepo.findByOrgIdAndUserId(orgId, userId);
    
    if (!orgUser || !orgUser.isActive) {
      return next(new ForbiddenError('You are not a member of this organization'));
    }

    // User is a member, allow access
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /dashboard/admin
 * Get admin dashboard statistics for an organization
 * Query params: orgId (required)
 */
router.get('/admin', requireOrgMembershipFromQuery, async (req: Request, res: Response, next) => {
  try {
    const orgId = req.query.orgId as string;

    // Resolve repositories
    const postRepo = container.resolve<IPostRepository>(TYPES.IPostRepository);
    const collectionRepo = container.resolve<ICollectionRepository>(TYPES.ICollectionRepository);
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);

    // Fetch stats in parallel
    const [totalPosts, collections, orgUsers, recentPosts] = await Promise.all([
      postRepo.countByOrgId(orgId),
      collectionRepo.findByOrgId(orgId),
      orgUserRepo.findByOrgId(orgId),
      postRepo.findByOrgId(orgId, 5, 0, { includeContent: false }), // Get 5 most recent posts (metadata only)
    ]);

    // Filter active members only
    const activeMembers = orgUsers.filter(ou => ou.isActive);
    const totalMembers = activeMembers.length;
    const totalCollections = collections.length;

    // Format recent posts
    const formattedRecentPosts = recentPosts.slice(0, 5).map(post => ({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt.toISOString(),
      authorUserId: post.authorUserId,
    }));

    // Return dashboard data
    res.json({
      success: true,
      data: {
        stats: {
          totalPages: 0, // Pages feature not implemented yet
          totalMembers,
          totalPosts,
          totalCollections,
        },
        recentPosts: formattedRecentPosts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/member
 * Get member dashboard statistics for an organization
 * Query params: orgId (required)
 */
router.get('/member', requireOrgMembershipFromQuery, async (req: Request, res: Response, next) => {
  try {
    const orgId = req.query.orgId as string;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required', code: 'VALIDATION_ERROR' },
      });
    }

    // Resolve repositories
    const postRepo = container.resolve<IPostRepository>(TYPES.IPostRepository);
    const userId = req.user!.userId;

    // Fetch all org posts and filter by author
    const allPosts = await postRepo.findByOrgId(orgId, 100, 0, { includeContent: false });
    const userPosts = allPosts
      .filter(post => post.authorUserId === userId)
      .slice(0, 10);

    // Return member dashboard data
    res.json({
      success: true,
      data: {
        myPosts: userPosts.map(post => ({
          id: post.id,
          title: post.title,
          createdAt: post.createdAt.toISOString(),
          isPublished: post.isPublished,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
