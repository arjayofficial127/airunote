/**
 * EditFolderModal Component
 * Modal for editing folder name and type
 */

'use client';

import { useState, useEffect } from 'react';
import { useUpdateFolder } from '../hooks/useUpdateFolder';
import type { AiruFolder } from '../types';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: AiruFolder | null;
  orgId: string;
  userId: string;
  onSuccess?: (folder: AiruFolder) => void;
}

export function EditFolderModal({
  isOpen,
  onClose,
  folder,
  orgId,
  userId,
  onSuccess,
}: EditFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState<'box' | 'book' | 'board'>('box');
  const [error, setError] = useState<string | null>(null);
  const updateFolder = useUpdateFolder();

  // Initialize form when folder changes
  useEffect(() => {
    if (folder) {
      setFolderName(folder.humanId);
      setFolderType(folder.type || 'box');
      setError(null);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!folder) {
      setError('No folder selected');
      return;
    }

    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    // Don't update if nothing changed
    if (folderName.trim() === folder.humanId && folderType === (folder.type || 'box')) {
      onClose();
      return;
    }

    try {
      const updatedFolder = await updateFolder.mutateAsync({
        folderId: folder.id,
        orgId,
        userId,
        humanId: folderName.trim() !== folder.humanId ? folderName.trim() : undefined,
        type: folderType !== (folder.type || 'box') ? folderType : undefined,
      });
      onSuccess?.(updatedFolder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
    }
  };

  const handleClose = () => {
    setFolderName('');
    setFolderType('box');
    setError(null);
    onClose();
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Edit Folder</h2>

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
          </div>

          <div className="mb-4">
            <label htmlFor="folderType" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Type
            </label>
            <select
              id="folderType"
              value={folderType}
              onChange={(e) => setFolderType(e.target.value as 'box' | 'book' | 'board')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="box">📦 Box</option>
              <option value="book">📘 Book</option>
              <option value="board">🗂️ Board</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Type is a visual hint and does not affect folder behavior.
            </p>
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={updateFolder.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateFolder.isPending || !folderName.trim()}
            >
              {updateFolder.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
