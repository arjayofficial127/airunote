/**
 * Error Logger
 * 
 * Centralized error logging service.
 * Currently logs to console, but structured to easily integrate with Sentry or other services.
 */

export interface ErrorContext {
  componentStack?: string;
  errorBoundary?: boolean;
  userId?: string;
  orgId?: string;
  url?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Log an error to the monitoring service
 * 
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function logError(error: Error, context: ErrorContext = {}): void {
  // Collect additional context
  const errorContext: ErrorContext = {
    ...context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: errorContext,
    });
  }

  // TODO: Integrate with Sentry or other error tracking service
  // Example Sentry integration:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     contexts: {
  //       custom: errorContext,
  //     },
  //   });
  // }

  // For now, we'll also log to console in production (can be removed when Sentry is added)
  if (process.env.NODE_ENV === 'production') {
    // In production, you might want to send to your backend API
    // or use a service like Sentry
    console.error('Production error:', error.message, errorContext);
  }
}

/**
 * Log a message (non-error)
 */
export function logMessage(message: string, level: 'info' | 'warning' = 'info', context: ErrorContext = {}): void {
  const logContext: ErrorContext = {
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    if (level === 'warning') {
      console.warn('Warning:', message, logContext);
    } else {
      console.log('Info:', message, logContext);
    }
  }

  // TODO: Integrate with logging service
}

