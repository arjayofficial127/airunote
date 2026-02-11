import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError';
import { Result } from '../../core/result/Result';
import { ILogger } from '../../core/logger/Logger';
import { container } from '../../core/di/container';

export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const logger = container.resolve<ILogger>('ILogger');

  // Log error
  logger.error('Request error', err);

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  // Handle Result errors
  if (err && typeof err === 'object' && 'isErr' in err) {
    const result = err as unknown as Result<unknown, Error>;
    if (result.isErr()) {
      const error = result.unwrap();
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        });
        return;
      }
    }
  }

  // Default 500 error
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}

