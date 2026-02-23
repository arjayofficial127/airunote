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
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';
import { FileTypeChip } from '../components/FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import { useDocumentContent } from '../hooks/useDocumentContent';

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
  lensItems: Array<{
    id: string;
    lensId: string;
    entityId: string;
    entityType: 'document' | 'folder';
    columnId: string | null;
    order: number | null;
    x: number | null;
    y: number | null;
    metadata: {
      viewMode?: 'icon' | 'preview' | 'full' | 'scroll';
    };
    createdAt: string;
    updatedAt: string;
  }>;
  onPersist: (items: LensItemInput[]) => Promise<void>;
}

type ViewMode = 'icon' | 'preview' | 'full' | 'scroll';

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
  orgId: string;
}

function CanvasItem({ item, x, y, viewMode, onToggleViewMode, orgId }: CanvasItemProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  // Fetch document content if needed for preview/full/scroll modes
  const { document: documentData } = useDocumentContent(
    viewMode !== 'icon' && item.type === 'document' ? item.id : null
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
      case 'icon':
        return (
          <div className="flex items-center gap-2">
            {item.type === 'document' ? (
              <FileTypeChip type="TXT" />
            ) : (
              <span className="text-lg">{getFolderTypeIcon('box')}</span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
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

      case 'scroll':
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
              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap h-[200px] overflow-y-auto">
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
      case 'icon':
        return 'w-32';
      case 'preview':
        return 'w-48';
      case 'full':
        return 'w-64';
      case 'scroll':
        return 'w-64';
      default:
        return 'w-32';
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleViewMode();
        }}
        className="absolute top-1 right-1 p-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
    children.forEach((child) => {
      const lensItem = lensItems.find((item) => item.entityId === child.id);
      if (lensItem) {
        itemsMap.set(child.id, {
          id: child.id,
          x: lensItem.x ?? 50,
          y: lensItem.y ?? 50,
          viewMode: lensItem.metadata?.viewMode || 'icon',
        });
      } else {
        // Default random position
        const x = Math.random() * 250 + 50; // 50-300
        const y = Math.random() * 250 + 50; // 50-300
        itemsMap.set(child.id, {
          id: child.id,
          x: Math.round(x),
          y: Math.round(y),
          viewMode: 'icon',
        });
      }
    });
    setLocalItems(itemsMap);
  }, [children, lensItems]);

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
          setLocalItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(activeId, {
              id: activeId,
              x: originalItem.x ?? currentState.x,
              y: originalItem.y ?? currentState.y,
              viewMode: originalItem.metadata?.viewMode || 'icon',
            });
            return newMap;
          });
        }
        console.error('Failed to persist canvas item:', error);
      }
    },
    [children, localItems, lensItems, onPersist]
  );

  const handleToggleViewMode = useCallback(
    async (itemId: string) => {
      const currentState = localItems.get(itemId);
      if (!currentState) return;

      // Cycle through view modes
      const modes: ViewMode[] = ['icon', 'preview', 'full', 'scroll'];
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

      // Persist to server
      try {
        await onPersist([
          {
            entityId: itemId,
            entityType: item.type,
            // Preserve existing x, y
            x: currentState.x,
            y: currentState.y,
            metadata: {
              viewMode: nextMode,
            },
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
        {children.map((child) => {
          const state = localItems.get(child.id);
          if (!state) return null;

          return (
            <CanvasItem
              key={child.id}
              item={child}
              x={state.x}
              y={state.y}
              viewMode={state.viewMode}
              onToggleViewMode={() => handleToggleViewMode(child.id)}
              orgId={orgId}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
