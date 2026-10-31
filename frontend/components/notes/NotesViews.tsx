'use client';
import { useLens, useUpdateLensItems } from '@/hooks/useAirunoteLenses';
import { CanvasLens } from '@/components/airunote/lenses/CanvasLens';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { BookItemRow } from '@/components/book/BookItemRow';
import { CalendarPane } from '@/components/book/CalendarPane';
import { PaneHeading } from '@/components/book/PaneHeading';
import { folderLabel } from '@/components/book/domain';
import { folderPath, viewLabel, type NotesModel } from './useNotesWorkspace';

function SavedView({ notes }: { notes: NotesModel }) {
  const { model, selectedView } = notes;
  const detail = useLens(model.orgId, selectedView?.id);
  const update = useUpdateLensItems(model.orgId, selectedView?.id);
  if (detail.isPending) return <p role="status">Loading view…</p>;
  if (detail.error || !detail.data) return <div role="alert">{detail.error?.message ?? 'This view is unavailable.'}<button onClick={() => void detail.refetch()}>Retry</button></div>;
  const { lens, items: placements } = detail.data;
  const items = [
    ...model.folders.filter(folder => folder.parentFolderId === notes.folderId && folder.id !== notes.folderId).map(folder => ({ id: folder.id, type: 'folder' as const, title: folderLabel(folder.humanId) })),
    ...notes.viewModel.filtered.map(item => ({ id: item.id, type: 'document' as const, title: item.name })),
  ];
  function open(id: string, type: 'document' | 'folder') {
    if (type === 'folder') notes.selectFolder(id);
    else { const item = model.items.find(item => item.id === id); if (item) model.open(item); }
  }
  if (lens.type === 'canvas') return <CanvasLens key={lens.id} orgId={model.orgId} lens={lens} items={items} lensItems={placements} onPersist={async items => { await update.mutateAsync({ items }); }} onOpenItem={open} />;
  if (lens.type === 'board') return <BoardLens key={lens.id} orgId={model.orgId} lens={lens} items={items} lensItems={placements} onPersist={async items => { await update.mutateAsync({ items }); }} onOpenItem={open} />;
  if (lens.type === 'study') return <StudyLensRenderer key={lens.id} folderId={notes.folderId} onOpenDocument={id => open(id, 'document')} />;
  return <NotesList notes={notes} />;
}

function NotesList({ notes }: { notes: NotesModel }) {
  const { model, viewModel } = notes;
  const folders = model.folders.filter(folder => folder.parentFolderId === notes.folderId && folder.id !== notes.folderId);
  return <div className="an-note-list">
    {folders.map(folder => <button key={folder.id} className="an-list-folder" onClick={() => notes.selectFolder(folder.id)}>▱ {folderLabel(folder.humanId)} <span>›</span></button>)}
    {viewModel.filtered.map(item => <BookItemRow key={item.id} item={item} model={model} />)}
    {!viewModel.filtered.length && <p className="ab-empty">{model.query ? 'No notes match your search.' : 'No notes here yet. Capture a thought in Inbox.'}</p>}
  </div>;
}

export function NotesViews({ notes }: { notes: NotesModel }) {
  const { model, selectedView } = notes;
  const calendar = !notes.asList && (notes.viewId === 'calendar' || selectedView?.type === 'book');
  return <section className="ab-pane an-view" hidden={!model.shownPanels.includes('calendar')} aria-label="03 View">
    <PaneHeading panel="calendar" title="View" model={model}><button aria-expanded={notes.browse} onClick={() => notes.setBrowse(value => !value)}>Browse views</button></PaneHeading>
    <nav className="an-breadcrumb" aria-label="Current view folder"><button onClick={notes.root}>All folders</button>{notes.path.filter(folder => folder.id !== model.rootFolderId).map(folder => <span key={folder.id}> / <button onClick={() => notes.selectFolder(folder.id)}>{folderLabel(folder.humanId)}</button></span>)}</nav>
    <div className="an-view-controls"><select aria-label="Folder view" value={notes.viewId} onChange={event => { notes.setViewId(event.target.value); notes.setAsList(false); }}><option value="calendar">Calendar</option><option value="list">List</option>{notes.availableViews.filter(view => view.folderId === notes.folderId).map(view => <option key={view.id} value={view.id}>{viewLabel(view, notes.availableViews)} · {view.type === 'book' ? 'Calendar' : view.type}</option>)}</select>
      {selectedView && <button aria-pressed={notes.asList} onClick={() => notes.setAsList(value => !value)}>{notes.asList ? 'Return to view' : 'Show as list'}</button>}<button onClick={() => notes.setCreatingView(true)}>+ View</button>
    </div>
    {notes.browse && <div className="an-view-browser"><label>Views in all folders<input autoFocus placeholder="Find a view or folder…" value={notes.viewQuery} onChange={event => notes.setViewQuery(event.target.value)} /></label><div className="an-view-results">{notes.viewResults.map(view => <button key={view.id} onClick={() => notes.openView(view)}><strong>{viewLabel(view, notes.availableViews)}</strong><span>{view.type === 'book' ? 'Calendar' : view.type} · {folderPath(model.folders, view.folderId).map(folder => folder.id === model.rootFolderId ? 'Root' : folderLabel(folder.humanId)).join(' / ')}</span></button>)}{!notes.viewResults.length && <p>No saved views found. Add one to any folder with + View.</p>}</div></div>}
    <small className="an-scope-caption">{selectedView && selectedView.type !== 'book' ? 'This folder' : 'This folder and its subfolders'} · {notes.viewModel.filtered.length} notes{calendar ? ' · Singapore time' : ''}</small>
    {calendar ? <CalendarPane model={notes.viewModel} embedded /> : <div className="ab-scroll an-view-content" onClickCapture={event => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]'); const href = anchor?.getAttribute('href');
      const folder = model.folders.find(folder => href === `/orgs/${model.orgId}/airunote/folder/${folder.id}`);
      if (folder && !event.ctrlKey && !event.metaKey) { event.preventDefault(); event.stopPropagation(); notes.selectFolder(folder.id); }
    }}>{selectedView && !notes.asList ? <SavedView notes={notes} /> : <NotesList notes={notes} />}</div>}
    <CreateFolderLensModal isOpen={notes.creatingView} onClose={() => notes.setCreatingView(false)} orgId={model.orgId} userId={model.userId} folderId={notes.folderId} onSuccess={lens => {
      if (!lens.folderId) return;
      const view = { id: lens.id, folderId: lens.folderId, name: lens.name, type: lens.type, isDefault: lens.isDefault };
      notes.upsertView(view); notes.openView(view);
    }} />
  </section>;
}
