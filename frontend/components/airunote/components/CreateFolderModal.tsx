/**
 * CreateFolderModal Component
 * Modal for creating a new folder
 */

'use client';

import { useState } from 'react';
import { useCreateFolder } from '../hooks/useCreateFolder';
import type { AiruFolder } from '../types';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  parentFolderId: string;
  onSuccess?: (folder: AiruFolder) => void;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  orgId,
  userId,
  parentFolderId,
  onSuccess,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createFolder = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      const folder = await createFolder.mutateAsync({
        orgId,
        userId,
        parentFolderId,
        humanId: folderName.trim(),
      });
      setFolderName('');
      onSuccess?.(folder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleClose = () => {
    setFolderName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Create New Folder</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter folder name"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={createFolder.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createFolder.isPending || !folderName.trim()}
            >
              {createFolder.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
