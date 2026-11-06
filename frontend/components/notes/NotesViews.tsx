'use client';
import { ClosedItemsSwitch } from './ClosedItemsSwitch';
import { useRef, useState } from 'react';
import { useLens, useUpdateLensItems } from '@/hooks/useAirunoteLenses';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { CalendarPane } from '@/components/book/CalendarPane';
import { PaneGroup } from './PaneGroup';
import { addLensPane, freezeLens, removeLensPane, type LensPane } from './panes';
import { useNotesLens, type NotesLensModel } from './useNotesLens';
import { folderLabel } from '@/components/book/domain';
import { folderPath, viewLabel, type NotesModel } from './useNotesWorkspace';
import { PaneMenu } from './PaneMenu';
import { NotesIcon } from './NotesIcon';
import { NotesAgenda } from './NotesAgenda';
import { SpaceLinksList } from './SpaceLinksList';
import { FolderContents } from './FolderContents';
import { CollectionPane } from './CollectionPane';
import { NewCollectionDialog, FolderChoice } from './CollectionDialogs';
import { collectionLabels, type CollectionKind } from '@/lib/collections';

function SavedView({ notes, workspace, paneId }: { notes: NotesLensModel; workspace: NotesModel; paneId: string }) {
  const { model, selectedView } = notes;
  const detail = useLens(model.orgId, selectedView?.id);
  const update = useUpdateLensItems(model.orgId, selectedView?.id);
  if (detail.isPending) return <p role="status">Loading view…</p>;
  if (detail.error || !detail.data) return <div role="alert">{detail.error?.message ?? 'This view is unavailable.'}<button onClick={() => void detail.refetch()}>Retry</button></div>;
  const { lens, items: placements } = detail.data;
  const items = [
    ...notes.folders.map(folder => ({ id: folder.id, type: 'folder' as const, title: `${notes.linkedSpaces.has(folder.id) ? '↗ ' : ''}${folderLabel(folder.humanId)}` })),
    ...notes.viewModel.filtered.map(item => ({ id: item.id, type: 'document' as const, title: `${notes.linkedNotes.has(item.id) ? '↗ ' : ''}${item.name}` })),
  ];
  function open(id: string, type: 'document' | 'folder') {
    if (type === 'folder') notes.selectFolder(id);
    else { const item = model.items.find(item => item.id === id); if (item) model.open(item); }
  }
  if (lens.type === 'canvas') return <CanvasLens key={lens.id} orgId={model.orgId} lens={lens} items={items} lensItems={placements} onPersist={async items => { await update.mutateAsync({ items }); }} onOpenItem={open} />;
  if (lens.type === 'board') return <BoardLens key={lens.id} orgId={model.orgId} lens={lens} items={items} lensItems={placements} onPersist={async items => { await update.mutateAsync({ items }); }} onOpenItem={open} />;
  if (lens.type === 'study') return <StudyLensRenderer key={lens.id} folderId={notes.folderId} documentIds={notes.viewModel.filtered.map(item => item.id)} folderIds={notes.folders.map(folder => folder.id)} onOpenDocument={id => open(id, 'document')} />;
  return <FolderContents workspace={workspace} notes={notes} paneId={paneId} mode="box" />;
}

function AddViewPane({ notes }: { notes: NotesModel }) {
  return <button data-menu-action disabled={notes.panes.lenses.length >= 4} aria-label="Add view pane" onClick={() => {
    if (!notes.allowDestinationChange()) return;
    const folderId = notes.panes.folders.find(pane => pane.id === notes.panes.activeFolder)?.folderId ?? notes.model.rootFolderId;
    notes.setPanes(previous => addLensPane(previous, crypto.randomUUID(), folderId, notes.defaultView(folderId)));
  }}>+ Pane</button>;
}

function LensBrowser({ workspace, pane, index }: { workspace: NotesModel; pane: LensPane; index: number }) {
  const notes = useNotesLens(workspace, pane);
  const section = useRef<HTMLElement>(null);
  const [newKind, setNewKind] = useState<CollectionKind | 'folder' | null>(null);
  function close() {
    if (!workspace.allowDestinationChange()) return;
    if (section.current?.querySelector('.ab-inline-rename')) { workspace.model.actions.setError('Save or cancel the inline edit before closing this pane.'); return; }
    workspace.setPanes(previous => removeLensPane(previous, pane.id));
  }
  if (pane.viewId.startsWith('collection:')) return <CollectionPane key={pane.viewId} notes={workspace} pane={pane} id={pane.viewId.slice(11)} closePane={close}/>;
  const { model, selectedView } = notes;
  const agenda = !notes.asList && notes.viewId === 'agenda';
  const calendar = !notes.asList && (notes.viewId === 'calendar' || selectedView?.type === 'book');
  return <section ref={section} data-destination-pane={pane.id} data-resource-active={workspace.panes.activeLens === pane.id} onFocusCapture={() => { if (workspace.panes.activeLens !== pane.id) workspace.setPanes(previous => ({ ...previous, activeLens: pane.id })); }} className="an-browser-pane an-view" aria-label={`Folder view ${index + 1}`} data-frozen={pane.frozen} data-scroll-scope={`lens:${pane.id}:${pane.folderId}:${pane.viewId}`}>
    <div className="an-folder-heading" data-planning={agenda || calendar} data-plan={agenda}>
      {agenda ? null : calendar ? <small className="an-eyebrow">Workspace</small> : <nav className="an-breadcrumb an-eyebrow" aria-label="Current Folder path"><button onClick={notes.root}>Workspace</button>{notes.path.filter(folder => folder.id !== model.rootFolderId && folder.id !== pane.folderId).map(folder => <span key={folder.id}> / <button onClick={() => notes.selectFolder(folder.id)}>{folderLabel(folder.humanId)}</button></span>)}</nav>}
      <header><h2 title={agenda ? undefined : folderLabel(model.folders.find(folder => folder.id === pane.folderId)?.humanId)}>{agenda ? 'Plan' : calendar ? 'Calendar' : folderLabel(model.folders.find(folder => folder.id === pane.folderId)?.humanId)}</h2>
        {agenda && <div className="an-plan-scope"><FolderChoice notes={workspace} value={notes.planningFolderId ?? ''} onChange={id => workspace.updateLens(pane.id, { planningFolderId: id || null })} all label="Scope" hideLabel/></div>}
        {!agenda && !calendar && <div className="an-folder-view-icons" role="group" aria-label="Folder presentation">{(['box', 'list', 'details', 'cards'] as const).map(view => <button key={view} aria-label={`${view[0]!.toUpperCase()}${view.slice(1)} view`} title={view[0]!.toUpperCase() + view.slice(1)} aria-pressed={pane.viewId === view} onClick={() => { if (workspace.allowDestinationChange()) workspace.updateLens(pane.id, { viewId: view, asList: false }); }}><NotesIcon name={view}/></button>)}</div>}
        <PaneMenu label={agenda ? 'Plan actions' : calendar ? 'Calendar actions' : 'Folder view actions'} active={!!pane.query || pane.closed || !!pane.descendants || !!pane.planningFolderId}>
          <small>New</small><button data-menu-action onClick={() => model.add(undefined, agenda || calendar ? notes.planningFolderId ?? model.rootFolderId : pane.folderId)}>Note</button>
          {!agenda && !calendar && <><button data-menu-action onClick={() => { if (workspace.allowDestinationChange()) setNewKind('folder'); }}>Folder</button>{(Object.keys(collectionLabels) as CollectionKind[]).map(kind => <button data-menu-action key={kind} onClick={() => { if (workspace.allowDestinationChange()) setNewKind(kind); }}>{collectionLabels[kind]}</button>)}<button data-menu-action onClick={() => workspace.links.open(pane.folderId)}>Add link…</button></>}
          <hr/><small>Filter & sort</small><input aria-label="Filter notes in this view" placeholder="Filter items…" value={pane.query} onChange={event => workspace.updateLens(pane.id, { query: event.target.value })}/><ClosedItemsSwitch checked={pane.closed} onChange={closed => workspace.updateLens(pane.id, { closed })}/>
          {!agenda && !calendar && <><label><input type="checkbox" checked={notes.descendants} onChange={event => workspace.updateLens(pane.id, { descendants: event.target.checked })}/> Include descendants</label><label>Sort<select aria-label="Sort folder contents" value={pane.sort ?? 'name'} onChange={event => workspace.updateLens(pane.id, { sort: event.target.value as LensPane['sort'] })}><option value="name">Name</option><option value="type">Type</option><option value="updated">Updated</option></select></label></>}
          <hr/><small>Workspace</small>{!agenda && !calendar && <><button data-menu-action onClick={() => workspace.openFolderDetails(pane.folderId)}>Properties</button><button data-menu-action onClick={() => workspace.setPanes(previous => ({ ...previous, defaults: { ...previous.defaults, [pane.folderId]: pane.viewId } }))}>Use as folder default</button><button data-menu-action onClick={() => notes.setCreatingView(true)}>Save a folder view…</button><button data-menu-action onClick={() => notes.setBrowse(value => !value)}>All saved views</button></>}
          <button data-menu-action aria-pressed={pane.frozen} onClick={() => { if (!workspace.allowDestinationChange()) return; workspace.setPanes(previous => pane.frozen ? { ...previous, lenses: previous.lenses.map(value => value.id === pane.id ? { ...value, frozen: false } : value) } : freezeLens(previous, pane.id)); }}>{pane.frozen ? 'Unfreeze' : 'Freeze'}</button>
          <AddViewPane notes={workspace}/><button data-menu-action onClick={() => model.setExpandedPanel(value => value === 'calendar' ? null : 'calendar')}>{model.expandedPanel === 'calendar' ? 'Restore pane' : 'Expand pane'}</button>
          {workspace.panes.lenses.length > 1 && <button data-menu-action onClick={close}>Close pane</button>}
        </PaneMenu>
      </header>{pane.frozen && <small className="an-frozen-label">Frozen</small>}
    </div>
    {calendar && <div className="an-planning-scope"><FolderChoice notes={workspace} value={notes.planningFolderId ?? ''} onChange={id => workspace.updateLens(pane.id, { planningFolderId: id || null })} all label="Scope"/></div>}
    {notes.browse && <div className="an-view-browser"><label>Views in all Folders<input autoFocus placeholder="Find a view or folder…" value={notes.viewQuery} onChange={event => notes.setViewQuery(event.target.value)} /></label><div className="an-view-results">{notes.viewResults.map(view => <button key={view.id} onClick={() => notes.openView(view)}><strong>{viewLabel(view, notes.availableViews)}</strong><span>{view.type === 'book' ? 'Calendar' : view.type} · {folderPath(model.folders, view.folderId).map(folder => folder.id === model.rootFolderId ? 'Root' : folderLabel(folder.humanId)).join(' / ')}</span></button>)}{!notes.viewResults.length && <p>No saved views found. Add one to any folder from its view menu.</p>}</div></div>}
    {!agenda && !calendar && <SpaceLinksList workspace={workspace} notes={notes}/>}
    {agenda ? <NotesAgenda model={notes.viewModel} /> : calendar ? <CalendarPane model={notes.viewModel} embedded presentation={pane.calendarDisplay ?? 'grid'} onPresentation={calendarDisplay => workspace.updateLens(pane.id, { calendarDisplay })} /> : <div className="ab-scroll an-view-content" data-scroll-key="plan" onClickCapture={event => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]'); const href = anchor?.getAttribute('href');
      const folder = model.folders.find(folder => href === `/orgs/${model.orgId}/airunote/folder/${folder.id}`);
      if (folder && !event.ctrlKey && !event.metaKey) { event.preventDefault(); event.stopPropagation(); notes.selectFolder(folder.id); }
    }}>{selectedView && !notes.asList ? <SavedView notes={notes} workspace={workspace} paneId={pane.id}/> : <FolderContents workspace={workspace} notes={notes} paneId={pane.id} mode={pane.viewId === 'cards' || pane.viewId === 'details' || pane.viewId === 'list' ? pane.viewId : 'box'}/>}</div>}
    {newKind && <NewCollectionDialog notes={workspace} kind={newKind} folderId={pane.folderId} close={() => setNewKind(null)} open={(id, home) => workspace.openCollection(pane.id, id, home, true)}/>}
    <CreateFolderLensModal allowedTypes={['box', 'board', 'book']} isOpen={notes.creatingView} onClose={() => notes.setCreatingView(false)} orgId={model.orgId} userId={model.userId} folderId={notes.folderId} onSuccess={lens => {
      if (!lens.folderId) return;
      const view = { id: lens.id, folderId: lens.folderId, name: lens.name, type: lens.type, isDefault: lens.isDefault };
      notes.upsertView(view); notes.openView(view);
    }} />
  </section>;
}

export function NotesViews({ notes }: { notes: NotesModel }) {
  return <div id="notes-destination-content" role="tabpanel" aria-label="Destination content" className="an-space-view-group" data-single={notes.panes.lenses.length === 1}><PaneGroup title="Folder views" panel="calendar" model={notes.model} count={notes.panes.lenses.length} layout={notes.panes.lensLayout} onLayout={value => notes.layout('lens', value)} compact={notes.workspace.preset === 'cards' && notes.panes.lenses.length === 1} actions={notes.panes.lenses.length > 1 ? <AddViewPane notes={notes} /> : null}>
    {notes.panes.lenses.map((pane, index) => <LensBrowser key={pane.id} workspace={notes} pane={pane} index={index}/>)}
  </PaneGroup></div>;
}
