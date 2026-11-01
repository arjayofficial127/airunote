'use client';
import { useEffect, useId } from 'react';
import type { NotesModel } from './useNotesWorkspace';
import { NotesContent } from './NotesContent';
import { NotesFolderDetails } from './NotesFolderDetails';

export function NotesContext({ notes }: { notes: NotesModel }) {
  const id = useId();
  const noteOpen = !!notes.model.selected || notes.model.creating || notes.pinned;
  const folder = notes.model.folders.find(value => value.id === notes.folderContextId);
  useEffect(() => {
    if (notes.folderContextId && !folder && !notes.folderDirty) notes.closeFolderDetails();
  });
  const tab = notes.contextTab === 'folder' && folder ? 'folder' : 'note';
  return <section className="an-context-workspace" aria-label="Note and folder">
    <header className="an-context-tabs">
      <div role="tablist" aria-label="Context tabs">
        {noteOpen && <span><button role="tab" id={id + '-note'} aria-controls={id + '-note-panel'} aria-selected={tab === 'note'} onClick={() => notes.setContextTab('note')}>Note</button><button aria-label="Close Note tab" onClick={notes.closeNote}>×</button></span>}
        {folder && <span><button role="tab" id={id + '-folder'} aria-controls={id + '-folder-panel'} aria-selected={tab === 'folder'} onClick={() => notes.setContextTab('folder')}>Folder</button><button aria-label="Close Folder tab" onClick={notes.closeFolderDetails}>×</button></span>}
      </div>
      <div className="an-context-tools">{notes.workspace.preset === 'create' && <button aria-pressed={notes.viewOpen} onClick={() => notes.setViewOpen(value => !value)}>{notes.viewOpen ? 'Hide view' : 'Show view'}</button>}
        <button aria-pressed={notes.pinned} onClick={() => notes.setPinned(value => !value)}>{notes.pinned ? 'Unpin' : 'Pin'}</button>
        <button aria-label="Expand context panel" onClick={() => notes.model.setExpandedPanel(value => value === 'context' ? null : 'context')}>{notes.model.expandedPanel === 'context' ? '↙' : '↗'}</button></div>
    </header>
    <div className="an-context-body" role="tabpanel" id={id + '-note-panel'} aria-labelledby={id + '-note'} hidden={tab !== 'note'}>
      <NotesContent model={notes.contentModel} pinned={notes.pinned} onPin={() => notes.setPinned(value => !value)} onClose={notes.closeNote} />
    </div>
    <div className="an-context-body" role="tabpanel" id={id + '-folder-panel'} aria-labelledby={id + '-folder'} hidden={tab !== 'folder'}>
      {folder && <NotesFolderDetails key={folder.id} notes={notes} folder={folder} />}
    </div>
  </section>;
}
