'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookDrag } from '@/components/book/BookDrag';
import { InboxPane } from '@/components/book/InboxPane';
import { BatchTools } from '@/components/book/BatchTools';
import { panels, type Panel } from '@/components/book/domain';
import { NotesFolders } from './NotesFolders';
import { NotesViews } from './NotesViews';
import { NotesContent } from './NotesContent';
import { useNotesWorkspace } from './useNotesWorkspace';
import '@/components/book/book.css';
import './notes.css';

const labels: Record<Panel, string> = { inbox: 'Inbox', organizer: 'Folders', calendar: 'View', context: 'Content' };

export function NotesWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const notes = useNotesWorkspace(rootFolderId, orgId, userId); const { model } = notes;
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const panes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!model.selected?.id && !model.creating) return;
    const container = panes.current;
    const content = container?.querySelector<HTMLElement>('.ab-context:not([hidden])');
    if (!container || !content) return;
    const box = container.getBoundingClientRect(); const target = content.getBoundingClientRect();
    if (target.right > box.right || target.left < box.left) container.scrollTo({ left: container.scrollLeft + target.left - box.left, behavior: 'smooth' });
  }, [model.selected?.id, model.creating, model.contextReveal, model.expandedPanel]);
  function toggle(panel: Panel) { model.setExpandedPanel(null); model.setVisible(previous => previous.includes(panel) ? previous.filter(value => value !== panel) : panels.filter(value => previous.includes(value) || value === panel)); }
  return <div className="airunote-book airunote-notes" data-theme={theme} role="region" aria-label="Notes workspace">
    <header className="an-toolbar"><h1>Notes</h1><span className="an-local-hint">Your working space</span><div className="an-toolbar-controls">
      <input aria-label="Search notes" placeholder="Find a thought…" value={model.query} onChange={event => model.setQuery(event.target.value)} />
      <details className="ab-popover"><summary>Panels</summary><div>{panels.map((panel, index) => <label key={panel}><input type="checkbox" checked={model.visible.includes(panel)} onChange={() => toggle(panel)} />0{index + 1} {labels[panel]}</label>)}<button onClick={() => { model.setExpandedPanel(null); model.setVisible([...panels]); }}>Show all panels</button></div></details>
      <details className="ab-popover" onToggle={event => model.setBatchMode(event.currentTarget.open)}><summary>Batch{model.batchIds.length ? ` · ${model.batchIds.length}` : ''}</summary><div><BatchTools model={model} /></div></details>
      <button aria-label={`Use ${theme === 'light' ? 'Charcoal' : 'Light'} appearance`} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Charcoal' : 'Light'}</button>
      <Link href={`/orgs/${orgId}/airunote/library`} title="Open the previous library and its tools">Library ↗</Link>
    </div></header>
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    {model.configError && <p role="alert" className="ab-error">Existing planning settings could not be read. They have been preserved.</p>}
    <BookDrag model={model}><div ref={panes} className="ab-panes" data-count={model.shownPanels.length} role="group" aria-label="Notes workflow panels" tabIndex={0}>
      <InboxPane model={model} /><NotesFolders notes={notes} /><NotesViews notes={notes} /><NotesContent model={notes.contentModel} />
    </div></BookDrag>
    {!model.visible.length && <div className="ab-all-hidden"><button onClick={() => model.setVisible([...panels])}>Show all panels</button></div>}
  </div>;
}
