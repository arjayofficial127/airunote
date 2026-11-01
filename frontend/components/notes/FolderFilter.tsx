'use client';
import { useState } from 'react';
import { ClosedItemsSwitch } from './ClosedItemsSwitch';
import { NotesIcon } from './NotesIcon';

export function FolderFilter({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return <details className="ab-popover an-folder-filter" data-active={checked}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onToggle={event => {
      if (!event.currentTarget.open) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const workspaceLeft = event.currentTarget.closest('.airunote-notes')?.getBoundingClientRect().left ?? 0;
      const leftEdge = Math.min(Math.max(8, workspaceLeft + 8), window.innerWidth - 218);
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 92)), left: Math.max(leftEdge, Math.min(rect.right - 210, window.innerWidth - 218)) });
    }}>
    <summary aria-label={`Filter notes${checked ? ': including done and cancelled' : ''}`} title={checked ? 'Filter: including done and cancelled' : 'Filter notes'}>
      <NotesIcon name="filter" width="18" height="18"/>{checked && <span className="an-filter-indicator" aria-hidden="true"/>}
    </summary>
    <div style={position}><ClosedItemsSwitch checked={checked} onChange={onChange}/></div>
  </details>;
}
