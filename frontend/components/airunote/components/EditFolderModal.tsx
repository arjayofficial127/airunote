/**
 * EditFolderModal Component
 * Modal for editing folder name and type with premium radio-style type selector
 */

'use client';

import { useState, useEffect } from 'react';
import { useUpdateFolder } from '../hooks/useUpdateFolder';
import type { AiruFolder, AiruFolderType } from '../types';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: AiruFolder | null;
  orgId: string;
  userId: string;
  onSuccess?: (folder: AiruFolder) => void;
}

const FOLDER_TYPES: Array<{
  value: AiruFolderType;
  label: string;
  description: string;
}> = [
  { value: 'box', label: 'Box', description: 'General workspace' },
  { value: 'book', label: 'Book', description: 'Structured writing' },
  { value: 'board', label: 'Board', description: 'Stage-based workflow' },
  { value: 'project', label: 'Project', description: 'Execution space' },
  { value: 'pipeline', label: 'Pipeline', description: 'Opportunity tracking' },
  { value: 'ledger', label: 'Ledger', description: 'Financial records' },
  { value: 'wiki', label: 'Wiki', description: 'Linked knowledge' },
  { value: 'notebook', label: 'Notebook', description: 'Freeform notes' },
  { value: 'journal', label: 'Journal', description: 'Personal writing' },
  { value: 'contacts', label: 'Contacts', description: 'Directory & people' },
  { value: 'canvas', label: 'Canvas', description: 'Visual thinking' },
  { value: 'manual', label: 'Manual', description: 'Documentation' },
  { value: 'collection', label: 'Collection', description: 'Grouped items' },
];

export function EditFolderModal({
  isOpen,
  onClose,
  folder,
  orgId,
  userId,
  onSuccess,
}: EditFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [folderType, setFolderType] = useState<AiruFolderType>('box');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Folder</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter folder name"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Sets the default document style for this folder.
              <br />
              You can create any document type later.
            </p>
            
            {/* Premium Radio List */}
            <div className="space-y-2">
              {FOLDER_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 ease
                    ${folderType === type.value
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="folderType"
                    value={type.value}
                    checked={folderType === type.value}
                    onChange={(e) => setFolderType(e.target.value as AiruFolderType)}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getFolderTypeIcon(type.value)}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
