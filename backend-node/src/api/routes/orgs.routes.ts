import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgUseCase } from '../../application/use-cases/OrgUseCase';
import { CreateOrgDto, UpdateOrgDto } from '../../application/dtos/org.dto';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { IJoinCodeRepository } from '../../application/interfaces/IJoinCodeRepository';
import { ISuperAdminRepository } from '../../application/interfaces/ISuperAdminRepository';
import { IJoinRequestUseCase } from '../../application/use-cases/JoinRequestUseCase';
import { ITeamUseCase } from '../../application/use-cases/TeamUseCase';
import { ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgRole } from '../middleware/requireOrgRole';

const router: ReturnType<typeof Router> = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response, next) => {
  try {
    const input = CreateOrgDto.parse(req.body);
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);

    // Auto-generate slug from name if not provided
    const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await orgUseCase.create(
      input.name,
      slug,
      input.description,
      req.user!.userId
    );

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const org = result.unwrap();

    res.status(201).json({
      success: true,
      data: org,
    });
  } catch (error) {
    next(error);
  }
});

// Get org limit info for current user
router.get('/limit', async (req: Request, res: Response, next) => {
  try {
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
    const superAdminRepo = container.resolve<ISuperAdminRepository>(TYPES.ISuperAdminRepository);
    
    const userOrgs = await orgUseCase.findByUserId(req.user!.userId);
    const orgs = userOrgs.isErr() ? [] : userOrgs.unwrap();
    const maxOrgsPerUser = parseInt(process.env.MAX_ORGS_PER_USER || '1', 10);
    
    // Check if user is superadmin
    const superAdmin = await superAdminRepo.findByUserId(req.user!.userId);
    const isSuperAdmin = superAdmin !== null && superAdmin.isActive;
    
    res.json({
      success: true,
      data: {
        currentCount: orgs.length,
        maxAllowed: isSuperAdmin ? null : maxOrgsPerUser, // null means unlimited for superadmin
        canCreate: isSuperAdmin || orgs.length < maxOrgsPerUser,
        isSuperAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
    const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository);
    const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);
    const joinCodeRepo = container.resolve<IJoinCodeRepository>(TYPES.IJoinCodeRepository);

    const result = await orgUseCase.findByUserId(req.user!.userId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const orgs = result.unwrap();

    // Enhance each org with user's roles and join code data
    const orgsWithRoles = await Promise.all(
      orgs.map(async (org) => {
        const orgUser = await orgUserRepo.findByOrgIdAndUserId(org.id, req.user!.userId);
        let roles: string[] = [];
        if (orgUser) {
          const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
          const roleIds = orgUserRoles.map((our) => our.roleId);
          const roleObjects = await Promise.all(
            roleIds.map((roleId) => roleRepo.findById(roleId))
          );
          roles = roleObjects.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name);
        }

        // Fetch join code if exists
        const joinCode = await joinCodeRepo.findByOrgId(org.id);

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          isActive: org.isActive,
          createdAt: org.createdAt,
          roles,
          // Join code fields
          joinCode: joinCode?.code || null,
          joinCodeMaxUses: joinCode?.maxUses || null,
          joinCodeUsedCount: joinCode?.usedCount || 0,
          joinCodeAllowedDomains: joinCode?.allowedDomains || null,
          joinCodeIsActive: joinCode?.isActive || false,
          joinCodeExpiresAt: joinCode?.expiresAt ? joinCode.expiresAt.toISOString() : null,
          joinCodeDefaultRoleId: joinCode?.defaultRoleId || null,
        };
      })
    );

    res.json({
      success: true,
      data: orgsWithRoles,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:orgId', async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
    const joinCodeRepo = container.resolve<IJoinCodeRepository>(TYPES.IJoinCodeRepository);
    const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
    const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository);
    const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);

    const result = await orgUseCase.findById(orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const org = result.unwrap();

    // Fetch join code if exists
    const joinCode = await joinCodeRepo.findByOrgId(orgId);

    // Get user's roles in this org
    const orgUser = await orgUserRepo.findByOrgIdAndUserId(org.id, req.user!.userId);
    let roles: string[] = [];
    if (orgUser) {
      const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
      const roleIds = orgUserRoles.map((our) => our.roleId);
      const roleObjects = await Promise.all(
        roleIds.map((roleId) => roleRepo.findById(roleId))
      );
      roles = roleObjects.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name);
    }

    // Combine org with join code data
    const orgWithJoinCode = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      isActive: org.isActive,
      createdAt: org.createdAt,
      roles,
      // Join code fields
      joinCode: joinCode?.code || null,
      joinCodeMaxUses: joinCode?.maxUses || null,
      joinCodeUsedCount: joinCode?.usedCount || 0,
      joinCodeAllowedDomains: joinCode?.allowedDomains || null,
      joinCodeIsActive: joinCode?.isActive || false,
      joinCodeExpiresAt: joinCode?.expiresAt ? joinCode.expiresAt.toISOString() : null,
      joinCodeDefaultRoleId: joinCode?.defaultRoleId || null,
    };

    res.json({
      success: true,
      data: orgWithJoinCode,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:orgId', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const input = UpdateOrgDto.parse(req.body);
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);

    const result = await orgUseCase.update(orgId, input);

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

router.delete('/:orgId', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);

    const result = await orgUseCase.delete(orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Generate join code (Admin only)
router.post('/:orgId/join-code/generate', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
    const joinCodeRepo = container.resolve<IJoinCodeRepository>(TYPES.IJoinCodeRepository);

    const result = await orgUseCase.generateJoinCode(orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    // Get the generated code
    const joinCode = await joinCodeRepo.findByOrgId(orgId);

    res.json({
      success: true,
      data: { joinCode: joinCode?.code || null },
    });
  } catch (error) {
    next(error);
  }
});

// Update join code settings (Admin only)
router.patch('/:orgId/join-code/settings', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const { isActive, maxUses, allowedDomains, expiresAt, defaultRoleId, defaultTeamId, requiresApproval, welcomeMessage, visibility, notifyAdminsOnJoin } = req.body;
    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);

    const settings: {
      isActive?: boolean;
      maxUses?: number | null;
      allowedDomains?: string[] | null;
      expiresAt?: Date | null;
      defaultRoleId?: number | null;
      defaultTeamId?: string | null;
      requiresApproval?: boolean;
      welcomeMessage?: string | null;
      visibility?: 'private' | 'public';
      notifyAdminsOnJoin?: boolean;
    } = {};

    if (isActive !== undefined) settings.isActive = Boolean(isActive);
    if (maxUses !== undefined) settings.maxUses = maxUses === null || maxUses === '' ? null : Number(maxUses);
    if (allowedDomains !== undefined) settings.allowedDomains = Array.isArray(allowedDomains) ? allowedDomains : null;
    if (expiresAt !== undefined) settings.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (defaultRoleId !== undefined) settings.defaultRoleId = defaultRoleId ? Number(defaultRoleId) : null;
    if (defaultTeamId !== undefined) settings.defaultTeamId = defaultTeamId || null;
    if (requiresApproval !== undefined) settings.requiresApproval = Boolean(requiresApproval);
    if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage || null;
    if (visibility !== undefined) settings.visibility = visibility;
    if (notifyAdminsOnJoin !== undefined) settings.notifyAdminsOnJoin = Boolean(notifyAdminsOnJoin);

    const result = await orgUseCase.updateJoinCodeSettings(orgId, settings);

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

// Join organization with code (requires auth but no org membership)
router.post('/join', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Join code is required', code: 'VALIDATION_ERROR' },
      });
    }

    const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
    const userRepo = container.resolve<IUserRepository>(TYPES.IUserRepository);

    // Get user email
    const user = await userRepo.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    const result = await orgUseCase.joinWithCode(code, req.user!.userId, user.email);

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

// Join Requests routes
router.get('/:orgId/join-requests', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const joinRequestUseCase = container.resolve<IJoinRequestUseCase>(TYPES.IJoinRequestUseCase);

    const result = await joinRequestUseCase.listPending(orgId);

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

router.post('/:orgId/join-requests/:requestId/approve', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { requestId } = req.params;
    const joinRequestUseCase = container.resolve<IJoinRequestUseCase>(TYPES.IJoinRequestUseCase);

    const result = await joinRequestUseCase.approve(requestId, req.user!.userId);

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

router.post('/:orgId/join-requests/:requestId/reject', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const joinRequestUseCase = container.resolve<IJoinRequestUseCase>(TYPES.IJoinRequestUseCase);

    const result = await joinRequestUseCase.reject(requestId, req.user!.userId, reason);

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

// Teams routes
router.post('/:orgId/teams', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const { name, description, leadUserId } = req.body;
    const teamUseCase = container.resolve<ITeamUseCase>(TYPES.ITeamUseCase);

    const result = await teamUseCase.create(orgId, name, description, leadUserId);

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

router.get('/:orgId/teams', requireOrgRole(['admin', 'superadmin', 'member', 'viewer']), async (req: Request, res: Response, next) => {
  try {
    const { orgId } = req.params;
    const teamUseCase = container.resolve<ITeamUseCase>(TYPES.ITeamUseCase);

    const result = await teamUseCase.findByOrgId(orgId);

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

router.patch('/:orgId/teams/:teamId', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId, teamId } = req.params;
    const { name, description, leadUserId } = req.body;
    const teamUseCase = container.resolve<ITeamUseCase>(TYPES.ITeamUseCase);

    const result = await teamUseCase.update(teamId, orgId, { name, description, leadUserId });

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

router.delete('/:orgId/teams/:teamId', requireOrgRole(['admin', 'superadmin']), async (req: Request, res: Response, next) => {
  try {
    const { orgId, teamId } = req.params;
    const teamUseCase = container.resolve<ITeamUseCase>(TYPES.ITeamUseCase);

    const result = await teamUseCase.delete(teamId, orgId);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;




