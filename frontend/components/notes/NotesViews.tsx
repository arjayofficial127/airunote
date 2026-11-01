'use client';
import { ClosedItemsSwitch } from './ClosedItemsSwitch';
import { useRef, useState } from 'react';
import { useLens, useUpdateLensItems } from '@/hooks/useAirunoteLenses';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { BookItemRow } from '@/components/book/BookItemRow';
import { CalendarPane } from '@/components/book/CalendarPane';
import { PaneGroup } from './PaneGroup';
import { addLensPane, freezeLens, unfreezeLens, removeLensPane, type LensPane } from './panes';
import { useNotesLens, type NotesLensModel } from './useNotesLens';
import { folderLabel } from '@/components/book/domain';
import { folderPath, viewLabel, viewOptionLabel, type NotesModel } from './useNotesWorkspace';
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
  return <button disabled={notes.panes.lenses.length >= 4} aria-label="Add view pane" onClick={() => {
    const folderId = notes.panes.folders.find(pane => pane.id === notes.panes.activeFolder)?.folderId ?? notes.model.rootFolderId;
    notes.setPanes(previous => addLensPane(previous, crypto.randomUUID(), folderId, notes.defaultView(folderId)));
  }}>+ Pane</button>;
}

function LensBrowser({ workspace, pane, index }: { workspace: NotesModel; pane: LensPane; index: number }) {
  const notes = useNotesLens(workspace, pane);
  const section = useRef<HTMLElement>(null);
  const [newKind, setNewKind] = useState<CollectionKind | 'folder' | null>(null);
  function close() {
    if (section.current?.querySelector('.ab-inline-rename')) { workspace.model.actions.setError('Save or cancel the inline edit before closing this pane.'); return; }
    workspace.setPanes(previous => removeLensPane(previous, pane.id));
  }
  if (pane.viewId.startsWith('collection:')) return <CollectionPane key={pane.viewId} notes={workspace} pane={pane} id={pane.viewId.slice(11)} closePane={close}/>;
  const { model, selectedView } = notes;
  const agenda = !notes.asList && notes.viewId === 'agenda';
  const calendar = !notes.asList && (notes.viewId === 'calendar' || selectedView?.type === 'book');
  return <section ref={section} className="an-browser-pane an-view" aria-label={`Folder view ${index + 1}`} data-frozen={pane.frozen} data-scroll-scope={`lens:${pane.id}:${pane.folderId}:${pane.viewId}`}>
    <header><strong className="an-space-title">{folderLabel(model.folders.find(folder => folder.id === pane.folderId)?.humanId)}</strong><small className="an-lens-status">{pane.frozen ? 'Frozen' : 'Following'}</small>
      <button aria-pressed={pane.frozen} title={pane.frozen ? 'Follow the selected folder again' : 'Keep this view on its folder; data stays live'} onClick={() => {
        if (!pane.frozen) { workspace.setPanes(previous => freezeLens(previous, pane.id)); return; }
        if (model.dirty || workspace.folderDirty || section.current?.querySelector('.ab-inline-rename')) { model.actions.setError('Save or discard your edits before unfreezing this view.'); return; }
        const folderId = workspace.panes.folders.find(value => value.id === workspace.panes.activeFolder)?.folderId ?? model.rootFolderId;
        workspace.setPanes(previous => unfreezeLens(previous, pane.id, folderId, workspace.defaultView(folderId)));
      }}>{pane.frozen ? 'Unfreeze' : 'Freeze'}</button>
      {workspace.panes.lenses.length > 1 && <button aria-label={`Close view ${index + 1}`} onClick={close}>×</button>}
      {workspace.panes.lenses.length === 1 && <AddViewPane notes={workspace} />}
      {workspace.panes.lenses.length === 1 && <button aria-label="Expand Folder view" onClick={() => model.setExpandedPanel(value => value === 'calendar' ? null : 'calendar')}>{model.expandedPanel === 'calendar' ? '↙' : '↗'}</button>}
    </header>
    {index === 0 && workspace.panes.lenses.every(value => value.frozen) && <small className="an-frozen-hint" role="status">All views are frozen. Unfreeze a view or add a pane to follow Folders.</small>}
    <nav className="an-breadcrumb" aria-label="Current Folder path"><button onClick={notes.root}>Workspace</button>{notes.path.filter(folder => folder.id !== model.rootFolderId).map(folder => <span key={folder.id}> / <button onClick={() => notes.selectFolder(folder.id)}>{folderLabel(folder.humanId)}</button></span>)}</nav>
    <div className="an-view-controls"><label className="an-view-choice"><span className="sr-only">Change view</span><select aria-label="Folder view" value={notes.viewId} onChange={event => { notes.setViewId(event.target.value); notes.setAsList(false); }}><option value="box">Box</option><option value="list">List</option><option value="details">Details</option><option value="cards">Cards</option><option value="agenda">Plan</option><option value="calendar">Calendar</option>{notes.availableViews.filter(view => view.folderId === notes.folderId).map(view => <option key={view.id} value={view.id}>{viewOptionLabel(view, notes.availableViews)}</option>)}</select></label>
      <details className="ab-popover"><summary>+ New</summary><div><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); model.add(undefined, pane.folderId); }}>Note</button><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setNewKind('folder'); }}>Folder</button>{(Object.keys(collectionLabels) as CollectionKind[]).map(kind => <button key={kind} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setNewKind(kind); }}>{collectionLabels[kind]}</button>)}</div></details>
      <details className="ab-popover"><summary aria-label="Folder view actions">⋯</summary><div><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); workspace.openFolderDetails(pane.folderId); }}>Folder settings</button><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); workspace.links.open(pane.folderId); }}>Add link…</button><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); notes.setCreatingView(true); }}>Save a folder view…</button><button onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); notes.setBrowse(value => !value); }}>All saved views</button><button disabled={workspace.panes.defaults[pane.folderId] === pane.viewId} onClick={() => workspace.setPanes(previous => ({ ...previous, defaults: { ...previous.defaults, [pane.folderId]: pane.viewId } }))}>Use as folder default</button></div></details>
    </div>
    {(agenda || calendar) && <div className="an-planning-scope"><FolderChoice notes={workspace} value={notes.planningFolderId ?? ''} onChange={id => workspace.updateLens(pane.id, { planningFolderId: id || null })} all label="Planning scope"/></div>}
    <details className="an-lens-options"><summary>Filter</summary><input aria-label="Filter notes in this view" placeholder="Filter items…" value={pane.query} onChange={event => workspace.updateLens(pane.id, { query: event.target.value })}/><ClosedItemsSwitch checked={pane.closed} onChange={closed => workspace.updateLens(pane.id, { closed })}/>{!agenda && !calendar && <label><input type="checkbox" checked={notes.descendants} onChange={event => workspace.updateLens(pane.id, { descendants: event.target.checked })}/> Include descendants</label>}</details>
    {notes.browse && <div className="an-view-browser"><label>Views in all Folders<input autoFocus placeholder="Find a view or folder…" value={notes.viewQuery} onChange={event => notes.setViewQuery(event.target.value)} /></label><div className="an-view-results">{notes.viewResults.map(view => <button key={view.id} onClick={() => notes.openView(view)}><strong>{viewLabel(view, notes.availableViews)}</strong><span>{view.type === 'book' ? 'Calendar' : view.type} · {folderPath(model.folders, view.folderId).map(folder => folder.id === model.rootFolderId ? 'Root' : folderLabel(folder.humanId)).join(' / ')}</span></button>)}{!notes.viewResults.length && <p>No saved views found. Add one to any folder from its view menu.</p>}</div></div>}
    <SpaceLinksList workspace={workspace} notes={notes}/>
    {(agenda || calendar) && <div className="an-scope-summary"><small>{agenda ? "Your day, at your pace" : selectedView?.name ?? (calendar ? "Calendar" : "All notes")}</small><button className="ab-link" onClick={() => { notes.setViewId(agenda ? "list" : "agenda"); notes.setAsList(false); }}>{agenda ? "See all notes" : "Back to today"}</button></div>}
    {agenda ? <NotesAgenda model={notes.viewModel} /> : calendar ? <CalendarPane model={notes.viewModel} embedded onShowAll={() => notes.setAsList(true)} /> : <div className="ab-scroll an-view-content" data-scroll-key="plan" onClickCapture={event => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]'); const href = anchor?.getAttribute('href');
      const folder = model.folders.find(folder => href === `/orgs/${model.orgId}/airunote/folder/${folder.id}`);
      if (folder && !event.ctrlKey && !event.metaKey) { event.preventDefault(); event.stopPropagation(); notes.selectFolder(folder.id); }
    }}>{selectedView && !notes.asList ? <SavedView notes={notes} workspace={workspace} paneId={pane.id}/> : <FolderContents workspace={workspace} notes={notes} paneId={pane.id} mode={pane.viewId === 'cards' || pane.viewId === 'details' || pane.viewId === 'list' ? pane.viewId : 'box'}/>}</div>}
    {newKind && <NewCollectionDialog notes={workspace} kind={newKind} folderId={pane.folderId} close={() => setNewKind(null)} open={(id, home) => workspace.openCollection(pane.id, id, home)}/>}
    <CreateFolderLensModal allowedTypes={['box', 'board', 'book']} isOpen={notes.creatingView} onClose={() => notes.setCreatingView(false)} orgId={model.orgId} userId={model.userId} folderId={notes.folderId} onSuccess={lens => {
      if (!lens.folderId) return;
      const view = { id: lens.id, folderId: lens.folderId, name: lens.name, type: lens.type, isDefault: lens.isDefault };
      notes.upsertView(view); notes.openView(view);
    }} />
  </section>;
}

export function NotesViews({ notes }: { notes: NotesModel }) {
  return <div className="an-space-view-group" data-single={notes.panes.lenses.length === 1}><PaneGroup title="Folder views" panel="calendar" model={notes.model} count={notes.panes.lenses.length} layout={notes.panes.lensLayout} onLayout={value => notes.layout('lens', value)} compact={notes.workspace.preset === 'cards' && notes.panes.lenses.length === 1} actions={notes.panes.lenses.length > 1 ? <AddViewPane notes={notes} /> : null}>
    {notes.panes.lenses.map((pane, index) => <LensBrowser key={pane.id} workspace={notes} pane={pane} index={index}/>)}
  </PaneGroup></div>;
}
