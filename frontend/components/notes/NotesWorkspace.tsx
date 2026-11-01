'use client';
import { useEffect, useId, useRef } from 'react';
import { ItemActionsContext } from '@/components/book/ItemActionsContext';
import { NotesLifecycleDialog } from './NotesLifecycleDialog';
import { BookDrag } from '@/components/book/BookDrag';
import { useNotesFolderMove } from './useNotesFolderMove';
import { NotesInbox } from './NotesInbox';
import { useNotesScroll } from './useNotesScroll';
import { panels, type Panel } from '@/components/book/domain';
import { NotesFolders } from './NotesFolders';
import { NotesViews } from './NotesViews';
import { NotesContext } from './NotesContext';
import { useNotesWorkspace } from './useNotesWorkspace';
import { NotesToolbar } from './NotesToolbar';
import { useWorkspaceSizing } from './useWorkspaceSizing';
import { PaneResize } from './PaneResize';
import '@/components/book/book.css';
import './notes.css';
import './workspace.css';

export function NotesWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const notes = useNotesWorkspace(rootFolderId, orgId, userId);
  const { model, workspace } = notes;
  const moveFolder = useNotesFolderMove(model);
  const panes = useRef<HTMLDivElement>(null); const tabId = useId();
  const focused = workspace.preset !== 'panels';
  const contextVisible = model.visible.includes('context');
  const showView = workspace.preset !== 'create' || !contextVisible || notes.viewOpen;
  const expanded = focused ? model.expandedPanel : model.expandedPanel && model.visible.includes(model.expandedPanel) ? model.expandedPanel : null;
  const visible: Panel[] = focused
    ? expanded ? [expanded === 'inbox' ? 'organizer' : expanded]
      : ['organizer', ...(showView ? ['calendar' as const] : []), ...(contextVisible ? ['context' as const] : [])]
    : model.shownPanels;
  const sizing = useWorkspaceSizing(notes, panes, visible);
  // Keep the same mounted editors across presets and tabs to preserve drafts.
  const rendered = { ...notes, model: { ...model, shownPanels: panels }, contentModel: { ...notes.contentModel, shownPanels: panels } };
  const scopeKey = notes.panes.folders.map(pane => pane.id).join(',') + ':' + notes.panes.lenses.map(pane => pane.id + ':' + pane.folderId + ':' + pane.viewId).join(',') + ':' + (model.selected?.id ?? 'none');
  const rememberScroll = useNotesScroll(panes, notes.preferenceKey, notes.ready, scopeKey);
  function reveal(panel: Panel) {
    if (focused && (panel === 'organizer' || panel === 'inbox')) notes.setWorkspace(previous => ({ ...previous, navigation: panel === 'inbox' ? 'inbox' : 'folders' }));
    if (panel === 'calendar') notes.setViewOpen(true);
    requestAnimationFrame(() => {
      const target = panes.current?.querySelector<HTMLElement>('[data-workspace-pane="' + (focused && panel === 'inbox' ? 'organizer' : panel) + '"]');
      if (panes.current && target) panes.current.scrollTo({ left: panes.current.scrollLeft + target.getBoundingClientRect().left - panes.current.getBoundingClientRect().left, behavior: 'smooth' });
    });
  }
  useEffect(() => {
    if (model.selected || model.creating || notes.folderContextId) reveal('context');
    // Reveal for explicit context changes, not while resizing or writing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.selected?.id, model.creating, model.contextReveal, notes.folderContextId, model.expandedPanel, sizing.compact]);
  function handle(panel: Panel, label: string) {
    return visible.length > 1 && <PaneResize label={label} width={sizing.widths[panel]} min={sizing.minimum[panel]} onResize={width => sizing.resize(panel, width)} />;
  }
  const inboxShown = focused ? workspace.navigation === 'inbox' : visible.includes('inbox');
  const foldersShown = focused ? workspace.navigation === 'folders' : visible.includes('organizer');
  return <div className="airunote-book airunote-notes" data-theme={notes.theme} data-workspace={workspace.preset} role="region" aria-label="Notes workspace">
    <NotesToolbar notes={notes} />
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    {model.configError && <p role="alert" className="ab-error">Existing planning settings could not be read. They have been preserved.</p>}
    <nav className="an-pane-shortcuts" aria-label="Jump to pane">{(['organizer', 'inbox', 'calendar', 'context'] as const).map((panel, index) => <button key={panel} disabled={panel === 'context' && !contextVisible} onClick={() => { model.setExpandedPanel(null); reveal(panel); }}>{['Folders', 'Inbox', 'View', 'Note / Folder'][index]}</button>)}</nav>
    <ItemActionsContext.Provider value={item => notes.lifecycle.choose({ kind: 'note', item })}>
      <BookDrag model={model} onMoveFolder={moveFolder}>
        <div ref={panes} className="ab-panes an-workspace-panes" style={sizing.style} onScrollCapture={rememberScroll} role="group" aria-label="Notes workflow panels" tabIndex={0}>
          <div className="an-navigation" data-workspace-pane={focused ? 'organizer' : undefined} hidden={focused && !visible.includes('organizer')}>
            <div className="an-navigation-tabs" role="tablist" aria-label="Navigation tabs" hidden={!focused}>
              {(['folders', 'inbox'] as const).map(tab => <button key={tab} id={tabId + '-' + tab} role="tab" aria-selected={workspace.navigation === tab} aria-controls={tabId + '-' + tab + '-panel'}
                onClick={() => notes.setWorkspace(previous => ({ ...previous, navigation: tab }))}
                onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = tab === 'folders' ? 'inbox' : 'folders'; notes.setWorkspace(previous => ({ ...previous, navigation: next })); document.getElementById(tabId + '-' + next)?.focus(); } }}>{tab === 'folders' ? 'Folders' : 'Inbox'}</button>)}
            </div>
            <div className="an-layout-slot an-inbox-slot" id={tabId + '-inbox-panel'} role={focused ? 'tabpanel' : undefined} aria-labelledby={focused ? tabId + '-inbox' : undefined} data-workspace-pane={!focused ? 'inbox' : undefined} hidden={!inboxShown}>
              <NotesInbox model={rendered.model} />{!focused && handle('inbox', 'Inbox')}
            </div>
            <div className="an-layout-slot an-folders-slot" id={tabId + '-folders-panel'} role={focused ? 'tabpanel' : undefined} aria-labelledby={focused ? tabId + '-folders' : undefined} data-workspace-pane={!focused ? 'organizer' : undefined} hidden={!foldersShown}>
              <NotesFolders notes={rendered} />{!focused && handle('organizer', 'Folders')}
            </div>
            {focused && handle('organizer', 'navigation')}
          </div>
          <div className="an-layout-slot an-views-slot" data-workspace-pane="calendar" hidden={!visible.includes('calendar')}>
            <div className="an-view-empty" hidden={!focused || workspace.folderChosen}><h2>Choose a folder</h2><p>Its view will appear here.</p><button onClick={() => reveal('organizer')}>Browse folders</button><button onClick={() => model.add()}>Write a new note</button></div>
            <div className="an-view-mounted" hidden={focused && !workspace.folderChosen}><NotesViews notes={rendered} /></div>
            {handle('calendar', 'view')}
          </div>
          <div className="an-layout-slot an-context-slot" data-workspace-pane="context" hidden={!visible.includes('context')}>
            <NotesContext notes={rendered} />{handle('context', 'editor')}
          </div>
        </div>
      </BookDrag>
    </ItemActionsContext.Provider>
    <NotesLifecycleDialog notes={notes} />
    {!visible.length && <div className="ab-all-hidden"><button onClick={() => model.setVisible([...panels])}>Show all panels</button></div>}
  </div>;
}
