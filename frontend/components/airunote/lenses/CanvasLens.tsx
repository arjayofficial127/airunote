/**
 * Canvas Lens Component
 * Renders children in free-positioned canvas layout
 * Persists x/y coordinates and viewMode via lens_items table
 */

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AiruLens, AiruLensItem, ViewMode } from '@/lib/api/airunoteLensesApi';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';
import { FileTypeChip } from '../components/FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import { useDocumentContent } from '../hooks/useDocumentContent';
import { resolveDocumentViewMode } from '../utils/resolveDocumentViewMode';
import { useDocumentViewPreferences } from '../stores/useDocumentViewPreferences';

interface CanvasLensProps {
  orgId: string;
  lens: AiruLens;
  items: Array<{
    id: string;
    type: 'document' | 'folder';
    title: string;
    name?: string;
    humanId?: string;
  }>;
  lensItems: AiruLensItem[];
  onPersist: (items: LensItemInput[]) => Promise<void>;
}

interface CanvasItemState {
  id: string;
  x: number;
  y: number;
  viewMode: ViewMode;
}

interface CanvasItemProps {
  item: {
    id: string;
    type: 'document' | 'folder';
    title: string;
    name?: string;
    humanId?: string;
  };
  x: number;
  y: number;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onViewModeChange: (mode: ViewMode | null) => void;
  orgId: string;
}

function CanvasItem({ item, x, y, viewMode, onToggleViewMode, onViewModeChange, orgId }: CanvasItemProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [isViewModeDropdownOpen, setIsViewModeDropdownOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  // Fetch document content if needed for preview/full modes
  const { document: documentData } = useDocumentContent(
    (viewMode === 'preview' || viewMode === 'full') && item.type === 'document' ? item.id : null
  );
  const documentContent = documentData?.content || null;

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    position: 'absolute' as const,
    left: `${x}px`,
    top: `${y}px`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const href =
    item.type === 'document'
      ? `/orgs/${orgIdFromParams}/airunote/document/${item.id}`
      : `/orgs/${orgIdFromParams}/airunote/folder/${item.id}`;

  // Render based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return (
          <div className="flex items-center gap-2">
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
          <div className="flex flex-col items-center gap-2">
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
          <div>
            <div className="flex items-center gap-2 mb-2">
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
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                {documentContent.substring(0, 150)}...
              </p>
            )}
            {item.type === 'folder' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
            )}
          </div>
        );

      case 'full':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
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
              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[300px] overflow-auto">
                {documentContent}
              </div>
            )}
            {item.type === 'folder' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getCardSize = () => {
    switch (viewMode) {
      case 'list':
        return 'w-48';
      case 'icon':
        return 'w-32';
      case 'preview':
        return 'w-56';
      case 'full':
        return 'w-80';
      default:
        return 'w-48';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${getCardSize()}
        bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md
        border border-gray-200 dark:border-gray-700
        cursor-grab active:cursor-grabbing
        hover:shadow-lg transition-shadow
        group
        ${isDragging ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <Link href={href} className="block mb-2" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </Link>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
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
  );
}

export function CanvasLens({
  orgId,
  lens,
  items: children,
  lensItems,
  onPersist,
}: CanvasLensProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<Map<string, CanvasItemState>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Initialize local items state from lensItems
  useEffect(() => {
    const itemsMap = new Map<string, CanvasItemState>();
    console.log('[CanvasLens] Initializing items:', { 
      childrenCount: children.length, 
      lensItemsCount: lensItems.length,
      children: children.map(c => ({ id: c.id, type: c.type, title: c.title }))
    });
    children.forEach((child) => {
      const lensItem = lensItems.find((item) => item.entityId === child.id);
      if (lensItem) {
        // Resolve view mode using hierarchy
        const resolvedViewMode = resolveDocumentViewMode({
          lensItemViewMode: lensItem.viewMode,
          lensDefaultView,
          globalDefaultView,
        });
        itemsMap.set(child.id, {
          id: child.id,
          x: lensItem.x ?? 50,
          y: lensItem.y ?? 50,
          viewMode: resolvedViewMode,
        });
      } else {
        // Default random position
        const x = Math.random() * 250 + 50; // 50-300
        const y = Math.random() * 250 + 50; // 50-300
        itemsMap.set(child.id, {
          id: child.id,
          x: Math.round(x),
          y: Math.round(y),
          viewMode: globalDefaultView,
        });
      }
    });
    console.log('[CanvasLens] Local items map size:', itemsMap.size);
    setLocalItems(itemsMap);
  }, [children, lensItems, lensDefaultView, globalDefaultView]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta } = event;
      setActiveId(null);

      if (!delta || !containerRef.current) return;

      const activeId = active.id as string;
      const currentState = localItems.get(activeId);
      if (!currentState) return;

      // Calculate new position
      const newX = Math.max(0, currentState.x + delta.x);
      const newY = Math.max(0, currentState.y + delta.y);

      // Update local state immediately (optimistic update)
      setLocalItems((prev) => {
        const newMap = new Map(prev);
        newMap.set(activeId, {
          ...currentState,
          x: newX,
          y: newY,
        });
        return newMap;
      });

      // Find the item being dragged
      const draggedItem = children.find((c) => c.id === activeId);
      if (!draggedItem) return;

      // Persist to server
      try {
        await onPersist([
          {
            entityId: activeId,
            entityType: draggedItem.type,
            x: newX,
            y: newY,
            // Preserve existing metadata
            metadata: {
              viewMode: currentState.viewMode,
            },
          },
        ]);
      } catch (error) {
        // Revert on error
        const originalItem = lensItems.find((item) => item.entityId === activeId);
        if (originalItem) {
          const resolvedViewMode = resolveDocumentViewMode({
            lensItemViewMode: originalItem.viewMode,
            lensDefaultView,
            globalDefaultView,
          });
          setLocalItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(activeId, {
              id: activeId,
              x: originalItem.x ?? currentState.x,
              y: originalItem.y ?? currentState.y,
              viewMode: resolvedViewMode,
            });
            return newMap;
          });
        }
        console.error('Failed to persist canvas item:', error);
      }
    },
    [children, localItems, lensItems, onPersist, lensDefaultView, globalDefaultView]
  );

  const handleToggleViewMode = useCallback(
    async (itemId: string) => {
      const currentState = localItems.get(itemId);
      if (!currentState) return;

      // Cycle through view modes
      const modes: ViewMode[] = ['list', 'icon', 'preview', 'full'];
      const currentIndex = modes.indexOf(currentState.viewMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const nextMode = modes[nextIndex];

      // Update local state immediately
      setLocalItems((prev) => {
        const newMap = new Map(prev);
        newMap.set(itemId, {
          ...currentState,
          viewMode: nextMode,
        });
        return newMap;
      });

      // Find the item
      const item = children.find((c) => c.id === itemId);
      if (!item) return;

      // Persist to server - update viewMode field (not metadata)
      try {
        await onPersist([
          {
            entityId: itemId,
            entityType: item.type,
            // Preserve existing x, y
            x: currentState.x,
            y: currentState.y,
            viewMode: nextMode,
          },
        ]);
      } catch (error) {
        // Revert on error
        setLocalItems((prev) => {
          const newMap = new Map(prev);
          newMap.set(itemId, {
            ...currentState,
          });
          return newMap;
        });
        console.error('Failed to persist view mode:', error);
      }
    },
    [children, localItems, onPersist]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="relative w-full h-screen overflow-auto bg-gray-50 dark:bg-gray-900"
        style={{ minHeight: '600px' }}
      >
        {children.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium mb-2">No items in this folder</p>
              <p className="text-sm">Add folders or documents to see them on the canvas</p>
            </div>
          </div>
        ) : (
          children.map((child) => {
            const state = localItems.get(child.id);
            if (!state) {
              console.warn('[CanvasLens] No state found for item:', child.id);
              return null;
            }

            return (
              <CanvasItem
                key={child.id}
                item={child}
                x={state.x}
                y={state.y}
                viewMode={state.viewMode}
                onToggleViewMode={() => handleToggleViewMode(child.id)}
                onViewModeChange={(mode) => {
                  const currentState = localItems.get(child.id);
                  if (!currentState) return;
                  
                  // Update local state
                  setLocalItems((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(child.id, {
                      ...currentState,
                      viewMode: mode ?? globalDefaultView,
                    });
                    return newMap;
                  });
                  
                  // Persist to server
                  const item = children.find((c) => c.id === child.id);
                  if (item) {
                    onPersist([
                      {
                        entityId: child.id,
                        entityType: item.type,
                        x: currentState.x,
                        y: currentState.y,
                        viewMode: mode,
                      },
                    ]).catch((error) => {
                      console.error('Failed to persist view mode:', error);
                      // Revert on error
                      setLocalItems((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(child.id, currentState);
                        return newMap;
                      });
                    });
                  }
                }}
                orgId={orgId}
              />
            );
          })
        )}
      </div>
    </DndContext>
  );
}
