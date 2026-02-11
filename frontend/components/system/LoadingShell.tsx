'use client';

import React from 'react';

/**
 * LoadingShell
 * 
 * Neutral, system-level loading UI.
 * No app-specific assumptions.
 * No data-shape coupling.
 */
export function LoadingShell({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-gray-600 text-sm sm:text-base">
          {message || 'Preparing workspace…'}
        </div>
      </div>
    </div>
  );
}
