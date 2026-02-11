'use client';

import React from 'react';

/**
 * ErrorShell
 * 
 * Neutral, system-level error UI.
 * No app-specific assumptions.
 * No data-shape coupling.
 */
export function ErrorShell({ 
  error, 
  onRetry 
}: { 
  error?: string | Error | null;
  onRetry?: () => void;
}) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : error || 'Something went wrong. Please refresh.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="mb-4">
          <svg 
            className="w-16 h-16 mx-auto text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Error
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          {errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            Try Again
          </button>
        )}
        {!onRetry && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            Refresh Page
          </button>
        )}
      </div>
    </div>
  );
}
