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

      const { user, accessToken, refreshToken } = result.unwrap();

      // Set HttpOnly cookies
      // Use 'none' for cross-domain cookies (frontend and backend on different domains)
      // 'secure' must be true when sameSite is 'none'
      // Check both NODE_ENV and if we're on Render (which uses HTTPS)
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Must be true for sameSite: 'none'
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
        path: '/',
        // Don't set domain - let browser handle it for cross-domain cookies
      };
      
      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Login] Setting cookies with options:', cookieOptions);
      }
      
      res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: { user },
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

    const { user, accessToken, refreshToken } = result.unwrap();

    // Set HttpOnly cookies
    // Use 'none' for cross-domain cookies (frontend and backend on different domains)
    // 'secure' must be true when sameSite is 'none'
    // Check both NODE_ENV and if we're on Render (which uses HTTPS)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Must be true for sameSite: 'none'
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      path: '/',
      // Don't set domain - let browser handle it for cross-domain cookies
    };
    
    console.log('[Login] ===== SETTING COOKIES =====');
    console.log('[Login] isProduction:', isProduction);
    console.log('[Login] cookieOptions:', JSON.stringify(cookieOptions, null, 2));
    console.log('[Login] accessToken length:', accessToken.length);
    console.log('[Login] refreshToken length:', refreshToken.length);
    console.log('[Login] Origin:', req.headers.origin);
    console.log('[Login] User-Agent:', req.headers['user-agent']);
    
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('[Login] ✅ Cookies set successfully');
    console.log('[Login] Response headers:', Object.keys(res.getHeaders()));

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    console.log('[Refresh] ===== REFRESH TOKEN REQUEST =====');
    console.log('[Refresh] Origin:', req.headers.origin);
    console.log('[Refresh] Cookies object:', req.cookies);
    console.log('[Refresh] Cookies keys:', req.cookies ? Object.keys(req.cookies) : 'none');
    console.log('[Refresh] refreshToken cookie:', req.cookies?.refreshToken ? 'EXISTS' : 'MISSING');
    console.log('[Refresh] Cookie header:', req.headers.cookie);
    
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      console.error('[Refresh] ❌ No refresh token found');
      console.error('[Refresh] Full cookie header:', req.headers.cookie);
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token required', code: 'UNAUTHORIZED' },
      });
    }

    console.log('[Refresh] ✅ Refresh token found, length:', refreshToken.length);

    const authUseCase = container.resolve<IAuthUseCase>(TYPES.IAuthUseCase);
    const result = await authUseCase.refreshToken(refreshToken);

    if (result.isErr()) {
      console.error('[Refresh] ❌ Token refresh failed:', result.unwrap());
      return next(result.unwrap());
    }

    const { user, accessToken, refreshToken: newRefreshToken } = result.unwrap();
    console.log('[Refresh] ✅ New tokens generated');

    // Use 'none' for cross-domain cookies (frontend and backend on different domains)
    // 'secure' must be true when sameSite is 'none'
    // Check both NODE_ENV and if we're on Render (which uses HTTPS)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Must be true for sameSite: 'none'
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      path: '/',
      // Don't set domain - let browser handle it for cross-domain cookies
    };
    
    console.log('[Refresh] Setting new cookies with options:', JSON.stringify(cookieOptions, null, 2));
    
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('[Refresh] ✅ New tokens set successfully');

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  // Check both NODE_ENV and if we're on Render (which uses HTTPS)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
    path: '/',
  };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Test endpoint to check if cookies are being received
router.get('/test-cookies', (req: Request, res: Response) => {
  res.json({
    success: true,
    cookies: req.cookies,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
    },
  });
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

