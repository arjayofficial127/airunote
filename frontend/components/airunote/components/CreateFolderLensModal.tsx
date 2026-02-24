/**
 * Create Folder Lens Modal
 * Allows creating a new lens for a folder
 */

'use client';

import { useState } from 'react';
import { airunoteApi } from '../services/airunoteApi';
import { toast } from '@/lib/toast';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface CreateFolderLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lens: AiruLens) => void;
  folderId: string;
  orgId: string;
  userId: string;
}

type LensType = 'box' | 'board' | 'canvas' | 'book';

const LENS_TYPE_LABELS: Record<LensType, string> = {
  box: 'Box',
  board: 'Board',
  canvas: 'Canvas',
  book: 'Book',
};

export function CreateFolderLensModal({
  isOpen,
  onClose,
  onSuccess,
  folderId,
  orgId,
  userId,
}: CreateFolderLensModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<LensType>('board');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Please enter a lens name', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const defaultMetadata: Record<string, unknown> = {};
      if (type === 'board') {
        defaultMetadata.columns = [
          { id: 'todo', title: 'Todo', description: null, order: 0 },
          { id: 'doing', title: 'Doing', description: null, order: 1 },
          { id: 'done', title: 'Done', description: null, order: 2 },
        ];
      }

      const response = await airunoteApi.createFolderLens(folderId, orgId, userId, {
        name: name.trim(),
        type,
        metadata: defaultMetadata,
      });

      if (response.success) {
        toast('Lens created successfully', 'success');
        onSuccess(response.data.lens);
        setName('');
        setType('board');
        onClose();
      } else {
        toast(response.error?.message || 'Failed to create lens', 'error');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create lens', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTypeChange = (newType: LensType) => {
    setType(newType);
    // Auto-update name based on type if name is empty or matches previous type label
    if (!name || name === LENS_TYPE_LABELS[type]) {
      setName(LENS_TYPE_LABELS[newType]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Lens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            disabled={isCreating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LENS_TYPE_LABELS) as LensType[]).map((lensType) => (
                <button
                  key={lensType}
                  type="button"
                  onClick={() => handleTypeChange(lensType)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${type === lensType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                  disabled={isCreating}
                >
                  {LENS_TYPE_LABELS[lensType]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
