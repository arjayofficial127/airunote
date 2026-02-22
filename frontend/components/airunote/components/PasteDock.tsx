/**
 * PasteDock Component
 * Staging surface for pasted content before saving (Save-before-edit)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateDocument } from '../hooks/useCreateDocument';
import { useAirunoteStore } from '../stores/airunoteStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import type { AiruDocument } from '../types';
import type { FolderTreeResponse } from '../types';

interface PasteDockProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
  defaultFolderId?: string;
}

export function PasteDock({
  isOpen,
  onClose,
  orgId,
  userId,
  defaultFolderId,
}: PasteDockProps) {
  const router = useRouter();
  const [pastedContent, setPastedContent] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<'TXT' | 'MD' | 'RTF'>('TXT');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(defaultFolderId || 'root');
  const [error, setError] = useState<string | null>(null);

  const createDocument = useCreateDocument();
  const authSession = useAuthSession();
  const { buildTree, foldersById } = useAirunoteStore();

  // Build tree from store
  const allFolders = Array.from(foldersById.values());
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.ownerUserId === userId
  );
  const rootFolderId = userRoot?.id || null;
  const tree: FolderTreeResponse | null = rootFolderId ? buildTree(rootFolderId) : null;

  // Auto-detect type from pasted content
  useEffect(() => {
    if (!pastedContent.trim()) {
      setDocumentType('TXT');
      return;
    }

    // Check for Markdown syntax
    const markdownPatterns = [
      /^#{1,6}\s/m, // Headers
      /^\*\s/m, // Bullet lists
      /^\d+\.\s/m, // Numbered lists
      /\[.*?\]\(.*?\)/m, // Links
      /```/m, // Code blocks
      /^\s*[-*+]\s/m, // Markdown lists
    ];

    const hasMarkdown = markdownPatterns.some((pattern) => pattern.test(pastedContent));

    // Check for HTML/Rich text
    const htmlPattern = /<[a-z][\s\S]*>/i;
    const hasHtml = htmlPattern.test(pastedContent);

    if (hasHtml) {
      setDocumentType('RTF');
    } else if (hasMarkdown) {
      setDocumentType('MD');
    } else {
      setDocumentType('TXT');
    }
  }, [pastedContent]);

  // Generate default name from content
  useEffect(() => {
    if (!documentName && pastedContent.trim()) {
      const firstLine = pastedContent.split('\n')[0].trim();
      const name = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
      setDocumentName(name || 'Untitled Document');
    }
  }, [pastedContent, documentName]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    // Prefer HTML if available (rich text)
    if (html && html !== text) {
      setPastedContent(html);
      setDocumentType('RTF');
    } else {
      setPastedContent(text);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!documentName.trim()) {
      setError('Document name is required');
      return;
    }

    if (!pastedContent.trim()) {
      setError('Please paste some content');
      return;
    }

    // Get actual root folder ID if needed
    const folderId = selectedFolderId === 'root' 
      ? (userRoot?.id || selectedFolderId)
      : selectedFolderId;

    try {
      const document = await createDocument.mutateAsync({
        orgId,
        userId,
        folderId,
        name: documentName.trim(),
        content: pastedContent.trim(),
        type: documentType,
      });

      // Reset form
      setPastedContent('');
      setDocumentName('');
      setDocumentType('TXT');
      setSelectedFolderId(defaultFolderId || 'root');

      // Navigate to document view
      const orgIdFromPath = window.location.pathname.split('/')[2];
      router.push(`/orgs/${orgIdFromPath}/airunote/document/${document.id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    }
  };

  const handleClose = () => {
    setPastedContent('');
    setDocumentName('');
    setDocumentType('TXT');
    setSelectedFolderId(defaultFolderId || 'root');
    setError(null);
    onClose();
  };

  // Build folder options for dropdown
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Paste Dock</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Paste Area */}
          <div className="mb-4">
            <label htmlFor="pastedContent" className="block text-sm font-medium text-gray-700 mb-2">
              Paste Content
            </label>
            <textarea
              id="pastedContent"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              onPaste={handlePaste}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Paste your content here... (Ctrl+V / Cmd+V)"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              {pastedContent.length} characters
            </p>
          </div>

          {/* Document Name */}
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
              required
            />
          </div>

          {/* Type Selector */}
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
            <p className="mt-1 text-xs text-gray-500">
              Type detected automatically. You can override if needed.
            </p>
          </div>

          {/* Folder Selector */}
          <div className="mb-4">
            <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-2">
              Save To Folder
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
              disabled={createDocument.isPending || !documentName.trim() || !pastedContent.trim()}
            >
              {createDocument.isPending ? 'Creating...' : 'Save & Open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
