'use client';
import { useEffect, useId, useRef } from 'react';
import { ItemActionsContext } from '@/components/book/ItemActionsContext';
import { NotesLifecycleDialog } from './NotesLifecycleDialog';
import { BookDrag } from '@/components/book/BookDrag';
import { useNotesFolderMove } from './useNotesFolderMove';
import { NotesInbox } from './NotesInbox';
import { useNotesPopovers } from './useNotesPopovers';
import { useNotesScroll } from './useNotesScroll';
import { panels, type Panel } from '@/components/book/domain';
import { AddFolderPaneButton, NotesFolders } from './NotesFolders';
import { NotesViews } from './NotesViews';
import { NotesContext } from './NotesContext';
import { SpaceLinkPicker } from './SpaceLinkPicker';
import { useNotesWorkspace } from './useNotesWorkspace';
import { NotesToolbar } from './NotesToolbar';
import { useWorkspaceSizing } from './useWorkspaceSizing';
import { PaneResize } from './PaneResize';
import '@/components/book/book.css';
import './notes.css';
import './workspace.css';
import './spaces.css';
import './collections.css';
import './navigator.css';
import './destinations.css';
import './calendar.css';
import './refinements.css';
import './editorTabs.css';
import { DestinationTabs, WorkspaceLibrary } from './WorkspaceDestinations';

export function NotesWorkspace({ rootFolderId, orgId, userId }: { rootFolderId: string; orgId: string; userId: string }) {
  const notes = useNotesWorkspace(rootFolderId, orgId, userId);
  const { model, workspace } = notes;
  const moveFolder = useNotesFolderMove(model);
  const container = useRef<HTMLDivElement>(null); useNotesPopovers(container);
  const panes = useRef<HTMLDivElement>(null); const tabId = useId();
  const lastContextReveal = useRef(model.contextReveal);
  const focused = workspace.preset === 'cards';
  const contextVisible = model.visible.includes('context');
  const expanded = model.expandedPanel && (focused && (model.expandedPanel === 'inbox' || model.expandedPanel === 'organizer')
    ? model.visible.some(panel => panel === 'inbox' || panel === 'organizer') : model.visible.includes(model.expandedPanel)) ? model.expandedPanel : null;
  const visible: Panel[] = focused
    ? expanded ? [expanded === 'inbox' ? 'organizer' : expanded]
      : [...(model.visible.some(panel => panel === 'inbox' || panel === 'organizer') ? ['organizer' as const] : []), ...model.visible.filter(panel => panel === 'calendar' || panel === 'context')]
    : model.shownPanels;
  const sizing = useWorkspaceSizing(notes, panes, visible);
  // Keep the same mounted editors across presets and tabs to preserve drafts.
  const rendered = { ...notes, model: { ...model, shownPanels: panels }, contentModel: { ...notes.contentModel, shownPanels: panels } };
  const scopeKey = notes.panes.folders.map(pane => pane.id).join(',') + ':' + notes.panes.lenses.map(pane => pane.id + ':' + pane.folderId + ':' + pane.viewId).join(',') + ':' + (model.selected?.id ?? 'none');
  const rememberScroll = useNotesScroll(panes, notes.preferenceKey, notes.ready, scopeKey);
  function reveal(panel: Panel) {
    if (focused && (panel === 'organizer' || panel === 'inbox')) notes.setWorkspace(previous => ({ ...previous, navigation: panel === 'inbox' ? 'inbox' : 'folders' }));
    const targets = focused && (panel === 'inbox' || panel === 'organizer') ? ['inbox', 'organizer'] : [panel];
    model.setVisible(previous => panels.filter(value => previous.includes(value) || targets.includes(value)));
    requestAnimationFrame(() => {
      const target = panes.current?.querySelector<HTMLElement>('[data-workspace-pane="' + (focused && panel === 'inbox' ? 'organizer' : panel) + '"]');
      if (panes.current && target) panes.current.scrollTo({ left: panes.current.scrollLeft + target.getBoundingClientRect().left - panes.current.getBoundingClientRect().left, behavior: 'smooth' });
    });
  }
  useEffect(() => {
    const requested = lastContextReveal.current !== model.contextReveal;
    lastContextReveal.current = model.contextReveal;
    if (contextVisible && (model.selected || model.creating || requested)) reveal('context');
    // Reveal for explicit context changes, not while resizing or writing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.selected?.id, model.creating, model.contextReveal, notes.folderContextId, model.expandedPanel, sizing.compact]);
  useEffect(() => {
    if (notes.spaceReveal) reveal('calendar');
    // A Space click leads to its view without replacing saved widths.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.spaceReveal]);
  useEffect(() => {
    const target = panes.current?.querySelector<HTMLElement>(`[data-destination-pane="${notes.panes.activeLens}"]`);
    const grid = target?.parentElement;
    if (target && grid) grid.scrollTo({ left: grid.scrollLeft + target.getBoundingClientRect().left - grid.getBoundingClientRect().left, top: grid.scrollTop + target.getBoundingClientRect().top - grid.getBoundingClientRect().top, behavior: 'smooth' });
  }, [notes.panes.activeLens, notes.spaceReveal]);
  function handle(panel: Panel, label: string) {
    return !expanded && visible.includes(panel) && (workspace.sizing === 'stable' || visible.length > 1) && <PaneResize label={label} width={sizing.widths[panel]} min={sizing.minimum[panel]} onResize={width => sizing.resize(panel, width)} />;
  }
  const inboxShown = focused ? workspace.navigation === 'inbox' : visible.includes('inbox');
  const foldersShown = focused ? workspace.navigation === 'folders' : visible.includes('organizer');
  return <div ref={container} className="airunote-book airunote-notes" data-theme={notes.theme} data-workspace={workspace.preset} role="region" aria-label="Notes workspace">
    <NotesToolbar notes={notes} />
    {model.query.trim() && <div className="an-search-status" role="region" aria-label="Active note search"><span>Filtering notes: <strong title={model.query}>{model.query}</strong></span><button onClick={() => model.setQuery('')}>Clear search</button></div>}
    {model.actions.error && <p role="alert" className="ab-error">{model.actions.error}<button onClick={() => model.actions.setError(null)}>Dismiss</button></p>}
    {model.actions.notice && <p role="status" className="ab-notice">{model.actions.notice}</p>}
    {model.configError && <p role="alert" className="ab-error">Existing planning settings could not be read. They have been preserved.</p>}
    <nav className="an-pane-shortcuts" aria-label="Jump to pane">{(['organizer', 'inbox', 'calendar', 'context'] as const).map((panel, index) => <button key={panel} disabled={panel === 'context' && !contextVisible} onClick={() => { model.setExpandedPanel(null); reveal(panel); }}>{['Folders', 'Inbox', 'View', 'Note / Properties'][index]}</button>)}</nav>
    <ItemActionsContext.Provider value={item => notes.lifecycle.choose({ kind: 'note', item })}>
      <BookDrag model={model} onMoveFolder={moveFolder}>
        <div ref={panes} className="ab-panes an-workspace-panes" style={sizing.style} onScrollCapture={rememberScroll} role="group" aria-label="Notes workflow panels" tabIndex={0}>
          <div className="an-navigation" data-workspace-pane={focused ? 'organizer' : undefined} hidden={focused && !visible.includes('organizer')}>
            <div className="an-navigation-header" data-navigation={workspace.navigation} hidden={!focused}>
              <div className="an-navigation-tabs" role="tablist" aria-label="Navigation tabs">
                {(['folders', 'inbox'] as const).map(tab => <button key={tab} id={tabId + '-' + tab} role="tab" aria-selected={workspace.navigation === tab} aria-controls={tabId + '-' + tab + '-panel'}
                  onClick={() => notes.setWorkspace(previous => ({ ...previous, navigation: tab }))}
                  onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = tab === 'folders' ? 'inbox' : 'folders'; notes.setWorkspace(previous => ({ ...previous, navigation: next })); document.getElementById(tabId + '-' + next)?.focus(); } }}>{tab === 'folders' ? 'Folders' : 'Inbox'}</button>)}
              </div>
              <AddFolderPaneButton notes={notes} />
            </div>
            <div className="an-layout-slot an-inbox-slot" id={tabId + '-inbox-panel'} role={focused ? 'tabpanel' : undefined} aria-labelledby={focused ? tabId + '-inbox' : undefined} data-workspace-pane={!focused ? 'inbox' : undefined} hidden={!inboxShown}>
              <NotesInbox model={rendered.model} />{!focused && handle('inbox', 'Inbox')}
            </div>
            <div className="an-layout-slot an-folders-slot" id={tabId + '-folders-panel'} role={focused ? 'tabpanel' : undefined} aria-labelledby={focused ? tabId + '-folders' : undefined} data-workspace-pane={!focused ? 'organizer' : undefined} hidden={!foldersShown}>
              <NotesFolders notes={rendered} /><WorkspaceLibrary notes={rendered}/>{!focused && handle('organizer', 'Folders')}
            </div>
            {focused && handle('organizer', 'navigation')}
          </div>
          <div className="an-layout-slot an-views-slot" data-workspace-pane="calendar" hidden={!visible.includes('calendar')}>
            <div className="an-view-empty" hidden={!focused || workspace.folderChosen}><h2>Choose a folder</h2><p>Its view will appear here.</p><button onClick={() => reveal('organizer')}>Browse Folders</button><button onClick={() => model.add()}>Write a new note</button></div>
            <div className="an-view-mounted" hidden={focused && !workspace.folderChosen}><DestinationTabs notes={rendered}/>{notes.panes.destinationsClosed ? <div className="an-view-empty"><h2>Choose a destination</h2><p>Open a folder, Calendar, Plan or a collection.</p></div> : <NotesViews notes={rendered} />}</div>
            {handle('calendar', 'view')}
          </div>
          <div className="an-layout-slot an-context-slot" data-workspace-pane="context" hidden={!visible.includes('context')}>
            <NotesContext notes={rendered} />{handle('context', 'editor')}
          </div>
        </div>
      </BookDrag>
    </ItemActionsContext.Provider>
    <NotesLifecycleDialog notes={notes} /><SpaceLinkPicker notes={notes} />
    {!visible.length && <div className="ab-all-hidden"><button onClick={notes.showAllPanels}>Show all panels</button></div>}
  </div>;
}
