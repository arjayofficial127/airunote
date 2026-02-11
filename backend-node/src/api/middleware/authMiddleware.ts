import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '../../infrastructure/services/TokenService';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { UnauthorizedError } from '../../core/errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AuthMiddleware] Path:', req.path);
    }

    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AuthMiddleware] No token provided');
      }
      throw new UnauthorizedError('No token provided');
    }

    const tokenService = container.resolve<ITokenService>(TYPES.ITokenService);
    const payload = tokenService.verifyAccessToken(token);

    if (!payload) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AuthMiddleware] Token verification failed');
      }
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[AuthMiddleware] Error:', error);
    }
    next(error);
  }
}

