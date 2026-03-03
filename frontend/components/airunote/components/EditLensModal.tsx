/**
 * Edit Lens Modal
 * Allows editing a lens name
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { updateFolderLens, updateDesktopLens } from '@/lib/api/airunoteLensesApi';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface EditLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lens: AiruLens) => void;
  lens: AiruLens | null;
  orgId: string;
  folderId?: string | null; // If provided, it's a folder lens; otherwise desktop/saved
}

export function EditLensModal({
  isOpen,
  onClose,
  onSuccess,
  lens,
  orgId,
  folderId,
}: EditLensModalProps) {
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Update name when lens changes
  useEffect(() => {
    if (lens) {
      setName(lens.name);
    }
  }, [lens]);

  if (!isOpen || !lens) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Please enter a lens name', 'error');
      return;
    }

    if (name.trim() === lens.name) {
      // No change, just close
      onClose();
      return;
    }

    setIsUpdating(true);
    try {
      // Use appropriate API based on whether it's a folder lens
      if (folderId) {
        // Folder lens
        const response = await updateFolderLens(orgId, folderId, lens.id, {
          name: name.trim(),
        });
        
        if (response.success) {
          toast('Lens updated successfully', 'success');
          onSuccess(response.data.lens);
          onClose();
        } else {
          toast(response.error?.message || 'Failed to update lens', 'error');
        }
      } else {
        // Desktop/saved lens
        const response = await updateDesktopLens(orgId, lens.id, {
          name: name.trim(),
        });
        
        if (response.success) {
          toast('Lens updated successfully', 'success');
          onSuccess(response.data.lens);
          onClose();
        } else {
          toast(response.error?.message || 'Failed to update lens', 'error');
        }
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update lens', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Lens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            disabled={isUpdating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="lens-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              id="lens-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter lens name"
              disabled={isUpdating}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUpdating || !name.trim()}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
