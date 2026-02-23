/**
 * DocumentEditor Component
 * Editor for TXT and MD documents using Monaco Editor
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAirunoteStore } from '../stores/airunoteStore';
import { AttributeEditor } from './AttributeEditor';
import type { AiruDocument } from '../types';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface DocumentEditorProps {
  document: AiruDocument;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onUpdateAttributes?: (attributes: Record<string, any>) => Promise<void>;
  isSaving?: boolean;
}

export function DocumentEditor({
  document,
  onSave,
  onDelete,
  onRename,
  onUpdateAttributes,
  isSaving = false,
}: DocumentEditorProps) {
  const [content, setContent] = useState(document.content);
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState(document.name);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAttributes, setShowAttributes] = useState(false);
  const [hasUnsavedAttributes, setHasUnsavedAttributes] = useState(false);
  const [localAttributes, setLocalAttributes] = useState<Record<string, any>>(document.attributes || {});
  const originalContentRef = useRef<string>(document.content);
  const originalAttributesRef = useRef<Record<string, any>>(document.attributes || {});
  
  const store = useAirunoteStore.getState();
  const folder = document.folderId ? store.getFolderById(document.folderId) : null;

  // Update content when document changes (only if it's a different document)
  useEffect(() => {
    if (document.content !== originalContentRef.current) {
      setContent(document.content);
      originalContentRef.current = document.content;
      setHasUnsavedChanges(false);
    }
  }, [document.content]);

  // Update attributes when document changes
  useEffect(() => {
    if (JSON.stringify(document.attributes || {}) !== JSON.stringify(originalAttributesRef.current)) {
      const newAttributes = document.attributes || {};
      originalAttributesRef.current = newAttributes;
      setLocalAttributes(newAttributes);
      setHasUnsavedAttributes(false);
    }
  }, [document.attributes]);

  // Update name when document changes
  useEffect(() => {
    setDocumentName(document.name);
  }, [document.name]);

  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasUnsavedChanges(newContent !== originalContentRef.current);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;
    await onSave(content);
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

  const handleAttributesChange = (attributes: Record<string, any>) => {
    setLocalAttributes(attributes);
    setHasUnsavedAttributes(JSON.stringify(attributes) !== JSON.stringify(originalAttributesRef.current));
  };

  const handleSaveAttributes = async () => {
    if (!onUpdateAttributes || !hasUnsavedAttributes) return;
    await onUpdateAttributes(localAttributes);
    originalAttributesRef.current = localAttributes;
    setHasUnsavedAttributes(false);
  };

  const language = document.type === 'MD' ? 'markdown' : 'plaintext';

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
              {hasUnsavedChanges && <span className="ml-2 text-orange-600">• Unsaved changes</span>}
              {hasUnsavedAttributes && <span className="ml-2 text-orange-600">• Unsaved attributes</span>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAttributes(!showAttributes)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {showAttributes ? 'Hide' : 'Show'} Attributes
            </button>
            {showAttributes && hasUnsavedAttributes && onUpdateAttributes && (
              <button
                onClick={handleSaveAttributes}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Attributes
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Attributes Panel */}
      {showAttributes && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Document Attributes</h3>
          <AttributeEditor
            attributes={localAttributes}
            folder={folder || null}
            onChange={handleAttributesChange}
          />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          value={content}
          onChange={handleContentChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
