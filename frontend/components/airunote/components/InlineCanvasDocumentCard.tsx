'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import type { AiruDocument } from '../types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const markdownRenderer = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

interface InlineCanvasDocumentCardProps {
  document: AiruDocument | null;
  isEditing: boolean;
  isLoading: boolean;
  error: Error | null;
  isSaving?: boolean;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  onRequestExit?: () => void;
  className?: string;
  discardChangesSignal?: number;
  onDirtyStateChange?: (isDirty: boolean) => void;
  enableKeyboardShortcuts?: boolean;
  onActionsChange?: (actions: InlineCanvasDocumentCardActions | null) => void;
  onDiffSummaryChange?: (summary: InlineCanvasDocumentDiffSummary | null) => void;
  hideActionBar?: boolean;
}

export interface InlineCanvasDocumentCardActions {
  save: () => Promise<void>;
  cancel: () => void;
}

export interface InlineCanvasDocumentDiffSummary {
  changedLineCount: number;
  preview: string | null;
}

function normalizeDiffText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function summarizeInlineDiff(previousContent: string, nextContent: string): InlineCanvasDocumentDiffSummary | null {
  const previousLines = normalizeDiffText(previousContent).split('\n');
  const nextLines = normalizeDiffText(nextContent).split('\n');

  if (previousLines.length === 1 && previousLines[0] === '' && nextLines.length === 1 && nextLines[0] === '') {
    return null;
  }

  const changedIndices: number[] = [];
  const longestLength = Math.max(previousLines.length, nextLines.length);

  for (let index = 0; index < longestLength; index += 1) {
    if ((previousLines[index] ?? '') !== (nextLines[index] ?? '')) {
      changedIndices.push(index);
    }
  }

  if (changedIndices.length === 0) {
    return null;
  }

  const firstChangedIndex = changedIndices[0];
  const previousLine = (previousLines[firstChangedIndex] ?? '').trim();
  const nextLine = (nextLines[firstChangedIndex] ?? '').trim();
  const previewSource = nextLine || previousLine;
  const preview = previewSource ? `Line ${firstChangedIndex + 1}: ${previewSource}`.slice(0, 88) : `Line ${firstChangedIndex + 1} changed`;

  return {
    changedLineCount: changedIndices.length,
    preview,
  };
}

function isInlineSaveShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's';
}

function isInlineAlternativeSaveShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key === 'Enter';
}

function isInlineExitShortcut(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'Escape';
}

interface InlineCanvasActionBarProps {
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function InlineCanvasActionBar({ canSave, isSaving, onSave, onCancel }: InlineCanvasActionBarProps) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-gray-200/80 pt-3 dark:border-gray-700/80">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || isSaving}
        className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
          canSave && !isSaving ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300'
        }`}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function InlineTextDocumentCard({
  document,
  isEditing,
  isLoading,
  error,
  isSaving = false,
  onSave,
  onCancel,
  onRequestExit,
  className,
  discardChangesSignal = 0,
  onDirtyStateChange,
  enableKeyboardShortcuts = false,
  onActionsChange,
  onDiffSummaryChange,
  hideActionBar = false,
}: InlineCanvasDocumentCardProps) {
  const [draftContent, setDraftContent] = useState(document?.content ?? '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftContent(document?.content ?? '');
    setHasUnsavedChanges(false);
  }, [document?.content, document?.id]);

  useEffect(() => {
    setDraftContent(document?.content ?? '');
    setHasUnsavedChanges(false);
  }, [discardChangesSignal, document?.content]);

  useEffect(() => {
    onDirtyStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyStateChange]);

  useEffect(() => {
    return () => {
      onDirtyStateChange?.(false);
    };
  }, [onDirtyStateChange]);

  const renderedMarkdown = useMemo(() => {
    if (!document || document.type !== 'MD') {
      return '';
    }

    return markdownRenderer.render(document.content || '');
  }, [document]);

  const diffSummary = useMemo(
    () => summarizeInlineDiff(document?.content ?? '', draftContent),
    [document?.content, draftContent]
  );
  const editorHeight = useMemo(() => {
    const content = draftContent || document?.content || '';
    const lineCount = content.split(/\r\n|\r|\n/).length;
    return Math.max(180, lineCount * 22 + 40);
  }, [document?.content, draftContent]);

  const handleSave = useCallback(async () => {
    if (!document || !hasUnsavedChanges) {
      return;
    }

    await onSave(draftContent);
    setHasUnsavedChanges(false);
  }, [document, draftContent, hasUnsavedChanges, onSave]);

  const handleCancel = useCallback(() => {
    setDraftContent(document?.content ?? '');
    setHasUnsavedChanges(false);
    onCancel();
  }, [document?.content, onCancel]);

  useEffect(() => {
    onActionsChange?.({
      save: async () => {
        await handleSave();
      },
      cancel: handleCancel,
    });

    return () => {
      onActionsChange?.(null);
    };
  }, [handleCancel, handleSave, onActionsChange]);

  useEffect(() => {
    onDiffSummaryChange?.(hasUnsavedChanges ? diffSummary : null);

    return () => {
      onDiffSummaryChange?.(null);
    };
  }, [diffSummary, hasUnsavedChanges, onDiffSummaryChange]);

  useEffect(() => {
    if (!isEditing || !enableKeyboardShortcuts || !isKeyboardActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (isInlineSaveShortcut(event) || isInlineAlternativeSaveShortcut(event)) {
        event.preventDefault();
        void handleSave();
        return;
      }

      if (isInlineExitShortcut(event)) {
        event.preventDefault();
        onRequestExit?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, handleSave, isEditing, isKeyboardActive, onRequestExit]);

  if (isLoading && !document) {
    return <div className="rounded-md bg-gray-50 px-3 py-4 text-xs text-gray-500">Loading document...</div>;
  }

  if (error && !document) {
    return <div className="rounded-md bg-red-50 px-3 py-4 text-xs text-red-600">Failed to load document.</div>;
  }

  if (!document) {
    return <div className="rounded-md bg-gray-50 px-3 py-4 text-xs text-gray-500">Document unavailable.</div>;
  }

  if (isEditing) {
    return (
      <div
        ref={containerRef}
        className={`flex flex-col rounded-md border border-gray-200 bg-gray-50 p-2 ${className ?? ''}`}
        onFocusCapture={() => setIsKeyboardActive(true)}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }

          setIsKeyboardActive(false);
        }}
      >
        <div className="rounded-md border border-gray-200 bg-white">
          <div className="overflow-hidden rounded-md">
            <MonacoEditor
              height={`${editorHeight}px`}
              language={document.type === 'MD' ? 'markdown' : 'plaintext'}
              value={draftContent}
              onChange={(value) => {
                const nextContent = value ?? '';
                setDraftContent(nextContent);
                setHasUnsavedChanges(nextContent !== (document.content ?? ''));
              }}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                lineNumbers: 'off',
                glyphMargin: false,
                folding: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
        {!hideActionBar ? (
          <InlineCanvasActionBar
            canSave={hasUnsavedChanges}
            isSaving={isSaving}
            onSave={() => void handleSave()}
            onCancel={handleCancel}
          />
        ) : null}
      </div>
    );
  }

  if (document.type === 'MD') {
    return (
      <div
        className={`prose prose-sm max-w-none h-full overflow-auto break-words text-gray-700 ${className ?? ''}`}
        dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
      />
    );
  }

  return (
    <div className={`h-full min-h-0 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-xs text-gray-700 ${className ?? ''}`}>
      {document.content || 'Empty document'}
    </div>
  );
}

function InlineRichTextDocumentCard({
  document,
  isEditing,
  isLoading,
  error,
  isSaving = false,
  onSave,
  onCancel,
  onRequestExit,
  className,
  discardChangesSignal = 0,
  onDirtyStateChange,
  enableKeyboardShortcuts = false,
  onActionsChange,
  onDiffSummaryChange,
  hideActionBar = false,
}: InlineCanvasDocumentCardProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const documentContent = document?.content ?? null;
  const previousPlainText = useMemo(() => stripHtmlToText(document?.content ?? ''), [document?.content]);

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
    content: document?.content ?? '',
    editable: isEditing,
    onUpdate: ({ editor: nextEditor }) => {
      if (!isEditing || !document) {
        return;
      }

      setHasUnsavedChanges(nextEditor.getHTML() !== document.content);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none h-full min-h-full overflow-y-auto break-words focus:outline-none',
      },
      handleKeyDown: (_, event) => {
        if (!isEditing || !enableKeyboardShortcuts || !isKeyboardActive || event.isComposing) {
          return false;
        }

        if (isInlineSaveShortcut(event) || isInlineAlternativeSaveShortcut(event)) {
          event.preventDefault();
          void handleSave();
          return true;
        }

        if (isInlineExitShortcut(event)) {
          event.preventDefault();
          onRequestExit?.();
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    if (!editor || documentContent === null) {
      return;
    }

    if (!isEditing && editor.getHTML() !== documentContent) {
      editor.commands.setContent(documentContent);
      setHasUnsavedChanges(false);
    }
  }, [documentContent, editor, isEditing]);

  useEffect(() => {
    if (!editor || documentContent === null) {
      return;
    }

    editor.commands.setContent(documentContent);
    setHasUnsavedChanges(false);
  }, [discardChangesSignal, documentContent, editor]);

  useEffect(() => {
    onDirtyStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyStateChange]);

  useEffect(() => {
    return () => {
      onDirtyStateChange?.(false);
    };
  }, [onDirtyStateChange]);

  const handleSave = useCallback(async () => {
    if (!editor || !document || !hasUnsavedChanges) {
      return;
    }

    await onSave(editor.getHTML());
    setHasUnsavedChanges(false);
  }, [document, editor, hasUnsavedChanges, onSave]);

  const handleCancel = useCallback(() => {
    if (editor && document) {
      editor.commands.setContent(document.content);
      setHasUnsavedChanges(false);
    }

    onCancel();
  }, [document, editor, onCancel]);

  const diffSummary = useMemo(() => {
    const nextPlainText = editor ? editor.getText() : previousPlainText;
    return summarizeInlineDiff(previousPlainText, nextPlainText);
  }, [editor, previousPlainText]);

  useEffect(() => {
    onActionsChange?.({
      save: async () => {
        await handleSave();
      },
      cancel: handleCancel,
    });

    return () => {
      onActionsChange?.(null);
    };
  }, [handleCancel, handleSave, onActionsChange]);

  useEffect(() => {
    onDiffSummaryChange?.(hasUnsavedChanges ? diffSummary : null);

    return () => {
      onDiffSummaryChange?.(null);
    };
  }, [diffSummary, hasUnsavedChanges, onDiffSummaryChange]);

  useEffect(() => {
    if (!isEditing || !enableKeyboardShortcuts || !isKeyboardActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (isInlineSaveShortcut(event) || isInlineAlternativeSaveShortcut(event)) {
        event.preventDefault();
        void handleSave();
        return;
      }

      if (isInlineExitShortcut(event)) {
        event.preventDefault();
        onRequestExit?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, handleSave, isEditing, isKeyboardActive, onRequestExit]);

  if (isLoading && !document) {
    return <div className="rounded-md bg-gray-50 px-3 py-4 text-xs text-gray-500">Loading document...</div>;
  }

  if (error && !document) {
    return <div className="rounded-md bg-red-50 px-3 py-4 text-xs text-red-600">Failed to load document.</div>;
  }

  if (!document) {
    return <div className="rounded-md bg-gray-50 px-3 py-4 text-xs text-gray-500">Document unavailable.</div>;
  }

  return (
    <div
      className={`flex flex-col rounded-md border border-gray-200 bg-gray-50 p-3 ${className ?? ''}`}
      onFocusCapture={() => setIsKeyboardActive(true)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setIsKeyboardActive(false);
      }}
    >
      <div className="rounded-md bg-white px-3 py-2 [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:overflow-visible [&_.ProseMirror]:overflow-x-hidden">
        {editor ? <EditorContent editor={editor} /> : null}
      </div>
      {isEditing && !hideActionBar ? (
        <InlineCanvasActionBar
          canSave={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}

export function InlineCanvasDocumentCard(props: InlineCanvasDocumentCardProps) {
  if (props.document?.type === 'RTF') {
    return <InlineRichTextDocumentCard {...props} />;
  }

  return <InlineTextDocumentCard {...props} />;
}