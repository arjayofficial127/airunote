'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBookWorkspace } from './useBookWorkspace';
import { WorkspaceTools } from './WorkspaceTools';
import { InboxPane } from './InboxPane';
import { OrganizerPane } from './OrganizerPane';
import { CalendarPane } from './CalendarPane';
import { ContextPane } from './ContextPane';
import { BookDrag } from './BookDrag';
import { folderLabel } from './domain';
import { WorkspaceFocusButton } from '@/components/layout/WorkspaceFocus';
import './book.css';

export function BookWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const model = useBookWorkspace(rootFolderId, orgId, userId);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const panes = useRef<HTMLDivElement>(null);
  const previousScroll = useRef(0);
  useEffect(() => {
    const workspace = panes.current;
    if (!workspace) return;
    workspace.scrollTo({ left: model.expandedPanel ? 0 : previousScroll.current });
  }, [model.expandedPanel]);
  useEffect(() => {
    if (!model.selected?.id && !model.creating) return;
    const workspace = panes.current;
    const context = workspace?.querySelector<HTMLElement>('.ab-context:not([hidden])');
    if (!workspace || !context) return;
    const viewport = workspace.getBoundingClientRect();
    const panel = context.getBoundingClientRect();
    if (panel.left < viewport.left || panel.right > viewport.right) {
      workspace.scrollTo({ left: workspace.scrollLeft + panel.left - viewport.left, behavior: 'smooth' });
    }
  }, [model.selected?.id, model.creating, model.contextReveal]);
  if (model.loading) return <p role="status" className="p-6">Loading your Book…</p>;
  if (model.error) return <div role="alert" className="p-6">{model.error.message}<button onClick={() => window.location.reload()}>Reload workspace</button></div>;
  if (!model.root || model.root.orgId !== orgId || model.root.ownerUserId !== userId) return <p role="alert" className="p-6">This folder is unavailable in your active workspace.</p>;
  const name = folderLabel(model.root.humanId);
  const folderHref = model.root.humanId === '__user_root__' ? `/orgs/${orgId}/airunote` : `/orgs/${orgId}/airunote/folder/${rootFolderId}`;
  return <div className="airunote-book" data-theme={theme} role="region" aria-label="Book workspace">
    <div className="ab-heading"><div className="ab-heading-title"><Link href={folderHref} aria-label={`Back to ${name} folders`}>←</Link><div><h1>{name}<span className="ab-workspace-badge">Book</span></h1><small>Capture, organize, plan, and keep context together.</small></div></div><div className="ab-heading-actions"><WorkspaceFocusButton /><button aria-label={`Switch Book to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Charcoal' : 'Light'}</button><button className="ab-primary" onClick={() => model.add()}>+ New entry</button></div></div>
    <WorkspaceTools model={model} />
    {model.configError && <p role="alert" className="ab-error">This Book uses an unsupported settings format. Saved settings were preserved.</p>}
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    <BookDrag model={model}><div ref={panes} className="ab-panes" data-count={model.shownPanels.length} tabIndex={0} role="group" aria-label="Book workflow panels" onScroll={event => { if (!model.expandedPanel) previousScroll.current = event.currentTarget.scrollLeft; }}><InboxPane model={model} /><OrganizerPane model={model} /><CalendarPane model={model} /><ContextPane model={model} /></div></BookDrag>
    {model.visible.length === 0 && <div className="ab-all-hidden"><p>Your panels are hidden.</p><button onClick={() => model.setVisible(['inbox', 'organizer', 'calendar', 'context'])}>Show all panels</button></div>}
  </div>;
}
