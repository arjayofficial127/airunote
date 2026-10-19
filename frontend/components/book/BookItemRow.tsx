'use client';
import { useDraggable } from '@dnd-kit/core';
import { useId } from 'react';
import { planLabel } from './domain';
import type { BookItem } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function BookItemRow({ item, model, compact = false }: { item: BookItem; model: BookWorkspaceModel; compact?: boolean }) {
  const instance = useId();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${instance}:${item.id}`, disabled: item.invalidPlanning || model.actions.busy, data: { itemId: item.id } });
  const marker = item.planning.status === 'complete' ? '✓' : item.planning.status === 'cancelled' ? '×' : item.planning.kind === 'event' ? '○' : item.planning.kind === 'note' ? '–' : '•';
  return <div ref={setNodeRef} className={`ab-item ${compact ? 'ab-item-compact' : ''} ${model.selected?.id === item.id ? 'ab-selected' : ''} ${item.planning.status !== 'open' ? 'ab-closed' : ''}`} style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.55 : 1, zIndex: 4 } : undefined}>
    {model.batchMode && <input type="checkbox" aria-label={`Select ${item.name} for batch`} checked={model.batchIds.includes(item.id)} onChange={event => model.setBatchIds(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />}
    <button type="button" className="ab-grip" aria-label={`Move ${item.name}`} {...listeners} {...attributes}>⠿</button>
    <button type="button" className="ab-marker" disabled={model.actions.busy || item.invalidPlanning} onClick={() => { if (model.dirty) { model.actions.setError('Save your Context draft before changing status.'); return; } void model.actions.cycle(item); }} title={`${item.planning.status}. Click to cycle open, complete, cancelled`} aria-label={`${item.name}: ${item.planning.status}. Change status`}>{marker}</button>
    <button type="button" className="ab-item-title" onClick={() => model.open(item)}><span>{item.planning.priority ? '★ ' : ''}{item.name}</span>{!compact && <small>{model.folders.find(folder => folder.id === item.folderId)?.humanId} · {planLabel(item.planning.plan, model.config)}{item.invalidPlanning ? ' · Unsupported planning data' : ''}</small>}</button>
  </div>;
}
