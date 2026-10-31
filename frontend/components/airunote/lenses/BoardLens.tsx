/** Board lens: the same folder content, grouped by saved stage placement. */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { AiruLens, AiruLensItem, LensItemInput } from '@/lib/api/airunoteLensesApi';
import { toast } from '@/lib/toast';
import { BoardColumn, type BoardColumnDefinition, type BoardItem } from './BoardColumn';

interface BoardLensProps {
  onOpenItem?: (id: string, type: 'document' | 'folder') => void;
  orgId: string;
  lens: AiruLens;
  items: BoardItem[];
  lensItems: AiruLensItem[];
  onPersist: (items: LensItemInput[]) => Promise<void>;
}

const DEFAULT_COLUMNS: BoardColumnDefinition[] = [
  { id: 'todo', title: 'To do', order: 0 },
  { id: 'doing', title: 'In progress', order: 1 },
  { id: 'done', title: 'Done', order: 2 },
];

function isBoardColumn(value: unknown): value is BoardColumnDefinition {
  if (typeof value !== 'object' || value === null) return false;
  return 'id' in value && typeof value.id === 'string' && 'title' in value && typeof value.title === 'string' && 'order' in value && typeof value.order === 'number';
}

export function BoardLens({ orgId, lens, items: children, lensItems, onPersist, onOpenItem }: BoardLensProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(lensItems);
  const [isSaving, setIsSaving] = useState(false);
  const currentLensId = useRef(lens.id);
  currentLensId.current = lens.id;
  // Lens changes and successful saves must replace stale placement state.
  useEffect(() => { setLocalItems(lensItems); setActiveId(null); }, [lens.id, lensItems]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const columns = useMemo(() => {
    const defined = lens.metadata.columns;
    return Array.isArray(defined) && defined.some(isBoardColumn)
      ? defined.filter(isBoardColumn).filter((column) => column.id !== 'unassigned').sort((a, b) => a.order - b.order)
      : DEFAULT_COLUMNS;
  }, [lens.metadata]);
  const itemsMap = useMemo(() => new Map(localItems.map((item) => [item.entityId, item])), [localItems]);
  const resolveColumn = useCallback((itemId: string) => {
    const columnId = itemsMap.get(itemId)?.columnId;
    return columnId && columns.some((column) => column.id === columnId) ? columnId : 'unassigned';
  }, [columns, itemsMap]);
  const grouped = useMemo(() => {
    const groups = new Map<string, BoardItem[]>([['unassigned', []], ...columns.map((column): [string, BoardItem[]] => [column.id, []])]);
    children.forEach((child) => groups.get(resolveColumn(child.id))?.push(child));
    groups.forEach((items) => items.sort((a, b) => (itemsMap.get(a.id)?.order ?? 0) - (itemsMap.get(b.id)?.order ?? 0)));
    return groups;
  }, [children, columns, itemsMap, resolveColumn]);
  const activeItem = children.find((item) => item.id === activeId);

  const moveItemToStage = useCallback(async (itemId: string, targetColumn: string, beforeItemId?: string) => {
    if (isSaving || (targetColumn !== 'unassigned' && !columns.some((column) => column.id === targetColumn))) return;
    const dragged = children.find((item) => item.id === itemId);
    if (!dragged) return;
    const targetItems = [...(grouped.get(targetColumn) ?? [])].filter((item) => item.id !== itemId);
    const index = beforeItemId ? targetItems.findIndex((item) => item.id === beforeItemId) : targetItems.length;
    targetItems.splice(index < 0 ? targetItems.length : index, 0, dragged);
    const updates: LensItemInput[] = targetItems.map((item, order) => ({ entityId: item.id, entityType: item.type, columnId: targetColumn === 'unassigned' ? null : targetColumn, order }));
    const previous = localItems;
    const next = new Map(localItems.map((item) => [item.entityId, item]));
    updates.forEach((update) => next.set(update.entityId, {
      id: '', lensId: lens.id, columnId: null, order: null, x: null, y: null, viewMode: null, metadata: {}, createdAt: '', updatedAt: '',
      ...next.get(update.entityId), ...update,
    }));
    setLocalItems(Array.from(next.values()));
    setIsSaving(true);
    try { await onPersist(updates); }
    catch (error) { if (currentLensId.current === lens.id) setLocalItems(previous); toast(error instanceof Error ? error.message : 'Could not save the move. Your board has been restored.', 'error'); }
    finally { setIsSaving(false); }
  }, [children, columns, grouped, isSaving, lens.id, localItems, onPersist]);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const itemId = String(active.id);
    const overId = String(over.id);
    if (itemId === overId) return;
    const isColumn = overId === 'unassigned' || columns.some((column) => column.id === overId);
    const overItem = children.find((item) => item.id === overId);
    if (!isColumn && !overItem) return;
    void moveItemToStage(itemId, isColumn ? overId : resolveColumn(overId), isColumn ? undefined : overId);
  }, [children, columns, moveItemToStage, resolveColumn]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => setActiveId(String(event.active.id))} onDragEnd={(event) => void handleDragEnd(event)} onDragCancel={() => setActiveId(null)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>{children.length} {children.length === 1 ? 'item' : 'items'} in this view · Drag a handle or choose a stage on any card</p>
        <span role="status">{isSaving ? 'Saving move…' : 'Moves save automatically'}</span>
      </div>
      <div className="flex w-full gap-4 overflow-x-auto pb-4" aria-label="Board stages">
        {[{ id: 'unassigned', title: 'Unassigned', order: -1 }, ...columns].map((column) => <BoardColumn key={column.id} orgId={orgId} column={column} items={grouped.get(column.id) ?? []} stages={[{ id: 'unassigned', title: 'Unassigned', order: -1 }, ...columns]} isSaving={isSaving} onMove={(itemId, stageId) => void moveItemToStage(itemId, stageId)} onOpenItem={onOpenItem} />)}
      </div>
      <DragOverlay>{activeItem && <div className="max-w-[260px] rounded-xl border border-blue-300 bg-white p-4 text-sm font-medium text-slate-900 shadow-xl">{activeItem.title}</div>}</DragOverlay>
    </DndContext>
  );
}
