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
    // Extract token from Authorization header only
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const tokenService = container.resolve<ITokenService>(TYPES.ITokenService);
    const payload = tokenService.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

