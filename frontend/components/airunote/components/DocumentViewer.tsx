/**
 * DocumentViewer Component
 * Read-only viewer for RTF documents (viewer-first, with edit button)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import type { AiruDocument } from '../types';

interface DocumentViewerProps {
  document: AiruDocument;
  onEdit: () => void;
  onCancel?: () => void;
  onDelete: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  isEditMode?: boolean;
  onSave?: (content: string) => Promise<void>;
  isSaving?: boolean;
}

export function DocumentViewer({
  document,
  onEdit,
  onCancel,
  onDelete,
  onRename,
  isEditMode = false,
  onSave,
  isSaving = false,
}: DocumentViewerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState(document.name);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalContentRef = useRef<string>(document.content);

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
        setHasUnsavedChanges(html !== originalContentRef.current);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
  });

  // Update original content ref when document changes
  useEffect(() => {
    if (document.content !== originalContentRef.current) {
      originalContentRef.current = document.content;
    }
  }, [document.content]);

  // Update editor content when document changes (only if not in edit mode or content actually changed)
  useEffect(() => {
    if (editor && !isEditMode && document.content !== editor.getHTML()) {
      // Only reset editor in view mode when document content changes
      editor.commands.setContent(document.content);
      setHasUnsavedChanges(false);
    } else if (editor && isEditMode) {
      // In edit mode, only update hasUnsavedChanges flag, don't reset editor content
      const html = editor.getHTML();
      setHasUnsavedChanges(html !== originalContentRef.current);
    }
  }, [document.content, editor, isEditMode]);

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
                      // Reset to saved content when canceling
                      editor.commands.setContent(document.content);
                      setHasUnsavedChanges(false);
                    }
                    // Exit edit mode via parent callback
                    if (onCancel) {
                      onCancel();
                    }
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
