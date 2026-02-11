import { Request, Response, NextFunction } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { ForbiddenError, NotFoundError } from '../../core/errors/AppError';

export type RequiredRole = 'admin' | 'member' | 'viewer' | 'superadmin';

/**
 * Middleware to require user has specific role in organization
 * Usage: router.put('/:orgId', requireOrgRole(['admin']), handler)
 */
export function requireOrgRole(allowedRoles: RequiredRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new ForbiddenError('Authentication required'));
      }

      if (!orgId) {
        return next(new NotFoundError('Organization', ''));
      }

      const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
      const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(
        TYPES.IOrgUserRoleRepository
      );
      const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);

      // Check if user is member of org
      const orgUser = await orgUserRepo.findByOrgIdAndUserId(orgId, userId);
      if (!orgUser) {
        return next(new ForbiddenError('You are not a member of this organization'));
      }

      // Get user's roles in org
      const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
      const roleIds = orgUserRoles.map((our) => our.roleId);
      const roles = await Promise.all(
        roleIds.map((roleId) => roleRepo.findById(roleId))
      );

      const userRoleCodes = roles
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.code.toLowerCase());

      // Check if user has SuperAdmin role (global access)
      if (userRoleCodes.includes('superadmin')) {
        return next();
      }

      // Check if user has any of the required roles
      const hasRequiredRole = allowedRoles.some((role) => {
        const roleCode = role === 'superadmin' ? 'superadmin' : role;
        return userRoleCodes.includes(roleCode);
      });

      if (!hasRequiredRole) {
        return next(
          new ForbiddenError(
            `This action requires one of the following roles: ${allowedRoles.join(', ')}`
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

