import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request { rateLimitUserId?: string }
  }
}

/** Verify identity for quota selection only; route authentication still runs normally. */
export function rateLimitIdentity(verify: (token: string) => { userId: string } | null): RequestHandler {
  return (req, _res, next) => {
    req.rateLimitUserId = undefined;
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '');
    if (match) {
      try {
        const payload = verify(match[1]);
        if (payload && typeof payload.userId === 'string' && payload.userId.length > 0) {
          req.rateLimitUserId = payload.userId;
        }
      } catch {
        // Invalid/expired credentials retain the anonymous quota.
      }
    }
    next();
  };
}
