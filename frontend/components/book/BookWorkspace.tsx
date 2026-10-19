'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useBookWorkspace } from './useBookWorkspace';
import { WorkspaceTools } from './WorkspaceTools';
import { InboxPane } from './InboxPane';
import { OrganizerPane } from './OrganizerPane';
import { CalendarPane } from './CalendarPane';
import { ContextPane } from './ContextPane';
import { BookDrag } from './BookDrag';
import './book.css';

export function BookWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const model = useBookWorkspace(rootFolderId, orgId, userId);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  if (model.loading) return <p role="status" className="p-6">Loading your Book…</p>;
  if (model.error) return <div role="alert" className="p-6">{model.error.message}<button onClick={() => window.location.reload()}>Reload workspace</button></div>;
  if (!model.root || model.root.orgId !== orgId || model.root.ownerUserId !== userId) return <p role="alert" className="p-6">This folder is unavailable in your active workspace.</p>;
  return <div className="airunote-book" data-theme={theme} role="region" aria-label="Book workspace">
    <div className="ab-heading"><div><Link href={`/orgs/${orgId}/airunote/folder/${rootFolderId}`}>← {model.root.humanId}</Link><h1>{model.root.humanId} <small>Book</small></h1></div><div><small>Owner planning · Your existing Airunote content</small><button onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Charcoal' : 'Light'}</button></div></div>
    <div className="ab-view-rail"><Link href={`/orgs/${orgId}/airunote/folder/${rootFolderId}`}>Folders and lenses</Link><span aria-current="page">Book</span><button onClick={() => model.add()}>+ New</button></div>
    <WorkspaceTools model={model} />
    {model.configError && <p role="alert" className="ab-error">This Book uses an unsupported settings format. Saved settings were preserved.</p>}
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    <BookDrag model={model}><div className="ab-panes" data-count={model.visible.length} style={{ gridTemplateColumns: model.visible.map(panel => panel === 'inbox' ? 'minmax(200px,.7fr)' : panel === 'calendar' ? 'minmax(330px,1.5fr)' : 'minmax(270px,1fr)').join(' ') }}><InboxPane model={model} /><OrganizerPane model={model} /><CalendarPane model={model} /><ContextPane model={model} /></div></BookDrag>
    {model.visible.length === 0 && <div className="ab-all-hidden"><p>Your panels are hidden.</p><button onClick={() => model.setVisible(['inbox', 'organizer', 'calendar', 'context'])}>Show all panels</button></div>}
  </div>;
}
