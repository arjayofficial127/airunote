import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { IOrgRepository } from '../../application/interfaces/IOrgRepository';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const orgRepo = container.resolve<IOrgRepository>(TYPES.IOrgRepository);
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
    const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository);
    const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);

    // Verify org exists
    const org = await orgRepo.findById(orgId);
    if (!org) {
      return next(new Error('Organization not found'));
    }

    // Verify user has access to org
    const currentUserOrg = await orgUserRepo.findByOrgIdAndUserId(orgId, req.user!.userId);
    if (!currentUserOrg) {
      return next(new Error('You do not have access to this organization'));
    }

    // Get all org members
    const orgUsers = await orgUserRepo.findByOrgId(orgId);

    // Enhance with user info and roles
    const members = await Promise.all(
      orgUsers.map(async (orgUser) => {
        const user = await userRepo.findById(orgUser.userId);
        if (!user) {
          return null;
        }

        const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
        const roleIds = orgUserRoles.map((our) => our.roleId);
        const roles = await Promise.all(
          roleIds.map((roleId) => roleRepo.findById(roleId))
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: roles.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name),
          joinedAt: orgUser.createdAt,
        };
      })
    );

    res.json({
      success: true,
      data: members.filter((m): m is NonNullable<typeof m> => m !== null),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

