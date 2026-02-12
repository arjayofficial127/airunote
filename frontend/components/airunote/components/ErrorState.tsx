/**
 * ErrorState Component
 * Displays error messages with retry option
 */

'use client';

import Link from 'next/link';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  backUrl?: string;
  backLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  backUrl,
  backLabel = 'Back to Home',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="mb-4 text-red-500">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-center space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
          {backUrl && (
            <Link
              href={backUrl}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
