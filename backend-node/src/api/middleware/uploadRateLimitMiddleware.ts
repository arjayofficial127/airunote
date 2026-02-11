import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiting for file upload tickets
 * Max 3 upload tickets per (ip + userAgent + userId) within 1 hour
 */
export const uploadTicketRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 upload tickets per window
  message: 'Too many upload requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = req.user?.userId || 'anonymous';
    // Combine all three for granular rate limiting
    return `upload:${ip}:${userAgent}:${userId}`;
  },
  skip: (req: Request) => {
    // Skip in development
    return process.env.NODE_ENV === 'development';
  },
});
