/**
 * Canvas Lens Component
 * Renders children in free-positioned canvas layout
 * Persists x/y coordinates and viewMode via lens_items table
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core';
import { useParams, useRouter } from 'next/navigation';
import type { AiruLens, AiruLensItem, ViewMode } from '@/lib/api/airunoteLensesApi';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { FileTypeChip } from '../components/FileTypeChip';
import {
  InlineCanvasDocumentCard,
  type InlineCanvasDocumentCardActions,
  type InlineCanvasDocumentDiffSummary,
} from '../components/InlineCanvasDocumentCard';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import { useDocumentContent } from '../hooks/useDocumentContent';
import { useUpdateDocument } from '../hooks/useUpdateDocument';
import { resolveDocumentViewMode } from '../utils/resolveDocumentViewMode';
import { useDocumentViewPreferences } from '../stores/useDocumentViewPreferences';
import {
  CANVAS_NOTE_COLOR_OPTIONS,
  type CanvasNoteCardTheme,
  buildCanvasItemMetadataWithNoteColorOverride,
  readCanvasItemNoteColorOverride,
  resolveCanvasNoteCardTheme,
  readLensCanvasTheme,
  resolveCanvasSurfaceTheme,
} from '../utils/canvasTheme';
import {
  computeCanvasArrangement,
  type CanvasArrangePreset,
} from '../utils/canvasArrange';

type CanvasLensItem = {
  id: string;
  type: 'document' | 'folder';
  title: string;
  name?: string;
  humanId?: string;
};

type CanvasPersistenceMode = 'immediate' | 'manual';

export interface CanvasArrangementRequest {
  preset: CanvasArrangePreset;
  key: number;
}

export interface CanvasNavigationRequest {
  itemId: string;
  key: number;
}

export interface CanvasNotesRequest {
  action: 'edit-all' | 'save' | 'cancel';
  key: number;
}

export interface CanvasNavigatorState {
  activeItemId: string | null;
  focusedItemId: string | null;
  editingItemId: string | null;
  editingItemIds: string[];
  dirtyItemIds: string[];
  inlineDiffByItemId: Record<string, InlineCanvasDocumentDiffSummary>;
}

export interface CanvasContentInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface CanvasLensProps {
  orgId: string;
  lens: AiruLens;
  items: CanvasLensItem[];
  lensItems: AiruLensItem[];
  onPersist: (items: LensItemInput[]) => Promise<void>;
  persistenceMode?: CanvasPersistenceMode;
  onPendingChangesChange?: (state: CanvasPendingChangesState) => void;
  persistedCommitKey?: number;
  stagedResetKey?: number;
  arrangementRequest?: CanvasArrangementRequest | null;
  navigationRequest?: CanvasNavigationRequest | null;
  notesRequest?: CanvasNotesRequest | null;
  contentInset?: Partial<CanvasContentInset>;
  onNavigatorStateChange?: (state: CanvasNavigatorState) => void;
  onNotesActionComplete?: (result: {
    action: CanvasNotesRequest['action'];
    editedCount?: number;
    savedCount?: number;
    failedCount?: number;
    canceledCount?: number;
  }) => void;
  enableInlineDocumentEditing?: boolean;
  enableInlineDocumentFocusMode?: boolean;
  enableInlineDocumentKeyboardShortcuts?: boolean;
  enableNoteColorOverrides?: boolean;
}

interface CanvasCardSize {
  width: number;
  height: number;
}

type CanvasItemMetadata = Record<string, unknown>;

interface CanvasItemState {
  id: string;
  x: number;
  y: number;
  viewMode: ViewMode;
  width: number;
  height: number;
  metadata: CanvasItemMetadata;
}

export interface CanvasPendingChangesState {
  hasPendingChanges: boolean;
  changedCount: number;
  stagedItems: LensItemInput[];
}

interface CanvasItemProps {
  orgId: string;
  item: CanvasLensItem;
  x: number;
  y: number;
  viewMode: ViewMode;
  width: number;
  height: number;
  isInlineEditing: boolean;
  isNavigatorSelected: boolean;
  inlineDiscardChangesSignal: number;
  hasUnsavedInlineChanges: boolean;
  inlineDiffSummary: InlineCanvasDocumentDiffSummary | null;
  noteColorOverride: string | null;
  noteCardTheme: CanvasNoteCardTheme | null;
  onViewModeChange: (mode: ViewMode | null) => void;
  onResize: (size: CanvasCardSize) => void;
  onElementChange: (itemId: string, element: HTMLDivElement | null) => void;
  onActivate: (itemId: string) => void;
  onInlineEditChange: (itemId: string, nextIsEditing: boolean) => void;
  onInlineDirtyStateChange: (itemId: string, isDirty: boolean) => void;
  onInlineDiffSummaryChange: (itemId: string, summary: InlineCanvasDocumentDiffSummary | null) => void;
  onInlineEditorActionsChange: (itemId: string, actions: InlineCanvasDocumentCardActions | null) => void;
  onNoteColorOverrideChange: (itemId: string, color: string | null) => void;
  onOpen: (href: string) => void;
  enableInlineDocumentEditing: boolean;
  enableInlineDocumentFocusMode: boolean;
  enableInlineDocumentKeyboardShortcuts: boolean;
  enableNoteColorOverrides: boolean;
  isFocused: boolean;
  isCanvasDimmed: boolean;
  onFocusChange: (itemId: string | null) => void;
}

const MIN_RESIZABLE_CARD_WIDTH = 240;
const MIN_RESIZABLE_CARD_HEIGHT = 180;

function getDefaultCanvasCardSize(itemType: CanvasLensItem['type'], viewMode: ViewMode): CanvasCardSize {
  switch (viewMode) {
    case 'icon':
      return itemType === 'document'
        ? { width: 128, height: 124 }
        : { width: 128, height: 124 };
    case 'preview':
      return itemType === 'document'
        ? { width: 224, height: 220 }
        : { width: 224, height: 132 };
    case 'full':
      return itemType === 'document'
        ? { width: 320, height: 320 }
        : { width: 224, height: 132 };
    case 'list':
    default:
      return itemType === 'document'
        ? { width: 192, height: 84 }
        : { width: 192, height: 84 };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCanvasCardSize(metadata: CanvasItemMetadata, fallback: CanvasCardSize): CanvasCardSize {
  const cardSize = isRecord(metadata.cardSize) ? metadata.cardSize : null;
  const width = typeof cardSize?.width === 'number' ? cardSize.width : fallback.width;
  const height = typeof cardSize?.height === 'number' ? cardSize.height : fallback.height;

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

function buildCanvasItemMetadata(metadata: CanvasItemMetadata, size: CanvasCardSize): CanvasItemMetadata {
  return {
    ...metadata,
    cardSize: {
      width: size.width,
      height: size.height,
    },
  };
}

function isDefaultCanvasCardSize(itemType: CanvasLensItem['type'], viewMode: ViewMode, size: CanvasCardSize): boolean {
  const defaultSize = getDefaultCanvasCardSize(itemType, viewMode);
  return defaultSize.width === size.width && defaultSize.height === size.height;
}

function areCanvasItemStatesEqual(a: CanvasItemState | undefined, b: CanvasItemState | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  return a.x === b.x && a.y === b.y && a.viewMode === b.viewMode && a.width === b.width && a.height === b.height;
}

function buildCanvasItemState(
  child: CanvasLensItem,
  lensItem: AiruLensItem | undefined,
  lensDefaultView: ViewMode | undefined,
  globalDefaultView: ViewMode
): CanvasItemState {
  const fallbackSize = getDefaultCanvasCardSize(child.type, lensItem?.viewMode ?? lensDefaultView ?? globalDefaultView);

  if (lensItem) {
    const metadata = isRecord(lensItem.metadata) ? lensItem.metadata : {};
    const size = readCanvasCardSize(metadata, fallbackSize);

    return {
      id: child.id,
      x: lensItem.x ?? 50,
      y: lensItem.y ?? 50,
      viewMode: resolveDocumentViewMode({
        lensItemViewMode: lensItem.viewMode,
        lensDefaultView,
        globalDefaultView,
      }),
      width: size.width,
      height: size.height,
      metadata,
    };
  }

  const x = Math.random() * 250 + 50;
  const y = Math.random() * 250 + 50;
  const size = getDefaultCanvasCardSize(child.type, globalDefaultView);

  return {
    id: child.id,
    x: Math.round(x),
    y: Math.round(y),
    viewMode: globalDefaultView,
    width: size.width,
    height: size.height,
    metadata: {},
  };
}

function buildCanvasStateMap(
  children: CanvasLensItem[],
  lensItems: AiruLensItem[],
  lensDefaultView: ViewMode | undefined,
  globalDefaultView: ViewMode
): Map<string, CanvasItemState> {
  const itemsMap = new Map<string, CanvasItemState>();

  children.forEach((child) => {
    const lensItem = lensItems.find((item) => item.entityId === child.id);
    itemsMap.set(child.id, buildCanvasItemState(child, lensItem, lensDefaultView, globalDefaultView));
  });

  return itemsMap;
}

function buildLensItemInput(item: CanvasLensItem, state: CanvasItemState): LensItemInput {
  return {
    entityId: item.id,
    entityType: item.type,
    x: state.x,
    y: state.y,
    viewMode: state.viewMode,
    metadata: buildCanvasItemMetadata(state.metadata, {
      width: state.width,
      height: state.height,
    }),
  };
}

function getPendingCanvasChanges(
  children: CanvasLensItem[],
  persistedItems: Map<string, CanvasItemState>,
  stagedItems: Map<string, CanvasItemState>
): LensItemInput[] {
  return children.flatMap((child) => {
    const persistedState = persistedItems.get(child.id);
    const stagedState = stagedItems.get(child.id);

    if (!persistedState || !stagedState || areCanvasItemStatesEqual(persistedState, stagedState)) {
      return [];
    }

    return [buildLensItemInput(child, stagedState)];
  });
}

function CanvasItem({
  orgId,
  item,
  x,
  y,
  viewMode,
  width,
  height,
  isInlineEditing,
  isNavigatorSelected,
  inlineDiscardChangesSignal,
  hasUnsavedInlineChanges,
  inlineDiffSummary,
  noteColorOverride,
  noteCardTheme,
  onViewModeChange,
  onResize,
  onElementChange,
  onActivate,
  onInlineEditChange,
  onInlineDirtyStateChange,
  onInlineDiffSummaryChange,
  onInlineEditorActionsChange,
  onNoteColorOverrideChange,
  onOpen,
  enableInlineDocumentEditing,
  enableInlineDocumentFocusMode,
  enableInlineDocumentKeyboardShortcuts,
  enableNoteColorOverrides,
  isFocused,
  isCanvasDimmed,
  onFocusChange,
}: CanvasItemProps) {
  const params = useParams();
  const authSession = useAuthSession();
  const updateDocument = useUpdateDocument();
  const orgIdFromParams = params.orgId as string;
  const [isViewModeDropdownOpen, setIsViewModeDropdownOpen] = useState(false);
  const [isNoteColorMenuOpen, setIsNoteColorMenuOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isDocumentInlineEditing = enableInlineDocumentEditing && item.type === 'document' && isInlineEditing;
  const isFocusEnabled = enableInlineDocumentFocusMode && item.type === 'document';
  const isNoteColorEnabled = enableNoteColorOverrides && item.type === 'document';
  const isResizableDocumentCard = item.type === 'document' && (viewMode === 'preview' || viewMode === 'full' || isDocumentInlineEditing);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    axis: 'x' | 'y' | 'xy';
  } | null>(null);
  const itemElementRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: isDocumentInlineEditing || isResizing || isFocused,
  });

  const shouldLoadDocument = item.type === 'document' && (isDocumentInlineEditing || viewMode === 'preview' || viewMode === 'full');
  const { document: documentData, isLoading: isDocumentLoading, error: documentError } = useDocumentContent(
    shouldLoadDocument ? item.id : null
  );
  const documentContent = documentData?.content || null;
  const userId = authSession.user?.id;

  const baseStyle = isFocused
    ? {
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        width: 'min(calc(100vw - 6rem), 64rem)',
        height: 'min(calc(100vh - 7rem), 48rem)',
        transform: 'translate(-50%, -50%)',
        zIndex: 70,
      }
    : {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        position: 'absolute' as const,
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging || isResizing ? 1000 : 1,
      };
  const style = noteCardTheme ? { ...baseStyle, ...noteCardTheme.cardStyle } : baseStyle;

  const setItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      itemElementRef.current = node;
      setNodeRef(node);
      onElementChange(item.id, node);
    },
    [item.id, onElementChange, setNodeRef]
  );

  const href =
    item.type === 'document'
      ? `/orgs/${orgIdFromParams}/airunote/document/${item.id}`
      : `/orgs/${orgIdFromParams}/airunote/folder/${item.id}`;

  const handleInlineDocumentSave = useCallback(
    async (content: string) => {
      if (item.type !== 'document' || !userId) {
        return;
      }

      await updateDocument.mutateAsync({
        documentId: item.id,
        request: {
          orgId,
          userId,
          content,
        },
      });

      onInlineEditChange(item.id, false);
    },
    [item.id, item.type, onInlineEditChange, orgId, updateDocument, userId]
  );

  const handleInlineDocumentCancel = useCallback(() => {
    onInlineEditChange(item.id, false);
  }, [item.id, onInlineEditChange]);

  const handleInlineExitRequest = useCallback(() => {
    if (isFocused) {
      onFocusChange(null);
      return;
    }

    onInlineEditChange(item.id, false);
  }, [isFocused, item.id, onFocusChange, onInlineEditChange]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onFocusChange(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFocused, onFocusChange]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const deltaX = event.clientX - resizeState.startX;
      const deltaY = event.clientY - resizeState.startY;
      const nextWidth = resizeState.axis === 'y'
        ? resizeState.startWidth
        : Math.max(MIN_RESIZABLE_CARD_WIDTH, Math.round(resizeState.startWidth + deltaX));
      const nextHeight = resizeState.axis === 'x'
        ? resizeState.startHeight
        : Math.max(MIN_RESIZABLE_CARD_HEIGHT, Math.round(resizeState.startHeight + deltaY));

      onResize({
        width: nextWidth,
        height: nextHeight,
      });
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, onResize]);

  const handleResizePointerDown = useCallback(
    (axis: 'x' | 'y' | 'xy') => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isResizableDocumentCard) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      resizeStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: width,
        startHeight: height,
        axis,
      };
      setIsResizing(true);
    },
    [height, isResizableDocumentCard, width]
  );

  // Render based on view mode
  const renderContent = () => {
    if (item.type === 'document' && enableInlineDocumentEditing && (isDocumentInlineEditing || viewMode === 'preview' || viewMode === 'full')) {
      return (
        <div className="flex h-full min-h-0 flex-col" onPointerDown={(event) => event.stopPropagation()}>
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <FileTypeChip type={documentData?.type || 'TXT'} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {documentData?.name || item.title}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <InlineCanvasDocumentCard
              document={documentData ?? null}
              isEditing={isDocumentInlineEditing}
              isLoading={isDocumentLoading}
              error={documentError}
              isSaving={updateDocument.isPending}
              onSave={handleInlineDocumentSave}
              onCancel={handleInlineDocumentCancel}
              onRequestExit={handleInlineExitRequest}
              className="h-full"
              discardChangesSignal={inlineDiscardChangesSignal}
              onDirtyStateChange={(isDirty) => onInlineDirtyStateChange(item.id, isDirty)}
              onDiffSummaryChange={(summary) => onInlineDiffSummaryChange(item.id, summary)}
              enableKeyboardShortcuts={enableInlineDocumentKeyboardShortcuts}
              onActionsChange={(actions) => onInlineEditorActionsChange(item.id, actions)}
            />
          </div>
        </div>
      );
    }

    switch (viewMode) {
      case 'list':
        return (
          <div className="flex h-full items-center gap-2 overflow-hidden">
            {item.type === 'document' ? (
              <FileTypeChip type="TXT" />
            ) : (
              <span className="text-lg">{getFolderTypeIcon('box')}</span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.title}
            </span>
          </div>
        );

      case 'icon':
        return (
          <div className="flex h-full flex-col items-center justify-center gap-2 overflow-hidden">
            {item.type === 'document' ? (
              <FileTypeChip type="TXT" />
            ) : (
              <span className="text-2xl">{getFolderTypeIcon('box')}</span>
            )}
            <span className="text-xs font-medium text-gray-900 dark:text-white text-center truncate max-w-[100px]">
              {item.title}
            </span>
          </div>
        );

      case 'preview':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center gap-2">
              {item.type === 'document' ? (
                <FileTypeChip type="TXT" />
              ) : (
                <span className="text-lg">{getFolderTypeIcon('box')}</span>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </span>
            </div>
            {item.type === 'document' && documentContent && (
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <p className="break-words text-xs text-gray-600 dark:text-gray-400">
                {documentContent.substring(0, 150)}...
                </p>
              </div>
            )}
            {item.type === 'folder' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
            )}
          </div>
        );

      case 'full': {
        const isFull = viewMode === 'full';
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center gap-2">
              {item.type === 'document' ? (
                <FileTypeChip type="TXT" />
              ) : (
                <span className="text-lg">{getFolderTypeIcon('box')}</span>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </span>
            </div>
            {item.type === 'document' && documentContent && (
              <div
                className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden break-words text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${isFull ? 'max-h-none' : ''}`}
              >
                {documentContent}
              </div>
            )}
            {item.type === 'folder' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      ref={setItemRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        border ${noteCardTheme ? noteCardTheme.cardClassName : 'shadow-md'} rounded-lg p-3
        ${noteCardTheme ? '' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}
        ${isDocumentInlineEditing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        flex flex-col overflow-hidden
        ${isFocused ? 'shadow-2xl' : 'hover:shadow-lg'} transition-shadow
        ${hasUnsavedInlineChanges ? 'border-amber-400 ring-2 ring-amber-200 dark:border-amber-500 dark:ring-amber-900/40' : ''}
        ${isNavigatorSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-gray-50 dark:ring-sky-500 dark:ring-offset-gray-900' : ''}
        group
        ${isCanvasDimmed && !isFocused ? 'pointer-events-none select-none blur-[1px]' : ''}
        ${isDragging ? 'ring-2 ring-blue-500' : ''}
      `}
      onPointerDown={(event) => {
        onActivate(item.id);
        if (isFocused) {
          event.stopPropagation();
        }
      }}
    >
      {hasUnsavedInlineChanges && (
        <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-7rem)] items-center gap-2 rounded-full border border-amber-300 bg-amber-50/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
          <span>Changed</span>
          {inlineDiffSummary?.changedLineCount ? <span>{inlineDiffSummary.changedLineCount} lines</span> : null}
        </div>
      )}
      <div className="mb-2 min-h-0 flex-1 overflow-hidden">
        {renderContent()}
      </div>
      {hasUnsavedInlineChanges && inlineDiffSummary?.preview && (
        <div className="mt-auto rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {inlineDiffSummary.preview}
        </div>
      )}
      <div
        className={`absolute top-1 right-1 transition-opacity ${
          isViewModeDropdownOpen || isDocumentInlineEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <div className="flex items-start gap-1">
          {isNoteColorEnabled && (
            <div className="relative">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNoteColorMenuOpen((prev) => !prev);
                }}
                className="rounded bg-white p-1.5 text-xs shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                title="Change note color"
              >
                <span
                  className="block h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: noteCardTheme?.swatchColor ?? '#f8fafc' }}
                />
              </button>
              {isNoteColorMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNoteColorOverrideChange(item.id, null);
                      setIsNoteColorMenuOpen(false);
                    }}
                    className={`mb-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                      noteColorOverride === null
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>Auto</span>
                    {noteColorOverride === null ? <span>✓</span> : null}
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {CANVAS_NOTE_COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNoteColorOverrideChange(item.id, option.value);
                          setIsNoteColorMenuOpen(false);
                        }}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] font-medium transition-colors ${
                          noteColorOverride === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        title={option.label}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {item.type === 'document' && enableInlineDocumentEditing && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onActivate(item.id);
                if (!isDocumentInlineEditing && itemElementRef.current) {
                  const rect = itemElementRef.current.getBoundingClientRect();
                  onResize({
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                  });
                }

                onInlineEditChange(item.id, !isDocumentInlineEditing);
              }}
              aria-pressed={isDocumentInlineEditing}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                isDocumentInlineEditing
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-white text-gray-600 hover:text-gray-800 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white'
              }`}
              title="Edit item"
            >
              {isDocumentInlineEditing ? (hasUnsavedInlineChanges ? 'Unsaved' : 'Editing') : 'Edit'}
            </button>
          )}
          {isFocusEnabled && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onActivate(item.id);
                onFocusChange(isFocused ? null : item.id);
              }}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                isFocused
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-white text-gray-600 hover:text-gray-800 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white'
              }`}
              title={isFocused ? 'Exit focus mode' : 'Focus card'}
            >
              {isFocused ? 'Close' : 'Focus'}
            </button>
          )}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onActivate(item.id);
              onOpen(href);
            }}
            className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:text-gray-800 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Open
          </button>
          <div className="relative">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsViewModeDropdownOpen(!isViewModeDropdownOpen);
            }}
            className="p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-700 rounded"
            title={`View mode: ${viewMode}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
          {isViewModeDropdownOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="py-1">
                {(['list', 'icon', 'preview', 'full'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewModeChange(mode);
                      setIsViewModeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      viewMode === mode
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewModeChange(null);
                    setIsViewModeDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      {isResizableDocumentCard && !isFocused && (
        <>
          <button
            type="button"
            aria-label="Resize card width"
            onPointerDown={handleResizePointerDown('x')}
            className="absolute bottom-5 right-0 top-5 w-3 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
          />
          <button
            type="button"
            aria-label="Resize card height"
            onPointerDown={handleResizePointerDown('y')}
            className="absolute bottom-0 left-5 right-5 h-3 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100"
          />
          <button
            type="button"
            aria-label="Resize card"
            onPointerDown={handleResizePointerDown('xy')}
            className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-800/90"
          >
            <span className="sr-only">Resize</span>
          </button>
        </>
      )}
    </div>
  );
}

export function CanvasLens({
  orgId,
  lens,
  items: children,
  lensItems,
  onPersist,
  persistenceMode = 'immediate',
  onPendingChangesChange,
  persistedCommitKey = 0,
  stagedResetKey = 0,
  arrangementRequest = null,
  navigationRequest = null,
  notesRequest = null,
  contentInset,
  onNavigatorStateChange,
  onNotesActionComplete,
  enableInlineDocumentEditing = false,
  enableInlineDocumentFocusMode = false,
  enableInlineDocumentKeyboardShortcuts = false,
  enableNoteColorOverrides = false,
}: CanvasLensProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [navigatorHighlightItemId, setNavigatorHighlightItemId] = useState<string | null>(null);
  const [editingItemIds, setEditingItemIds] = useState<string[]>([]);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [dirtyInlineEditorByItemId, setDirtyInlineEditorByItemId] = useState<Record<string, boolean>>({});
  const [inlineDiffSummaryByItemId, setInlineDiffSummaryByItemId] = useState<Record<string, InlineCanvasDocumentDiffSummary>>({});
  const [inlineDiscardChangesSignalByItemId, setInlineDiscardChangesSignalByItemId] = useState<Record<string, number>>({});
  const [pendingInlineGuard, setPendingInlineGuard] = useState<{
    title: string;
    message: string;
    discardItemIds: string[];
    nextEditingItemIds?: string[];
    nextFocusedItemId?: string | null;
    navigationHref?: string | null;
    commandResult?: {
      action: CanvasNotesRequest['action'];
      editedCount?: number;
      savedCount?: number;
      failedCount?: number;
      canceledCount?: number;
    };
  } | null>(null);
  const [persistedItems, setPersistedItems] = useState<Map<string, CanvasItemState>>(new Map());
  const [stagedItems, setStagedItems] = useState<Map<string, CanvasItemState>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const itemElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inlineEditorActionsRef = useRef<Map<string, InlineCanvasDocumentCardActions>>(new Map());
  const navigatorHighlightTimeoutRef = useRef<number | null>(null);
  const lastCommittedKeyRef = useRef(persistedCommitKey);
  const lastResetKeyRef = useRef(stagedResetKey);
  const lastArrangementKeyRef = useRef<number | null>(arrangementRequest?.key ?? null);
  const lastNavigationKeyRef = useRef<number | null>(navigationRequest?.key ?? null);
  const lastNotesKeyRef = useRef<number | null>(notesRequest?.key ?? null);
  const globalDefaultView = useDocumentViewPreferences((state) => state.globalDefaultView);
  
  // Extract stable primitive value from lens object
  const lensDefaultView = (lens.metadata as { presentation?: { defaultView?: ViewMode } })?.presentation?.defaultView;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const pendingChanges = useMemo(
    () => getPendingCanvasChanges(children, persistedItems, stagedItems),
    [children, persistedItems, stagedItems]
  );
  const resolvedContentInset = useMemo<CanvasContentInset>(
    () => ({
      top: contentInset?.top ?? 0,
      right: contentInset?.right ?? 0,
      bottom: contentInset?.bottom ?? 0,
      left: contentInset?.left ?? 0,
    }),
    [contentInset?.bottom, contentInset?.left, contentInset?.right, contentInset?.top]
  );
  const lensCanvasTheme = useMemo(() => readLensCanvasTheme(lens.metadata), [lens.metadata]);
  const canvasSurfaceTheme = useMemo(() => resolveCanvasSurfaceTheme(lensCanvasTheme), [lensCanvasTheme]);
  const isFocusModeActive = focusedItemId !== null;
  const activeEditingItemId = editingItemIds[editingItemIds.length - 1] ?? null;
  const activeNavigatorItemId = focusedItemId ?? activeEditingItemId ?? activeId ?? navigatorHighlightItemId;
  const dirtyItemIds = useMemo(
    () => Object.entries(dirtyInlineEditorByItemId).flatMap(([itemId, isDirty]) => (isDirty ? [itemId] : [])),
    [dirtyInlineEditorByItemId]
  );
  const dirtyEditingItemIds = useMemo(
    () => editingItemIds.filter((itemId) => dirtyInlineEditorByItemId[itemId]),
    [dirtyInlineEditorByItemId, editingItemIds]
  );
  const totalDirtyChangedLineCount = useMemo(
    () => dirtyItemIds.reduce((total, itemId) => total + (inlineDiffSummaryByItemId[itemId]?.changedLineCount ?? 0), 0),
    [dirtyItemIds, inlineDiffSummaryByItemId]
  );
  const eligibleDocumentIds = useMemo(
    () => children.filter((child) => child.type === 'document').map((child) => child.id),
    [children]
  );

  // Initialize local items state from lensItems
  useEffect(() => {
    const itemsMap = buildCanvasStateMap(children, lensItems, lensDefaultView, globalDefaultView);
    console.log('[CanvasLens] Initializing items:', { 
      childrenCount: children.length, 
      lensItemsCount: lensItems.length,
      children: children.map(c => ({ id: c.id, type: c.type, title: c.title }))
    });
    console.log('[CanvasLens] Local items map size:', itemsMap.size);
    setPersistedItems(itemsMap);
    setStagedItems(new Map(itemsMap));
  }, [children, lensItems, lensDefaultView, globalDefaultView]);

  useEffect(() => {
    if (!focusedItemId) {
      return;
    }

    const hasFocusedItem = children.some((child) => child.id === focusedItemId && child.type === 'document');
    if (!hasFocusedItem) {
      setFocusedItemId(null);
    }
  }, [children, focusedItemId]);

  useEffect(() => {
    if (editingItemIds.length === 0) {
      return;
    }

    const editableItemIds = new Set(children.filter((child) => child.type === 'document').map((child) => child.id));
    setEditingItemIds((prev) => prev.filter((itemId) => editableItemIds.has(itemId)));
  }, [children, editingItemIds.length]);

  useEffect(() => {
    if (!navigatorHighlightItemId) {
      return;
    }

    const hasHighlightedItem = children.some((child) => child.id === navigatorHighlightItemId);
    if (!hasHighlightedItem) {
      setNavigatorHighlightItemId(null);
    }
  }, [children, navigatorHighlightItemId]);

  useEffect(() => {
    return () => {
      if (navigatorHighlightTimeoutRef.current !== null) {
        window.clearTimeout(navigatorHighlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!onPendingChangesChange) {
      return;
    }

    onPendingChangesChange({
      hasPendingChanges: pendingChanges.length > 0,
      changedCount: pendingChanges.length,
      stagedItems: pendingChanges,
    });
  }, [onPendingChangesChange, pendingChanges]);

  useEffect(() => {
    if (!onNavigatorStateChange) {
      return;
    }

    onNavigatorStateChange({
      activeItemId: activeNavigatorItemId,
      focusedItemId,
      editingItemId: activeEditingItemId,
      editingItemIds,
      dirtyItemIds,
      inlineDiffByItemId: inlineDiffSummaryByItemId,
    });
  }, [activeEditingItemId, activeNavigatorItemId, dirtyItemIds, editingItemIds, focusedItemId, inlineDiffSummaryByItemId, onNavigatorStateChange]);

  useEffect(() => {
    if (persistenceMode !== 'manual') {
      return;
    }

    if (lastCommittedKeyRef.current === persistedCommitKey) {
      return;
    }

    lastCommittedKeyRef.current = persistedCommitKey;
    setPersistedItems(new Map(stagedItems));
  }, [persistedCommitKey, persistenceMode, stagedItems]);

  useEffect(() => {
    if (persistenceMode !== 'manual') {
      return;
    }

    if (lastResetKeyRef.current === stagedResetKey) {
      return;
    }

    lastResetKeyRef.current = stagedResetKey;
    setStagedItems(new Map(persistedItems));
  }, [persistenceMode, persistedItems, stagedResetKey]);

  useEffect(() => {
    if (!arrangementRequest) {
      return;
    }

    if (lastArrangementKeyRef.current === arrangementRequest.key) {
      return;
    }

    lastArrangementKeyRef.current = arrangementRequest.key;

    const arrangedStates = computeCanvasArrangement(arrangementRequest.preset, children);

    setStagedItems((prev) => {
      const nextItems = new Map(prev);

      arrangedStates.forEach((nextState, itemId) => {
        const currentState = nextItems.get(itemId);
        if (!currentState) {
          return;
        }

        nextItems.set(itemId, {
          ...currentState,
          x: nextState.x,
          y: nextState.y,
          viewMode: nextState.viewMode,
        });
      });

      return nextItems;
    });
  }, [arrangementRequest, children]);

  useEffect(() => {
    if (!navigationRequest) {
      return;
    }

    if (lastNavigationKeyRef.current === navigationRequest.key) {
      return;
    }

    lastNavigationKeyRef.current = navigationRequest.key;
    if (navigatorHighlightTimeoutRef.current !== null) {
      window.clearTimeout(navigatorHighlightTimeoutRef.current);
    }
    setNavigatorHighlightItemId(navigationRequest.itemId);
    navigatorHighlightTimeoutRef.current = window.setTimeout(() => {
      setNavigatorHighlightItemId((currentItemId) => (currentItemId === navigationRequest.itemId ? null : currentItemId));
      navigatorHighlightTimeoutRef.current = null;
    }, 1800);

    const itemElement = itemElementRefs.current.get(navigationRequest.itemId);
    const containerElement = containerRef.current;

    if (!itemElement || !containerElement) {
      return;
    }

    if (focusedItemId !== navigationRequest.itemId) {
      const targetTop = Math.max(0, itemElement.offsetTop - 96);
      const targetLeft = Math.max(0, itemElement.offsetLeft - 48);
      containerElement.scrollTo({
        top: targetTop,
        left: targetLeft,
        behavior: 'smooth',
      });
    }

    window.setTimeout(() => {
      itemElement.focus({ preventScroll: true });
    }, 180);
  }, [focusedItemId, navigationRequest]);

  useEffect(() => {
    if (!notesRequest) {
      return;
    }

    if (lastNotesKeyRef.current === notesRequest.key) {
      return;
    }

    lastNotesKeyRef.current = notesRequest.key;

    if (notesRequest.action === 'edit-all') {
      setEditingItemIds((prev) => Array.from(new Set([...prev, ...eligibleDocumentIds])));

      if (eligibleDocumentIds.length > 0) {
        setNavigatorHighlightItemId((prev) => prev ?? eligibleDocumentIds[0]);
      }

      onNotesActionComplete?.({
        action: 'edit-all',
        editedCount: eligibleDocumentIds.length,
      });
      return;
    }

    if (notesRequest.action === 'cancel') {
      if (editingItemIds.length === 0) {
        onNotesActionComplete?.({
          action: 'cancel',
          canceledCount: 0,
        });
        return;
      }

      const dirtyActiveItemIds = editingItemIds.filter((itemId) => dirtyInlineEditorByItemId[itemId]);

      if (dirtyActiveItemIds.length === 0) {
        setEditingItemIds([]);
        onNotesActionComplete?.({
          action: 'cancel',
          canceledCount: editingItemIds.length,
        });
        return;
      }

      setPendingInlineGuard({
        title: 'Cancel notes and discard changes?',
        message: 'One or more active note editors have unsaved inline changes. Stay editing or discard those changes and close the active note editors.',
        discardItemIds: dirtyActiveItemIds,
        nextEditingItemIds: [],
        commandResult: {
          action: 'cancel',
          canceledCount: editingItemIds.length,
        },
      });
      return;
    }

    const dirtyActiveItemIds = editingItemIds.filter((itemId) => dirtyInlineEditorByItemId[itemId]);

    if (dirtyActiveItemIds.length === 0) {
      onNotesActionComplete?.({
        action: 'save',
        savedCount: 0,
        failedCount: 0,
      });
      return;
    }

    void (async () => {
      const results = await Promise.allSettled(
        dirtyActiveItemIds.map(async (itemId) => {
          const actions = inlineEditorActionsRef.current.get(itemId);
          if (!actions) {
            throw new Error(`Missing inline editor actions for ${itemId}`);
          }

          await actions.save();
        })
      );

      const failedCount = results.filter((result) => result.status === 'rejected').length;

      onNotesActionComplete?.({
        action: 'save',
        savedCount: dirtyActiveItemIds.length - failedCount,
        failedCount,
      });
    })();
  }, [dirtyInlineEditorByItemId, editingItemIds, eligibleDocumentIds, notesRequest, onNotesActionComplete]);

  const handleItemElementChange = useCallback((itemId: string, element: HTMLDivElement | null) => {
    if (element) {
      itemElementRefs.current.set(itemId, element);
      return;
    }

    itemElementRefs.current.delete(itemId);
  }, []);

  const handleItemActivate = useCallback((itemId: string) => {
    if (navigatorHighlightTimeoutRef.current !== null) {
      window.clearTimeout(navigatorHighlightTimeoutRef.current);
    }

    setNavigatorHighlightItemId(itemId);
    navigatorHighlightTimeoutRef.current = window.setTimeout(() => {
      setNavigatorHighlightItemId((currentItemId) => (currentItemId === itemId ? null : currentItemId));
      navigatorHighlightTimeoutRef.current = null;
    }, 1800);
  }, []);

  const handleCanvasBackgroundPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (navigatorHighlightTimeoutRef.current !== null) {
      window.clearTimeout(navigatorHighlightTimeoutRef.current);
      navigatorHighlightTimeoutRef.current = null;
    }

    setNavigatorHighlightItemId(null);
  }, []);

  const handleInlineEditorActionsChange = useCallback((itemId: string, actions: InlineCanvasDocumentCardActions | null) => {
    if (actions) {
      inlineEditorActionsRef.current.set(itemId, actions);
      return;
    }

    inlineEditorActionsRef.current.delete(itemId);
  }, []);

  const persistStagedItem = useCallback(
    async (itemId: string, nextState: CanvasItemState, failureMessage: string) => {
      const item = children.find((child) => child.id === itemId);
      if (!item) {
        return;
      }

      try {
        await onPersist([buildLensItemInput(item, nextState)]);
        setPersistedItems((prev) => {
          const nextItems = new Map(prev);
          nextItems.set(itemId, nextState);
          return nextItems;
        });
      } catch (error) {
        const persistedState = persistedItems.get(itemId);
        if (persistedState) {
          setStagedItems((prev) => {
            const nextItems = new Map(prev);
            nextItems.set(itemId, persistedState);
            return nextItems;
          });
        }
        console.error(failureMessage, error);
      }
    },
    [children, onPersist, persistedItems]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta } = event;
      setActiveId(null);

      if (!delta || !containerRef.current) return;

      const activeId = active.id as string;
      const currentState = stagedItems.get(activeId);
      if (!currentState) return;

      // Calculate new position
      const newX = Math.max(0, currentState.x + delta.x);
      const newY = Math.max(0, currentState.y + delta.y);

      const nextState: CanvasItemState = {
        ...currentState,
        x: newX,
        y: newY,
      };

      // Stage local state first; persistence policy decides whether it is flushed immediately.
      setStagedItems((prev) => {
        const nextItems = new Map(prev);
        nextItems.set(activeId, nextState);
        return nextItems;
      });

      if (persistenceMode === 'immediate') {
        await persistStagedItem(activeId, nextState, 'Failed to persist canvas item:');
      }
    },
    [persistenceMode, persistStagedItem, stagedItems]
  );

  const handleViewModeChange = useCallback(
    async (itemId: string, mode: ViewMode | null) => {
      const currentState = stagedItems.get(itemId);
      if (!currentState) {
        return;
      }

      const item = children.find((child) => child.id === itemId);
      if (!item) {
        return;
      }

      const nextViewMode = mode ?? globalDefaultView;
      const shouldResetToNextDefaultSize = isDefaultCanvasCardSize(item.type, currentState.viewMode, {
        width: currentState.width,
        height: currentState.height,
      });
      const nextSize = shouldResetToNextDefaultSize
        ? getDefaultCanvasCardSize(item.type, nextViewMode)
        : { width: currentState.width, height: currentState.height };

      const nextState: CanvasItemState = {
        ...currentState,
        viewMode: nextViewMode,
        width: nextSize.width,
        height: nextSize.height,
      };

      setStagedItems((prev) => {
        const nextItems = new Map(prev);
        nextItems.set(itemId, nextState);
        return nextItems;
      });

      if (persistenceMode === 'immediate') {
        await persistStagedItem(itemId, nextState, 'Failed to persist view mode:');
      }
    },
    [children, globalDefaultView, persistenceMode, persistStagedItem, stagedItems]
  );

  const handleResize = useCallback(
    async (itemId: string, size: CanvasCardSize) => {
      const currentState = stagedItems.get(itemId);
      if (!currentState) {
        return;
      }

      const nextState: CanvasItemState = {
        ...currentState,
        width: size.width,
        height: size.height,
      };

      setStagedItems((prev) => {
        const nextItems = new Map(prev);
        nextItems.set(itemId, nextState);
        return nextItems;
      });

      if (persistenceMode === 'immediate') {
        await persistStagedItem(itemId, nextState, 'Failed to persist card size:');
      }
    },
    [persistenceMode, persistStagedItem, stagedItems]
  );

  const handleNoteColorOverrideChange = useCallback(
    async (itemId: string, color: string | null) => {
      const currentState = stagedItems.get(itemId);
      const item = children.find((child) => child.id === itemId);

      if (!currentState || !item || item.type !== 'document') {
        return;
      }

      const nextState: CanvasItemState = {
        ...currentState,
        metadata: buildCanvasItemMetadataWithNoteColorOverride(currentState.metadata, color),
      };

      setStagedItems((prev) => {
        const nextItems = new Map(prev);
        nextItems.set(itemId, nextState);
        return nextItems;
      });

      try {
        await onPersist([buildLensItemInput(item, nextState)]);
        setPersistedItems((prev) => {
          const nextItems = new Map(prev);
          nextItems.set(itemId, nextState);
          return nextItems;
        });
      } catch (error) {
        setStagedItems((prev) => {
          const nextItems = new Map(prev);
          nextItems.set(itemId, currentState);
          return nextItems;
        });
        console.error('Failed to persist note color override:', error);
      }
    },
    [children, onPersist, stagedItems]
  );

  const bumpInlineDiscardSignal = useCallback((itemId: string) => {
    setInlineDiscardChangesSignalByItemId((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + 1,
    }));
  }, []);

  const applyInlineAction = useCallback(
    (action: NonNullable<typeof pendingInlineGuard>, discardChanges: boolean) => {
      if (discardChanges) {
        action.discardItemIds.forEach((itemId) => {
          bumpInlineDiscardSignal(itemId);
        });
        setDirtyInlineEditorByItemId((prev) => {
          const next = { ...prev };
          action.discardItemIds.forEach((itemId) => {
            next[itemId] = false;
          });
          return next;
        });
      }

      if (action.nextEditingItemIds !== undefined) {
        setEditingItemIds(action.nextEditingItemIds);
      }

      if (action.nextFocusedItemId !== undefined) {
        setFocusedItemId(action.nextFocusedItemId);
      }

      setPendingInlineGuard(null);

      if (action.commandResult) {
        onNotesActionComplete?.(action.commandResult);
      }

      if (action.navigationHref) {
        router.push(action.navigationHref);
      }
    },
    [bumpInlineDiscardSignal, onNotesActionComplete, router]
  );

  const requestInlineAction = useCallback(
    (action: {
      title: string;
      message: string;
      discardItemIds: string[];
      nextEditingItemIds?: string[];
      nextFocusedItemId?: string | null;
      navigationHref?: string | null;
      commandResult?: {
        action: CanvasNotesRequest['action'];
        editedCount?: number;
        savedCount?: number;
        failedCount?: number;
        canceledCount?: number;
      };
    }) => {
      if (!action.discardItemIds.some((itemId) => dirtyInlineEditorByItemId[itemId])) {
        if (action.nextEditingItemIds !== undefined) {
          setEditingItemIds(action.nextEditingItemIds);
        }

        if (action.nextFocusedItemId !== undefined) {
          setFocusedItemId(action.nextFocusedItemId);
        }

        if (action.commandResult) {
          onNotesActionComplete?.(action.commandResult);
        }

        if (action.navigationHref) {
          router.push(action.navigationHref);
        }

        return;
      }

      setPendingInlineGuard(action);
    },
    [dirtyInlineEditorByItemId, onNotesActionComplete, router]
  );

  const handleInlineDirtyStateChange = useCallback((itemId: string, isDirty: boolean) => {
    setDirtyInlineEditorByItemId((prev) => {
      if (prev[itemId] === isDirty) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: isDirty,
      };
    });
  }, []);

  const handleInlineDiffSummaryChange = useCallback((itemId: string, summary: InlineCanvasDocumentDiffSummary | null) => {
    setInlineDiffSummaryByItemId((prev) => {
      if (!summary) {
        if (!(itemId in prev)) {
          return prev;
        }

        const next = { ...prev };
        delete next[itemId];
        return next;
      }

      const currentSummary = prev[itemId];
      if (
        currentSummary?.changedLineCount === summary.changedLineCount &&
        currentSummary?.preview === summary.preview
      ) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: summary,
      };
    });
  }, []);

  const handleInlineEditChange = useCallback(
    (itemId: string, nextIsEditing: boolean) => {
      if (!enableInlineDocumentEditing) {
        return;
      }

      if (nextIsEditing) {
        setEditingItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
        setNavigatorHighlightItemId(itemId);
        return;
      }

      if (!editingItemIds.includes(itemId)) {
        return;
      }

      if (dirtyInlineEditorByItemId[itemId]) {
        requestInlineAction({
          title: 'Discard unsaved edits?',
          message: 'This document has unsaved inline changes. Stay editing or discard those changes and close the editor.',
          discardItemIds: [itemId],
          nextEditingItemIds: editingItemIds.filter((editingId) => editingId !== itemId),
        });
        return;
      }

      setEditingItemIds((prev) => prev.filter((editingId) => editingId !== itemId));
    },
    [dirtyInlineEditorByItemId, editingItemIds, enableInlineDocumentEditing, requestInlineAction]
  );

  const handleFocusChange = useCallback(
    (itemId: string | null) => {
      if (!enableInlineDocumentFocusMode) {
        return;
      }

      if (dirtyEditingItemIds.length === 0 || itemId === focusedItemId) {
        setFocusedItemId(itemId);
        return;
      }

      requestInlineAction({
        title: itemId === null ? 'Exit focus and discard changes?' : 'Change focus and discard changes?',
        message:
          itemId === null
            ? 'One or more active note editors have unsaved inline changes. Stay editing or discard those changes and exit focus mode.'
            : 'One or more active note editors have unsaved inline changes. Stay editing or discard those changes and focus the selected document.',
        discardItemIds: dirtyEditingItemIds,
        nextFocusedItemId: itemId,
      });
    },
    [dirtyEditingItemIds, enableInlineDocumentFocusMode, focusedItemId, requestInlineAction]
  );

  const handleOpenRequest = useCallback(
    (href: string) => {
      if (dirtyEditingItemIds.length === 0) {
        router.push(href);
        return;
      }

      requestInlineAction({
        title: 'Open item and discard changes?',
        message: 'One or more active note editors have unsaved inline changes. Stay editing or discard those changes and open the selected item.',
        discardItemIds: dirtyEditingItemIds,
        nextEditingItemIds: [],
        nextFocusedItemId: null,
        navigationHref: href,
      });
    },
    [dirtyEditingItemIds, requestInlineAction, router]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="relative h-full min-h-0 w-full overflow-auto"
        style={{
          minHeight: '600px',
          ...canvasSurfaceTheme.viewportStyle,
        }}
      >
        {isFocusModeActive && (
          <button
            type="button"
            aria-label="Exit focus mode"
            onClick={() => handleFocusChange(null)}
            className="fixed inset-0 z-[60] bg-gray-900/25 backdrop-blur-[2px]"
          />
        )}
        {pendingInlineGuard && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{pendingInlineGuard.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{pendingInlineGuard.message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingInlineGuard(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Stay Editing
                </button>
                <button
                  type="button"
                  onClick={() => applyInlineAction(pendingInlineGuard, true)}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
        <div
          className={`relative min-h-full min-w-full overflow-hidden bg-transparent ${canvasSurfaceTheme.surfaceClassName}`}
          style={{
            paddingTop: `${resolvedContentInset.top}px`,
            paddingRight: `${resolvedContentInset.right}px`,
            paddingBottom: `${resolvedContentInset.bottom}px`,
            paddingLeft: `${resolvedContentInset.left}px`,
            ...canvasSurfaceTheme.surfaceStyle,
          }}
        >
        {children.length === 0 ? (
          <div
            className="flex h-full min-h-[480px] items-center justify-center"
            onPointerDown={handleCanvasBackgroundPointerDown}
          >
            <div className={`text-center ${canvasSurfaceTheme.emptyStateClassName}`}>
              <p className="text-lg font-medium mb-2">No items in this folder</p>
              <p className="text-sm">Add folders or documents to see them on the canvas</p>
            </div>
          </div>
        ) : (
          <div className="relative z-10 min-h-full min-w-full" onPointerDown={handleCanvasBackgroundPointerDown}>
          {children.map((child) => {
            const state = stagedItems.get(child.id);
            if (!state) {
              console.warn('[CanvasLens] No state found for item:', child.id);
              return null;
            }
            const noteColorOverride = enableNoteColorOverrides && child.type === 'document'
              ? readCanvasItemNoteColorOverride(state.metadata)
              : null;
            const noteCardTheme = enableNoteColorOverrides && child.type === 'document'
              ? resolveCanvasNoteCardTheme(lensCanvasTheme, noteColorOverride)
              : null;

            return (
              <CanvasItem
                key={child.id}
                orgId={orgId}
                item={child}
                x={state.x}
                y={state.y}
                viewMode={state.viewMode}
                width={state.width}
                height={state.height}
                isInlineEditing={editingItemIds.includes(child.id)}
                isNavigatorSelected={activeNavigatorItemId === child.id}
                inlineDiscardChangesSignal={inlineDiscardChangesSignalByItemId[child.id] ?? 0}
                hasUnsavedInlineChanges={!!dirtyInlineEditorByItemId[child.id]}
                inlineDiffSummary={inlineDiffSummaryByItemId[child.id] ?? null}
                noteColorOverride={noteColorOverride}
                noteCardTheme={noteCardTheme}
                onViewModeChange={(mode) => void handleViewModeChange(child.id, mode)}
                onResize={(size) => void handleResize(child.id, size)}
                onElementChange={handleItemElementChange}
                onActivate={handleItemActivate}
                onInlineEditChange={handleInlineEditChange}
                onInlineDirtyStateChange={handleInlineDirtyStateChange}
                onInlineDiffSummaryChange={handleInlineDiffSummaryChange}
                onInlineEditorActionsChange={handleInlineEditorActionsChange}
                onNoteColorOverrideChange={handleNoteColorOverrideChange}
                onOpen={handleOpenRequest}
                enableInlineDocumentEditing={enableInlineDocumentEditing}
                enableInlineDocumentFocusMode={enableInlineDocumentFocusMode}
                enableInlineDocumentKeyboardShortcuts={enableInlineDocumentKeyboardShortcuts}
                enableNoteColorOverrides={enableNoteColorOverrides}
                isFocused={focusedItemId === child.id}
                isCanvasDimmed={isFocusModeActive}
                onFocusChange={handleFocusChange}
              />
            );
          })}
          </div>
        )}
        </div>
      </div>
    </DndContext>
  );
}
