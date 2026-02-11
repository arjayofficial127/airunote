import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiting middleware
 * MVP: Simple in-memory rate limiting
 * TODO: Use Redis for distributed systems
 */

// Auth rate limit - for login/registration
// Uses IP + email combination to prevent one user from blocking others on same IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per window per IP+email combination
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + email combination to prevent blocking legitimate users on same network
  // This way, one user's failed attempts won't block others on the same IP
  keyGenerator: (req: Request) => {
    const ip = req.ip || 'unknown';
    // Try to get email from body (login/register requests)
    const email = req.body?.email || req.body?.username || '';
    // Combine IP and email for more granular rate limiting
    // If no email provided, fall back to IP-only (for registration attempts)
    return email ? `${ip}:${email.toLowerCase()}` : ip;
  },
});

// API rate limit - for authenticated requests (user-based) and unauthenticated (IP-based)
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Higher limit for authenticated users (account-based)
    // Lower limit for unauthenticated requests (IP-based)
    return req.user?.userId ? 1000 : 100;
  },
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID for authenticated requests, IP for unauthenticated
  keyGenerator: (req: Request) => {
    // If user is authenticated, use their user ID (account-based)
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // Otherwise, use IP address (for unauthenticated requests)
    return req.ip || 'unknown';
  },
  // Skip rate limiting in development
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'development';
  },
  // Don't count successful requests (only count errors)
  skipSuccessfulRequests: false, // Keep this false to count all requests
});

