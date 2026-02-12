/**
 * MoveDocumentModal Component
 * Modal for moving a document to a different folder
 */

'use client';

import { useState } from 'react';
import { useMoveDocument } from '../hooks/useMoveDocument';
import { useAirunoteTree } from '../hooks/useAirunoteTree';
import type { AiruDocument } from '../types';

interface MoveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AiruDocument;
  orgId: string;
  userId: string;
  onSuccess?: () => void;
}

export function MoveDocumentModal({
  isOpen,
  onClose,
  document,
  orgId,
  userId,
  onSuccess,
}: MoveDocumentModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(document.folderId);
  const [error, setError] = useState<string | null>(null);
  const moveDocument = useMoveDocument();
  const { data: tree } = useAirunoteTree(orgId, userId);

  // Build folder options
  const buildFolderOptions = (node: typeof tree, level: number = 0): Array<{ id: string; name: string; level: number }> => {
    const options: Array<{ id: string; name: string; level: number }> = [];

    if (!node) return options;

    // Add root option
    if (level === 0) {
      options.push({ id: 'root', name: 'Home (Root)', level: 0 });
    }

    node.folders.forEach((folder) => {
      options.push({ id: folder.id, name: folder.humanId, level });
      node.children.forEach((child) => {
        if (child.folders.some((f) => f.parentFolderId === folder.id)) {
          options.push(...buildFolderOptions(child, level + 1));
        }
      });
    });

    return options;
  };

  const folderOptions = tree ? buildFolderOptions(tree) : [{ id: 'root', name: 'Home (Root)', level: 0 }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newFolderId = selectedFolderId === 'root' 
      ? (tree?.folders[0]?.parentFolderId || 'root')
      : selectedFolderId;

    if (newFolderId === document.folderId) {
      setError('Document is already in this folder');
      return;
    }

    try {
      await moveDocument.mutateAsync({
        documentId: document.id,
        orgId,
        userId,
        newFolderId,
        oldFolderId: document.folderId,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move document');
    }
  };

  const handleClose = () => {
    setSelectedFolderId(document.folderId);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Move Document</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-2">
              Move &ldquo;{document.name}&rdquo; to:
            </label>
            <select
              id="folderId"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
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
              disabled={moveDocument.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={moveDocument.isPending || selectedFolderId === document.folderId}
            >
              {moveDocument.isPending ? 'Moving...' : 'Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
