'use client';

import React from 'react';
import { LoadingShell } from './LoadingShell';
import { ErrorShell } from './ErrorShell';

/**
 * Provider status type
 */
type ProviderStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Provider state shape
 */
interface ProviderState {
  status: ProviderStatus;
  error?: string | Error | null;
}

/**
 * SessionBoundary
 * 
 * Gates rendering based on multiple provider states.
 * 
 * Rules:
 * - Shows LoadingShell if ANY state is 'loading'
 * - Shows ErrorShell if ANY state is 'error'
 * - Renders children only when ALL states are 'ready'
 * 
 * No provider logic inside this component.
 */
export function SessionBoundary({
  states,
  children,
  loadingMessage,
  onRetry,
}: {
  states: ProviderState[];
  children: React.ReactNode;
  loadingMessage?: string;
  onRetry?: () => void;
}) {
  // Check if any state is loading
  const isLoading = states.some(state => state.status === 'loading');
  
  // Check if any state is error
  const hasError = states.some(state => state.status === 'error');
  
  // Get first error (if any)
  const error = states.find(state => state.status === 'error')?.error;
  
  // Check if all states are ready
  const allReady = states.every(state => state.status === 'ready');
  
  // Show loading if any provider is loading
  if (isLoading) {
    return <LoadingShell message={loadingMessage} />;
  }
  
  // Show error if any provider has error
  if (hasError) {
    return <ErrorShell error={error} onRetry={onRetry} />;
  }
  
  // Show children only when all providers are ready
  if (allReady) {
    return <>{children}</>;
  }
  
  // Fallback: if not loading, not error, and not all ready, show loading
  // This handles 'idle' states
  return <LoadingShell message={loadingMessage} />;
}
