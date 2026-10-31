'use client';

import Link from 'next/link';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileTypeChip } from '../components/FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';

export interface BoardItem {
  id: string;
  type: 'document' | 'folder';
  title: string;
  name?: string;
  humanId?: string;
}
export interface BoardColumnDefinition {
  id: string;
  title: string;
  description?: string | null;
  order: number;
}

interface BoardStageControls {
  onOpenItem?: (id: string, type: 'document' | 'folder') => void;
  stages: BoardColumnDefinition[];
  isSaving: boolean;
  onMove: (itemId: string, stageId: string) => void;
}

function BoardCard({ item, orgId, stageId, stages, isSaving, onMove, onOpenItem }: BoardStageControls & { item: BoardItem; orgId: string; stageId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const href = `/orgs/${orgId}/airunote/${item.type === 'document' ? 'document' : 'folder'}/${item.id}`;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <button type="button" {...attributes} {...listeners} aria-label={`Move ${item.title}`} className="mt-0.5 shrink-0 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:cursor-grabbing">⠿</button>
      <div className="min-w-0 flex-1">
      <Link href={href} onClick={event => { if (onOpenItem && !event.metaKey && !event.ctrlKey && !event.shiftKey) { event.preventDefault(); onOpenItem(item.id, item.type); } }} className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
        <div className="mb-2">{item.type === 'document' ? <FileTypeChip type="TXT" /> : <span aria-hidden="true">{getFolderTypeIcon('box')}</span>}</div>
        <div className="break-words text-sm font-medium leading-relaxed text-slate-900">{item.title}</div>
        <div className="mt-2 text-xs text-slate-400">{item.type === 'document' ? 'Document' : 'Folder'}</div>
      </Link>
      <select aria-label={`Move ${item.title} to stage`} value={stageId} disabled={isSaving} onChange={(event) => onMove(item.id, event.target.value)} className="mt-3 min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50">
        {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
      </select>
      </div>
    </div>
  );
}

export function BoardColumn({ column, items, orgId, stages, isSaving, onMove, onOpenItem }: BoardStageControls & { column: BoardColumnDefinition; items: BoardItem[]; orgId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section ref={setNodeRef} aria-label={`${column.title}, ${items.length} items`} className={`min-w-[240px] max-w-[340px] flex-1 rounded-2xl border p-3 ${isOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-100/70'}`}>
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-slate-800">{column.title}</h3>
        <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{items.length}</span>
      </div>
      {column.description && <p className="mb-3 px-1 text-xs leading-relaxed text-slate-500">{column.description}</p>}
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[220px] space-y-3">
          {items.length ? items.map((item) => <BoardCard key={item.id} item={item} orgId={orgId} stageId={column.id} stages={stages} isSaving={isSaving} onMove={onMove} onOpenItem={onOpenItem} />) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs leading-relaxed text-slate-500">{column.id === 'unassigned' ? 'New notes and folders appear here. Drag one into a stage to begin.' : 'Drag an item here when it reaches this stage.'}</p>}
        </div>
      </SortableContext>
    </section>
  );
}
