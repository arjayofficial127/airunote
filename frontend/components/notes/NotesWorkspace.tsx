'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ItemActionsContext } from '@/components/book/ItemActionsContext';
import { NotesLifecycleDialog } from './NotesLifecycleDialog';
import { BookDrag } from '@/components/book/BookDrag';
import { useNotesFolderMove } from './useNotesFolderMove';
import { NotesInbox } from './NotesInbox';
import { useNotesScroll } from './useNotesScroll';
import { panels } from '@/components/book/domain';
import { NotesFolders } from './NotesFolders';
import { NotesViews } from './NotesViews';
import { NotesContent } from './NotesContent';
import { useNotesWorkspace } from './useNotesWorkspace';
import { NotesToolbar } from './NotesToolbar';
import '@/components/book/book.css';
import './notes.css';

export function NotesWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const notes = useNotesWorkspace(rootFolderId, orgId, userId); const { model } = notes;
  const moveFolder = useNotesFolderMove(model);
  const { theme, setTheme } = notes;
  const panes = useRef<HTMLDivElement>(null);
  const rememberScroll = useNotesScroll(panes, notes.preferenceKey, notes.ready, `${notes.panes.folders.map(pane => pane.id).join(',')}:${notes.panes.lenses.map(pane => `${pane.id}:${pane.folderId}:${pane.viewId}`).join(',')}:${model.selected?.id ?? 'none'}`);
  useEffect(() => {
    if (!model.selected?.id && !model.creating) return;
    const container = panes.current;
    const content = container?.querySelector<HTMLElement>('.ab-context:not([hidden])');
    if (!container || !content) return;
    const box = container.getBoundingClientRect(); const target = content.getBoundingClientRect();
    if (target.right > box.right || target.left < box.left) container.scrollTo({ left: container.scrollLeft + target.left - box.left, behavior: 'smooth' });
  }, [model.selected?.id, model.creating, model.contextReveal, model.expandedPanel]);
  function groupTrack(count: number, layout: 'row' | 'grid', width: number | null, min: number) {
    return width ? `${width}px` : `minmax(${(layout === 'grid' ? Math.min(count, 2) : count) * min}px, ${count}fr)`;
  }
  const tracks = { inbox: 'minmax(280px,.75fr)', organizer: groupTrack(notes.panes.folders.length, notes.panes.folderLayout, notes.panes.folderWidth, 300), calendar: groupTrack(notes.panes.lenses.length, notes.panes.lensLayout, notes.panes.lensWidth, 380), context: 'minmax(360px,1fr)' };
  const paneStyle: CSSProperties = { gridTemplateColumns: model.shownPanels.map(panel => tracks[panel]).join(' ') };
  return <div className="airunote-book airunote-notes" data-theme={theme} role="region" aria-label="Notes workspace">
    <NotesToolbar model={model} theme={theme} onTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} />
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    {model.configError && <p role="alert" className="ab-error">Existing planning settings could not be read. They have been preserved.</p>}
    <ItemActionsContext.Provider value={item => notes.lifecycle.choose({ kind: 'note', item })}><BookDrag model={model} onMoveFolder={moveFolder}><div ref={panes} className="ab-panes" style={paneStyle} data-count={model.shownPanels.length} data-panels={model.shownPanels.join(',')} onScrollCapture={rememberScroll} role="group" aria-label="Notes workflow panels" tabIndex={0}>
      <NotesInbox model={model} /><NotesFolders notes={notes} /><NotesViews notes={notes} /><NotesContent model={notes.contentModel} pinned={notes.pinned} onPin={() => notes.setPinned(value => !value)} onClose={notes.closeNote} />
    </div></BookDrag></ItemActionsContext.Provider>
    <NotesLifecycleDialog notes={notes} />
    {!model.visible.length && <div className="ab-all-hidden"><button onClick={() => model.setVisible([...panels])}>Show all panels</button></div>}
  </div>;
}
