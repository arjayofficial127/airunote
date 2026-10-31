'use client';
import { useEffect, useRef } from 'react';
import { BookDrag } from '@/components/book/BookDrag';
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
  const { theme, setTheme } = notes;
  const panes = useRef<HTMLDivElement>(null);
  const rememberScroll = useNotesScroll(panes, notes.preferenceKey, notes.ready, `${notes.folderId}:${notes.viewId}:${model.selected?.id ?? 'none'}`);
  useEffect(() => {
    if (!model.selected?.id && !model.creating) return;
    const container = panes.current;
    const content = container?.querySelector<HTMLElement>('.ab-context:not([hidden])');
    if (!container || !content) return;
    const box = container.getBoundingClientRect(); const target = content.getBoundingClientRect();
    if (target.right > box.right || target.left < box.left) container.scrollTo({ left: container.scrollLeft + target.left - box.left, behavior: 'smooth' });
  }, [model.selected?.id, model.creating, model.contextReveal, model.expandedPanel]);
  return <div className="airunote-book airunote-notes" data-theme={theme} role="region" aria-label="Notes workspace">
    <NotesToolbar model={model} theme={theme} onTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')} />
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    {model.configError && <p role="alert" className="ab-error">Existing planning settings could not be read. They have been preserved.</p>}
    <BookDrag model={model}><div ref={panes} className="ab-panes" data-count={model.shownPanels.length} data-panels={model.shownPanels.join(',')} onScrollCapture={rememberScroll} role="group" aria-label="Notes workflow panels" tabIndex={0}>
      <NotesInbox model={model} /><NotesFolders notes={notes} /><NotesViews notes={notes} /><NotesContent model={notes.contentModel} pinned={notes.pinned} onPin={() => notes.setPinned(value => !value)} onClose={notes.closeNote} />
    </div></BookDrag>
    {!model.visible.length && <div className="ab-all-hidden"><button onClick={() => model.setVisible([...panels])}>Show all panels</button></div>}
  </div>;
}
