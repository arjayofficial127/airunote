/**
 * Board Lens Component
 * Renders board columns with drag-and-drop functionality
 * Uses lens.metadata.columns for column definitions
 * Persists placement via lens_items table
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';
import { FileTypeChip } from '../components/FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';

interface BoardColumn {
  id: string;
  title: string;
  description?: string | null;
  order: number;
}

interface BoardLensProps {
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

interface BoardCardProps {
  id: string;
  type: 'document' | 'folder';
  title: string;
  isDragging?: boolean;
}

function BoardCard({ id, type, title, isDragging }: BoardCardProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const href =
    type === 'document'
      ? `/orgs/${orgIdFromParams}/airunote/document/${id}`
      : `/orgs/${orgIdFromParams}/airunote/folder/${id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 shadow-sm
        border border-gray-200 dark:border-gray-700
        cursor-grab active:cursor-grabbing
        hover:shadow-md transition-shadow
        ${isDragging || isSortableDragging ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <Link href={href} className="block">
        <div className="flex items-center gap-2">
          {type === 'document' ? (
            <FileTypeChip type="TXT" />
          ) : (
            <span className="text-lg">{getFolderTypeIcon('box')}</span>
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">
            {title}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {type === 'document' ? 'Document' : 'Folder'}
          </span>
        </div>
      </Link>
    </div>
  );
}

interface BoardColumnProps {
  column: BoardColumn;
  items: Array<{
    id: string;
    type: 'document' | 'folder';
    title: string;
    name?: string;
    humanId?: string;
  }>;
  columnId: string;
}

function BoardColumnComponent({ column, items, columnId }: BoardColumnProps) {
  const itemIds = items.map((item) => item.id);
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mr-4
        ${isOver ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {column.title}
        </h3>
        {column.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {column.description}
          </p>
        )}
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px]">
          {items.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              No items
            </div>
          ) : (
            items.map((item) => (
              <BoardCard
                key={item.id}
                id={item.id}
                type={item.type}
                title={item.title}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function BoardLens({
  orgId,
  lens,
  items: children,
  lensItems,
  onPersist,
}: BoardLensProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(lensItems);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Extract columns from lens metadata
  const columns: BoardColumn[] = useMemo(() => {
    const metadata = lens.metadata as { columns?: BoardColumn[] };
    if (metadata.columns && Array.isArray(metadata.columns)) {
      return metadata.columns.sort((a, b) => a.order - b.order);
    }
    // Default columns if none defined
    return [
      { id: 'todo', title: 'Todo', description: null, order: 0 },
      { id: 'doing', title: 'Doing', description: null, order: 1 },
      { id: 'done', title: 'Done', description: null, order: 2 },
    ];
  }, [lens.metadata]);

  // Create map of entityId -> lens item
  const itemsMap = useMemo(() => {
    const map = new Map<string, typeof lensItems[0]>();
    localItems.forEach((item) => {
      map.set(item.entityId, item);
    });
    return map;
  }, [localItems]);

  // Group children by columnId
  const groupedByColumn = useMemo(() => {
    const groups = new Map<string, typeof children>();

    // Initialize all columns
    columns.forEach((col) => {
      groups.set(col.id, []);
    });

    // Add unassigned column
    groups.set('unassigned', []);

    // Group children
    children.forEach((child) => {
      const item = itemsMap.get(child.id);
      const columnId = item?.columnId || 'unassigned';
      if (!groups.has(columnId)) {
        groups.set(columnId, []);
      }
      groups.get(columnId)!.push(child);
    });

    // Sort items within each column by order
    groups.forEach((items, columnId) => {
      items.sort((a, b) => {
        const itemA = itemsMap.get(a.id);
        const itemB = itemsMap.get(b.id);
        const orderA = itemA?.order ?? 0;
        const orderB = itemB?.order ?? 0;
        return orderA - orderB;
      });
    });

    return groups;
  }, [children, itemsMap, columns]);

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return children.find((c) => c.id === activeId) || null;
  }, [activeId, children]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find the item being dragged
      const draggedItem = children.find((c) => c.id === activeId);
      if (!draggedItem) return;

      // Determine target column
      let targetColumnId: string | null = null;

      // Check if dropped on a column container (column IDs are in the columns array)
      if (columns.some((col) => col.id === overId)) {
        targetColumnId = overId;
      } else {
        // Dropped on another item - find which column it belongs to
        const overItem = children.find((c) => c.id === overId);
        if (overItem) {
          const overLensItem = itemsMap.get(overItem.id);
          targetColumnId = overLensItem?.columnId || 'unassigned';
        } else {
          return; // Invalid drop target
        }
      }

      // Get current column items to determine new order
      const targetColumnItems = groupedByColumn.get(targetColumnId) || [];
      let insertIndex = targetColumnItems.findIndex((item) => item.id === overId);
      
      // If dropped on column header (not an item), append to end
      if (insertIndex < 0) {
        insertIndex = targetColumnItems.length;
      }
      
      const newOrder = insertIndex;

      // Update local state immediately (optimistic update)
      const currentItem = itemsMap.get(activeId);
      const updatedItem: typeof lensItems[0] = {
        ...(currentItem || {
          id: '',
          lensId: lens.id,
          entityId: activeId,
          entityType: draggedItem.type,
          columnId: null,
          order: null,
          x: null,
          y: null,
          metadata: {},
          createdAt: '',
          updatedAt: '',
        }),
        columnId: targetColumnId === 'unassigned' ? null : targetColumnId,
        order: newOrder,
      };

      setLocalItems((prev) => {
        const newItems = prev.filter((item) => item.entityId !== activeId);
        return [...newItems, updatedItem];
      });

      // Persist to server
      try {
        await onPersist([
          {
            entityId: activeId,
            entityType: draggedItem.type,
            columnId: targetColumnId === 'unassigned' ? null : targetColumnId,
            order: newOrder,
          },
        ]);
      } catch (error) {
        // Revert on error
        setLocalItems(lensItems);
        console.error('Failed to persist board item:', error);
      }
    },
    [children, columns, itemsMap, groupedByColumn, lens.id, onPersist, lensItems]
  );

  // Build column order: unassigned first, then columns by order
  const columnOrder = useMemo(() => {
    const ordered = ['unassigned', ...columns.map((col) => col.id)];
    return ordered;
  }, [columns]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex overflow-x-auto pb-4">
        {columnOrder.map((columnId) => {
          const column =
            columnId === 'unassigned'
              ? { id: 'unassigned', title: 'Unassigned', description: null, order: -1 }
              : columns.find((col) => col.id === columnId);

          if (!column) return null;

          const items = groupedByColumn.get(columnId) || [];

          return (
            <BoardColumnComponent
              key={column.id}
              column={column}
              items={items}
              columnId={column.id}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <BoardCard
            id={activeItem.id}
            type={activeItem.type}
            title={activeItem.title}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
