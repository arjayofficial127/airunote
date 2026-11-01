'use client';
import { DndContext, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { useId, useState, type ReactNode } from 'react';
import type { CalendarPlan } from '@/lib/book';
import type { BookWorkspaceModel } from './useBookWorkspace';
export type BookDrop = { kind: 'folder'; folderId: string } | { kind: 'plan'; plan: CalendarPlan; preserveTime?: boolean } | { kind: 'inbox' };
export function DropZone({ id, target, children, className = '', scrollKey }: { id: string; target: BookDrop; children: ReactNode; className?: string; scrollKey?: string }) {
  const instance = useId();
  const { setNodeRef, isOver } = useDroppable({ id: `${instance}:${id}`, data: { target } });
  return <div ref={setNodeRef} data-scroll-key={scrollKey} className={`${className} ${isOver ? 'ab-drop-over' : ''}`}>{children}</div>;
}
export function BookDrag({ model, children, onMoveFolder }: { model: BookWorkspaceModel; children: ReactNode; onMoveFolder?: (id: string, destination: string) => Promise<void> }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor));
  const [moving, setMoving] = useState(false);
  function end(event: DragEndEvent) {
    setMoving(false); if (!event.over || model.actions.busy || model.dirty) { if (model.dirty) model.actions.setError('Save your Context draft before moving an item.'); return; }
    const item = model.items.find(candidate => candidate.id === event.active.data.current?.itemId);
    const target: unknown = event.over.data.current?.target;
    const folderId: unknown = event.active.data.current?.folderId;
    if (typeof folderId === 'string' && onMoveFolder && target && typeof target === 'object' && 'kind' in target && target.kind === 'folder' && 'folderId' in target && typeof target.folderId === 'string') { void onMoveFolder(folderId, target.folderId); return; }
    if (!item || typeof target !== 'object' || target === null || !('kind' in target)) return;
    if (target.kind === 'folder' && 'folderId' in target && typeof target.folderId === 'string') void model.actions.update(item, { folderId: target.folderId, planning: { ...model.actions.fields(item), processed: true } });
    else if (target.kind === 'inbox') void model.actions.update(item, { planning: { ...model.actions.fields(item), processed: false } });
    else if (target.kind === 'plan' && 'plan' in target) {
      // Targets are generated internally from validated calendar controls, never external drops.
      const result = planSchema.safeParse(target.plan);
      if (result.success) {
        const previous = item.planning.plan; let plan = result.data;
        if (plan.kind === 'day' && previous.kind === 'day') {
          if ('preserveTime' in target && target.preserveTime) plan = { ...plan, time: previous.time, duration: previous.duration };
          else if (plan.time !== null) plan = { ...plan, duration: previous.duration };
        }
        const checked = planSchema.safeParse(plan);
        if (!checked.success) { model.actions.setError(checked.error.issues[0]?.message ?? 'This time does not fit the duration'); return; }
        void model.actions.update(item, { planning: { ...model.actions.fields(item), plan: checked.data, ...(model.natural ? { processed: true } : {}) } });
      }
    }
  }
  return <DndContext sensors={sensors} onDragStart={() => setMoving(true)} onDragCancel={() => setMoving(false)} onDragEnd={end} accessibility={{ screenReaderInstructions: { draggable: 'Press Space to pick up. Use arrow keys to move, Space to drop, Escape to cancel. You can also move items with the Context folder and calendar controls.' } }}><div className={`ab-dnd ${moving ? 'ab-dragging' : ''}`}>{children}</div></DndContext>;
}
import { planSchema } from '@/lib/book';
