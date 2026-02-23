/**
 * CreateDesktopLensModal Component
 * Phase 5 — Desktop Lenses
 * 
 * Modal for creating a new desktop lens
 */

'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { toast } from '@/lib/toast';
import type { AiruLens } from '../types';

interface CreateDesktopLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  onSuccess?: (lens: AiruLens) => void;
}

export function CreateDesktopLensModal({
  isOpen,
  onClose,
  orgId,
  userId,
  onSuccess,
}: CreateDesktopLensModalProps) {
  const [lensName, setLensName] = useState('');
  const [queryText, setQueryText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Parse query if provided
      let query: Record<string, unknown> | null = null;
      if (queryText.trim()) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(queryText.trim());
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            query = parsed;
          } else {
            // Invalid JSON structure, treat as text search
            query = { text: queryText.trim() };
          }
        } catch {
          // If not valid JSON, treat as text search
          query = { text: queryText.trim() };
        }
      }

      const response = await airunoteApi.createDesktopLens(
        orgId,
        userId,
        lensName.trim(),
        query || null,
        {},
        'desktop'
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create desktop lens');
      }
      return response.data.lens;
    },
    onSuccess: (lens) => {
      queryClient.invalidateQueries({ queryKey: ['lens'] });
      toast('Desktop lens created successfully', 'success');
      setLensName('');
      setQueryText('');
      setError(null);
      onSuccess?.(lens);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create desktop lens');
      toast(err instanceof Error ? err.message : 'Failed to create desktop lens', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lensName.trim()) {
      setError('Lens name is required');
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    setLensName('');
    setQueryText('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Create Desktop Lens</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="lensName" className="block text-sm font-medium text-gray-700 mb-2">
              Lens Name
            </label>
            <input
              type="text"
              id="lensName"
              value={lensName}
              onChange={(e) => setLensName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter lens name"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="queryText" className="block text-sm font-medium text-gray-700 mb-2">
              Query (Optional)
            </label>
            <textarea
              id="queryText"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='JSON query or plain text (e.g., {"state": "active", "text": "search"} or just "search term")'
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter a JSON query object or plain text for text search. Examples:
              <br />
              • <code>{'{'}&quot;state&quot;: &quot;active&quot;{'}'}</code> - Filter by state
              <br />
              • <code>{'{'}&quot;text&quot;: &quot;search term&quot;{'}'}</code> - Text search
              <br />
              • <code>{'{'}&quot;tags&quot;: [&quot;#priority&quot;]{'}'}</code> - Tag filter (future)
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Lens'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
