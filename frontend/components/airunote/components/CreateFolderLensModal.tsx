/**
 * Create Folder Lens Modal
 * Allows creating a new lens for a folder
 */

'use client';

import { useState } from 'react';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { toast } from '@/lib/toast';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import { LENS_DESCRIPTIONS } from '../utils/lensPresentation';

interface CreateFolderLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lens: AiruLens) => void;
  folderId: string;
  orgId: string;
  userId: string;
}

type LensType = 'box' | 'board' | 'canvas' | 'book' | 'study';

const LENS_TYPE_LABELS: Record<LensType, string> = {
  box: 'Box',
  board: 'Board',
  canvas: 'Canvas',
  book: 'Calendar',
  study: 'Study',
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
  const store = useAirunoteStore.getState();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Please enter a view name', 'error');
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
        const lens = response.data.lens;
        const currentStore = useAirunoteStore.getState();
        if (currentStore.foldersById.get(folderId)?.orgId === orgId) {
          currentStore.upsertFolderView({ id: lens.id, folderId, name: lens.name, type: lens.type, isDefault: lens.isDefault });
        }
        // Update store: increment lens count for this folder
        store.incrementLensCount(folderId);
        toast('View created successfully', 'success');
        onSuccess(response.data.lens);
        setName('');
        setType('board');
        onClose();
      } else {
        toast(response.error?.message || 'Failed to create view', 'error');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create view', 'error');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-lens-title" onKeyDown={(event) => { if (event.key === 'Escape' && !isCreating) onClose(); }}>
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 id="create-lens-title" className="text-xl font-semibold text-gray-900 dark:text-white">Create a view</h2>
          <button
            onClick={onClose}
            aria-label="Close create view"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            disabled={isCreating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">See the same content in a different way. Your notes stay in their Spaces.</p>
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
              placeholder="Enter view name"
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
                    px-3 py-3 rounded-xl text-left text-sm font-medium transition-colors
                    ${type === lensType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                  disabled={isCreating}
                  aria-pressed={type === lensType}
                >
                  <span className="block">{LENS_TYPE_LABELS[lensType]}</span>
                  <span className={`mt-1 block text-xs font-normal leading-relaxed ${type === lensType ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{LENS_DESCRIPTIONS[lensType]}</span>
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
