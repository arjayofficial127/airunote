import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { createHash } from 'node:crypto';

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
    return process.env.NODE_ENV === 'development' || req.path.startsWith('/api/public/exams');
  },
  // Don't count successful requests (only count errors)
  skipSuccessfulRequests: false, // Keep this false to count all requests
});

const publicExamError = {
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many exam requests. Please wait a moment and try again.',
  },
};

// Public exam overview/start requests have no attempt token yet, so protect them by IP.
export const publicExamBrowseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: publicExamError,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: () => process.env.NODE_ENV === 'development',
});

export const publicExamStartRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: publicExamError,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: () => process.env.NODE_ENV === 'development',
});

// Active exam traffic is intentionally keyed per attempt. Heartbeats, question
// activation, and autosaves are normal traffic and must not make respondents on
// the same school/store network consume one shared IP allowance.
export const publicExamAttemptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  // A single attempt can legitimately produce question activations, autosaves,
  // retries after reconnecting, heartbeats, and a final submission. Keep this
  // per-attempt ceiling comfortably above normal exam traffic.
  max: 900,
  message: publicExamError,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const token = req.header('x-exam-attempt-token');
    if (!token) return `missing:${req.ip || 'unknown'}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return `attempt:${tokenHash}`;
  },
  skip: () => process.env.NODE_ENV === 'development',
});

export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req, res) => {
    console.warn('Webhook rate limit exceeded', { ip: req.ip });
    res.status(429).send('Too Many Requests');
  },
});

