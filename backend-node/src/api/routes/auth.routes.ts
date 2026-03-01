import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IAuthUseCase } from '../../application/use-cases/AuthUseCase';
import { RegisterDto, LoginDto } from '../../application/dtos/auth.dto';
import { authRateLimit } from '../middleware/rateLimitMiddleware';
import { authMiddleware } from '../middleware/authMiddleware';
import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { ISuperAdminRepository } from '../../application/interfaces/ISuperAdminRepository';
import { IOrgUserRepository } from '../../application/interfaces/IOrgUserRepository';
import { IOrgUseCase } from '../../application/use-cases/OrgUseCase';
import { IOrgUserRoleRepository } from '../../application/interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../../application/interfaces/IRoleRepository';
import { IJoinCodeRepository } from '../../application/interfaces/IJoinCodeRepository';
import { EmailService } from '../../infrastructure/email/email.service';

const router: ReturnType<typeof Router> = Router();

router.post(
  '/register',
  authRateLimit,
  async (req: Request, res: Response, next) => {
    try {
      const secret = req.query.secret as string;
      if (!secret) {
        return res.status(400).json({
          success: false,
          error: { message: 'Registration secret is required', code: 'VALIDATION_ERROR' },
        });
      }

      const input = RegisterDto.parse({ ...req.body, secret });
      const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

      const result = await authUseCase.register(input);

      if (result.isErr()) {
        return next(result.unwrap());
      }

      const { user, accessToken } = result.unwrap();

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login', authRateLimit, async (req: Request, res: Response, next) => {
  try {
    const input = LoginDto.parse(req.body);
    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);

    const result = await authUseCase.login(input);

    if (result.isErr()) {
      return next(result.unwrap());
    }

    const { user, accessToken } = result.unwrap();

    // Send login success email (non-blocking, controlled by IS_EMAIL_LOGIN env var)
    const isEmailLoginEnabled = process.env.IS_EMAIL_LOGIN === 'true';
    if (isEmailLoginEnabled) {
      try {
        const emailService = new EmailService();
        const loginTime = new Date().toLocaleString('en-US', {
          timeZone: 'UTC',
          dateStyle: 'full',
          timeStyle: 'long',
        });
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const result = await emailService.sendLoginSuccessEmail({
          to: user.email,
          userName: user.name || 'there',
          loginTime,
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        });

        if (result.success) {
          console.log(`[Login] ✅ Login success email sent to ${user.email}`);
        } else {
          console.log(`[Login] ❌ Login success email NOT sent to ${user.email}: ${result.message}`);
        }
      } catch (emailError) {
        // Log error but don't block login
        console.error('[Login] ❌ Failed to send login success email:', emailError);
      }
    } else {
      console.log('[Login] ⚠️ Login email NOT sent: IS_EMAIL_LOGIN is not enabled');
    }

    res.json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint - disabled for MVP (Bearer-only)
// TODO: Re-enable with refreshToken in request body when needed
router.post('/refresh', async (req: Request, res: Response) => {
  return res.status(501).json({
    success: false,
    error: { message: 'Refresh token endpoint disabled for MVP', code: 'NOT_IMPLEMENTED' },
  });
});

router.post('/logout', (_req: Request, res: Response) => {
  // No cookie clearing needed for Bearer-only auth
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const user = await userRepository.findById(req.user!.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const userId = req.user!.userId;

    // Only allow updating name (email should not be changed)
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name is required', code: 'VALIDATION_ERROR' },
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name must be 255 characters or less', code: 'VALIDATION_ERROR' },
      });
    }

    const updatedUser = await userRepository.update(userId, { name: name.trim() });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Lightweight /auth/me/full endpoint - returns user, isSuperAdmin, org (with permissions), and installed apps
// Skips available apps (fetch separately, cache aggressively)
// Optional orgId query param - if provided, includes org data and installed apps
router.get('/me/full', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string | undefined;

    // Resolve repositories and use cases
    const userRepository = container.resolve<IUserRepository>(TYPES.IUserRepository);
    const superAdminRepo = container.resolve<ISuperAdminRepository>(TYPES.ISuperAdminRepository);
    
    // Get user data
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    // Get super admin status
    const superAdmin = await superAdminRepo.findByUserId(userId);
    const isSuperAdmin = superAdmin !== null && superAdmin.isActive;

    // Base response
    const responseData: any = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isSuperAdmin,
      org: null,
      permissions: null,
    };

    // If orgId provided, fetch org data, permissions, and installed apps
    if (orgId) {
      const orgUseCase = container.resolve<IOrgUseCase>(TYPES.IOrgUseCase);
      const orgUserRepo = container.resolve<IOrgUserRepository>(TYPES.IOrgUserRepository);
      const orgUserRoleRepo = container.resolve<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository);
      const roleRepo = container.resolve<IRoleRepository>(TYPES.IRoleRepository);
      const joinCodeRepo = container.resolve<IJoinCodeRepository>(TYPES.IJoinCodeRepository);

      // Get org data
      const orgResult = await orgUseCase.findById(orgId);
      if (orgResult.isOk()) {
        const org = orgResult.unwrap();
        
        // Get join code if exists
        const joinCode = await joinCodeRepo.findByOrgId(orgId);

        // Get user's roles in this org
        const orgUser = await orgUserRepo.findByOrgIdAndUserId(org.id, userId);
        let roles: string[] = [];
        if (orgUser) {
          const orgUserRoles = await orgUserRoleRepo.findByOrgUserId(orgUser.id);
          const roleIds = orgUserRoles.map((our) => our.roleId);
          const roleObjects = await Promise.all(
            roleIds.map((roleId) => roleRepo.findById(roleId))
          );
          roles = roleObjects.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name);
        }

        // Build org object with join code data
        responseData.org = {
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

        // Build permissions
        responseData.permissions = {
          isAdmin: roles.some((role: string) => role.toLowerCase() === 'admin'),
          isMember: roles.length > 0,
          roles,
        };
      }
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

