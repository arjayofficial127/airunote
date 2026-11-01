'use client';
import { useEffect, useId } from 'react';
import type { NotesModel } from './useNotesWorkspace';
import { NotesContent } from './NotesContent';
import { NotesFolderDetails } from './NotesFolderDetails';

export function NotesContext({ notes }: { notes: NotesModel }) {
  const id = useId();
  const noteOpen = !!notes.model.selected || notes.model.creating;
  const folder = notes.model.folders.find(value => value.id === notes.folderContextId);
  useEffect(() => {
    if (notes.folderContextId && !folder && !notes.folderDirty) notes.closeFolderDetails();
  });
  const tab = folder && (notes.contextTab === 'folder' || !noteOpen) ? 'folder' : 'note';
  return <section className="an-context-workspace" aria-label="Note and Folder details">
    <header className="an-context-tabs">
      <div role="tablist" aria-label="Context tabs">
        {noteOpen && <span><button role="tab" id={id + '-note'} aria-controls={id + '-note-panel'} aria-selected={tab === 'note'} onClick={() => notes.setContextTab('note')}>Note</button><button aria-label="Close Note tab" onClick={notes.closeNote}>×</button></span>}
        {folder && <span><button role="tab" id={id + '-folder'} aria-controls={id + '-folder-panel'} aria-selected={tab === 'folder'} onClick={() => notes.setContextTab('folder')}>Details</button><button aria-label="Close Details tab" onClick={notes.closeFolderDetails}>×</button></span>}
      </div>
      <div className="an-context-tools">{notes.workspace.preset === 'cards' && <button aria-pressed={notes.model.visible.includes('calendar')} onClick={() => notes.togglePanel('calendar')}>{notes.model.visible.includes('calendar') ? 'Hide view' : 'Show view'}</button>}
        <button aria-pressed={notes.pinned} onClick={() => notes.setPinned(value => !value)}>{notes.pinned ? 'Unpin' : 'Pin'}</button>
        <button aria-label="Expand context panel" onClick={() => notes.model.setExpandedPanel(value => value === 'context' ? null : 'context')}>{notes.model.expandedPanel === 'context' ? '↙' : '↗'}</button></div>
    </header>
    <div className="an-context-body" role="tabpanel" id={id + '-note-panel'} aria-labelledby={id + '-note'} hidden={tab !== 'note' || !noteOpen}>
      <NotesContent model={notes.contentModel} pinned={notes.pinned} onPin={() => notes.setPinned(value => !value)} onClose={notes.closeNote} />
    </div>
    {!noteOpen && !folder && <div className="an-view-empty"><h2>Choose a note</h2><p>Open a note or Folder details to work here.</p><button onClick={() => notes.model.add()}>Create a note</button></div>}
    <div className="an-context-body" role="tabpanel" id={id + '-folder-panel'} aria-labelledby={id + '-folder'} hidden={tab !== 'folder'}>
      {folder && <NotesFolderDetails key={folder.id} notes={notes} folder={folder} />}
    </div>
  </section>;
}
