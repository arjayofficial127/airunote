/**
 * MoveFolderModal Component
 * Modal for moving a folder to a different parent
 */

'use client';

import { useState } from 'react';
import { useMoveFolder } from '../hooks/useMoveFolder';
import { useAirunoteStore } from '../stores/airunoteStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import type { AiruFolder } from '../types';
import type { FolderTreeResponse } from '../types';

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: AiruFolder;
  orgId: string;
  userId: string;
  onSuccess?: () => void;
}

export function MoveFolderModal({
  isOpen,
  onClose,
  folder,
  orgId,
  userId,
  onSuccess,
}: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string>(folder.parentFolderId);
  const [error, setError] = useState<string | null>(null);
  const moveFolder = useMoveFolder();
  const authSession = useAuthSession();
  const { buildTree, foldersById } = useAirunoteStore();

  // Build tree from store
  const allFolders = Array.from(foldersById.values());
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.ownerUserId === userId
  );
  const rootFolderId = userRoot?.id || null;
  const tree: FolderTreeResponse | null = rootFolderId ? buildTree(rootFolderId) : null;

  // Build folder options (exclude current folder and its descendants)
  const buildFolderOptions = (
    node: typeof tree,
    excludeId: string,
    level: number = 0
  ): Array<{ id: string; name: string; level: number }> => {
    const options: Array<{ id: string; name: string; level: number }> = [];

    if (!node) return options;

    // Add root option
    if (level === 0) {
      options.push({ id: 'root', name: 'Home (Root)', level: 0 });
    }

    node.folders.forEach((f) => {
      // Exclude current folder and its descendants
      if (f.id !== excludeId && f.parentFolderId !== excludeId) {
        options.push({ id: f.id, name: f.humanId, level });
        node.children.forEach((child) => {
          if (child.folders.some((cf) => cf.parentFolderId === f.id)) {
            options.push(...buildFolderOptions(child, excludeId, level + 1));
          }
        });
      }
    });

    return options;
  };

  const folderOptions = tree ? buildFolderOptions(tree, folder.id) : [{ id: 'root', name: 'Home (Root)', level: 0 }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If 'root' is selected, use the user root folder ID
    const newParentId = selectedParentId === 'root' 
      ? (userRoot?.id || selectedParentId)
      : selectedParentId;

    if (newParentId === folder.parentFolderId) {
      setError('Folder is already in this location');
      return;
    }

    try {
      await moveFolder.mutateAsync({
        folderId: folder.id,
        orgId,
        userId,
        newParentFolderId: newParentId,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move folder');
    }
  };

  const handleClose = () => {
    setSelectedParentId(folder.parentFolderId);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Move Folder</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="parentFolder" className="block text-sm font-medium text-gray-700 mb-2">
              Move &ldquo;{folder.humanId}&rdquo; to:
            </label>
            <select
              id="parentFolder"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {'  '.repeat(option.level)}
                  {option.name}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={moveFolder.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={moveFolder.isPending || selectedParentId === folder.parentFolderId}
            >
              {moveFolder.isPending ? 'Moving...' : 'Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
