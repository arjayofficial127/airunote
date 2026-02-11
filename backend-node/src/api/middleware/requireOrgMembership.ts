import { Request, Response, NextFunction } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../core/errors/AppError';

/**
 * Middleware to require user is a member of the organization (any role)
 * This should be applied to all routes under /orgs/:orgId/*
 * 
 * Usage: router.use(requireOrgMembership)
 * 
 * This middleware:
 * - Requires authentication (401 if not authenticated)
 * - Requires org membership (403 if not a member)
 * - Allows any role: member, admin, viewer, moderator, superadmin
 */
export async function requireOrgMembership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orgId } = req.params;
    const userId = req.user?.userId;

    // Check authentication first
    if (!userId) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Check orgId exists in params
    if (!orgId) {
      return next(new NotFoundError('Organization', ''));
    }

    // Check if user is a member of the org (any role)
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
    const orgUser = await orgUserRepo.findByOrgIdAndUserId(orgId, userId);
    
    if (!orgUser) {
      return next(new ForbiddenError('You are not a member of this organization'));
    }

    // User is a member, allow access
    next();
  } catch (error) {
    next(error);
  }
}
