'use client';
import { useDraggable } from '@dnd-kit/core';
import { useId, useRef, useState } from 'react';
import { ItemActionsButton } from './ItemActionsContext';
import { InlineRename } from './InlineRename';
import { folderLabel, planLabel } from './domain';
import type { BookItem } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function BookItemRow({ item, model, compact = false, showActions = true, calendarEntry = false }: { item: BookItem; model: BookWorkspaceModel; compact?: boolean; showActions?: boolean; calendarEntry?: boolean }) {
  const instance = useId();
  const [renaming, setRenaming] = useState(false);
  const titleButton = useRef<HTMLButtonElement>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${instance}:${item.id}`, disabled: renaming || item.invalidPlanning || model.actions.busy, data: { itemId: item.id } });
  const marker = item.planning.status === 'complete' ? '✓' : item.planning.status === 'cancelled' ? '×' : item.planning.kind === 'event' ? '○' : item.planning.kind === 'note' ? '–' : '•';
  const time = item.planning.plan.kind === 'day' ? item.planning.plan.time : null;
  const calendarDescription = `${item.name} · ${folderLabel(model.folders.find(folder => folder.id === item.folderId)?.humanId)} · ${planLabel(item.planning.plan, model.planningConfig)}${item.invalidPlanning ? ' · Unsupported planning data' : ''}`;
  return <div ref={setNodeRef} className={`ab-item ${compact ? 'ab-item-compact' : ''} ${calendarEntry ? 'ab-calendar-entry' : ''} ${model.selected?.id === item.id ? 'ab-selected' : ''} ${item.planning.status !== 'open' ? 'ab-closed' : ''}`} style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, opacity: isDragging ? 0.55 : 1, zIndex: 4 } : undefined}>
    {model.batchMode && <input type="checkbox" aria-label={`Select ${item.name} for batch`} checked={model.batchIds.includes(item.id)} onChange={event => model.setBatchIds(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />}
    <button type="button" className="ab-grip" aria-label={`Move ${item.name}`} {...listeners} {...attributes}>⠿</button>
    <button type="button" className="ab-marker" disabled={model.actions.busy || item.invalidPlanning} onClick={() => { if (model.dirty) { model.actions.setError('Save your Context draft before changing status.'); return; } void model.actions.cycle(item); }} title={`${item.planning.status}. Click to cycle open, complete, cancelled`} aria-label={`${item.name}: ${item.planning.status}. Change status`}>{marker}</button>
    {renaming ? <InlineRename name={item.name} label="Note name" setDraftFlag={model.setDraftFlag} error={model.actions.error}
      onClose={() => { setRenaming(false); requestAnimationFrame(() => titleButton.current?.focus()); }}
      onSave={async name => {
        if (model.dirty) { model.actions.setError('Finish editing your note before renaming it.'); return false; }
        return !!await model.actions.update(item, { name });
      }} /> : <>
      <button ref={titleButton} type="button" className="ab-item-title" title={calendarEntry ? calendarDescription : compact ? item.name : undefined} onClick={() => model.open(item)}>{calendarEntry && time && <time className="ab-calendar-entry-time" dateTime={time}>{time}</time>}<span>{item.planning.priority ? '★ ' : ''}{item.name}</span>{!compact && !calendarEntry && <small>{folderLabel(model.folders.find(folder => folder.id === item.folderId)?.humanId)} · {model.natural && item.planning.plan.kind === 'unplanned' ? 'Not scheduled' : planLabel(item.planning.plan, model.planningConfig)}{item.invalidPlanning ? ' · Unsupported planning data' : ''}</small>}</button>
      {model.natural && <button type="button" className="an-rename-note" aria-label={`Rename ${item.name}`} title="Rename note" disabled={model.actions.busy || item.invalidPlanning || model.dirty} onClick={() => setRenaming(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5" /></svg></button>}
      {showActions && <ItemActionsButton item={item} disabled={model.actions.busy || model.dirty} />}
    </>}
  </div>;
}
