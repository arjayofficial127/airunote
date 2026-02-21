/**
 * CreateDocumentModal Component
 * Modal for creating a new document
 */

'use client';

import { useState } from 'react';
import { useCreateDocument } from '../hooks/useCreateDocument';
import { useRouter } from 'next/navigation';
import type { AiruDocument } from '../types';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  folderId: string;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
  orgId,
  userId,
  folderId,
}: CreateDocumentModalProps) {
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<'TXT' | 'MD' | 'RTF'>('TXT');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createDocument = useCreateDocument();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!documentName.trim()) {
      setError('Document name is required');
      return;
    }

    // If folderId is not available, provision root folder first
    let actualFolderId = folderId;
    if (!actualFolderId || actualFolderId === 'root') {
      try {
        const { airunoteApi } = await import('../services/airunoteApi');
        const provisionResponse = await airunoteApi.provision(orgId, userId, userId);
        if (!provisionResponse.success) {
          throw new Error('Failed to provision root folder. Please try again.');
        }
        actualFolderId = provisionResponse.data.rootFolder.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to provision root folder');
        return;
      }
    }

    try {
      const document = await createDocument.mutateAsync({
        orgId,
        userId,
        folderId: actualFolderId,
        name: documentName.trim(),
        content: content.trim(),
        type: documentType,
      });
      
      // Reset form
      setDocumentName('');
      setContent('');
      setDocumentType('TXT');
      
      // Navigate to document view
      const orgIdFromPath = window.location.pathname.split('/')[2];
      router.push(`/orgs/${orgIdFromPath}/airunote/document/${document.id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    }
  };

  const handleClose = () => {
    setDocumentName('');
    setContent('');
    setDocumentType('TXT');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Create New Document</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="documentName" className="block text-sm font-medium text-gray-700 mb-2">
              Document Name
            </label>
            <input
              type="text"
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter document name"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as 'TXT' | 'MD' | 'RTF')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TXT">Text (TXT)</option>
              <option value="MD">Markdown (MD)</option>
              <option value="RTF">Rich Text (RTF)</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content (Optional)
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter document content (optional)"
            />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={createDocument.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createDocument.isPending || !documentName.trim()}
            >
              {createDocument.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
