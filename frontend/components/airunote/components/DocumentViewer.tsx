/**
 * DocumentViewer Component
 * Read-only viewer for RTF documents (viewer-first, with edit button)
 */

'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import type { AiruDocument } from '../types';

interface DocumentViewerProps {
  document: AiruDocument;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  isEditMode?: boolean;
  onSave?: (content: string) => Promise<void>;
  isSaving?: boolean;
}

export function DocumentViewer({
  document,
  onEdit,
  onDelete,
  onRename,
  isEditMode = false,
  onSave,
  isSaving = false,
}: DocumentViewerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState(document.name);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content: document.content,
    editable: isEditMode,
    onUpdate: ({ editor }) => {
      if (isEditMode) {
        const html = editor.getHTML();
        setHasUnsavedChanges(html !== document.content);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
  });

  // Update editor content when document changes
  useEffect(() => {
    if (editor && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content);
      setHasUnsavedChanges(false);
    }
  }, [document.content, editor]);

  const handleSave = async () => {
    if (!editor || !onSave || !hasUnsavedChanges) return;
    const html = editor.getHTML();
    await onSave(html);
    setHasUnsavedChanges(false);
  };

  const handleNameSave = async () => {
    if (documentName.trim() && documentName !== document.name) {
      await onRename(documentName.trim());
    }
    setIsEditingName(false);
  };

  const handleDelete = async () => {
    // Delete confirmation is handled by parent component
    await onDelete();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditingName ? (
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setDocumentName(document.name);
                    setIsEditingName(false);
                  }
                }}
                className="text-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 px-2 py-1 rounded"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => setIsEditingName(true)}
                title="Click to rename"
              >
                {document.name}
              </h1>
            )}
            <div className="mt-1 text-sm text-gray-500">
              {document.type} • Last updated {new Date(document.updatedAt).toLocaleString()}
              {isEditMode && hasUnsavedChanges && (
                <span className="ml-2 text-orange-600">• Unsaved changes</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    if (editor) {
                      editor.commands.setContent(document.content);
                      setHasUnsavedChanges(false);
                    }
                    onEdit(); // Exit edit mode
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-y-auto bg-white">
        {editor && <EditorContent editor={editor} />}
      </div>
    </div>
  );
}
