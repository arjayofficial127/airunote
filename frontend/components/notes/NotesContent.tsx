'use client';
import { useEffect, useRef, useState } from 'react';
import { ItemActionsButton } from '@/components/book/ItemActionsContext';
import { ContextPane } from '@/components/book/ContextPane';
import { PaneHeading } from '@/components/book/PaneHeading';
import { folderLabel, planLabel } from '@/components/book/domain';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { NotesIcon } from './NotesIcon';
import { NotesWriting } from './NotesWriting';

export function NotesContent({ model, pinned, onPin, onClose }: { model: BookWorkspaceModel; pinned: boolean; onPin: () => void; onClose: () => void }) {
  const [editTarget, setEditTarget] = useState<'note' | 'folder' | 'planning' | null>(null);
  const editorContainer = useRef<HTMLDivElement>(null);
  const id = model.selected?.id;
  const document = useAirunoteStore(state => id ? state.documentContentById.get(id) : undefined);
  const { load, error } = useBookContent();
  useEffect(() => { setEditTarget(null); if (id) void load(id); }, [id, load]);
  useEffect(() => {
    if (!editTarget) return;
    const selector = editTarget === 'folder' ? '#ab-context-folder' : editTarget === 'planning' ? '[aria-label="Calendar bucket"]' : '#ab-context-name';
    editorContainer.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [editTarget, document?.id]);
  const item = model.selected;
  function details(target: 'note' | 'folder' | 'planning') {
    if (model.dirty) { model.actions.setError('Save or discard your note draft before changing details.'); return; }
    setEditTarget(target);
  }
  if (editTarget || model.creating) return <div ref={editorContainer} className="an-content-editor" hidden={!model.shownPanels.includes('context')}>
    {!model.creating && <button className="an-back-reading" onClick={() => { if (model.dirty) { model.actions.setError('Save or discard your draft before reading.'); return; } setEditTarget(null); }}>← Read note</button>}
    <ContextPane model={model} onClose={onClose} />
  </div>;
  return <section className="ab-pane ab-context" hidden={!model.shownPanels.includes('context')} aria-label="Note"><PaneHeading panel="context" title="Note" model={model}><button className="ab-link" aria-pressed={pinned} onClick={onPin}>{pinned ? 'Unpin' : 'Pin'}</button><button aria-label="Close note" onClick={onClose}>×</button></PaneHeading>
    <div className="ab-scroll an-reading" data-scroll-key="note">{!id ? <div className="an-content-empty"><NotesIcon name="note" width="36" height="36" /><h3>Choose a note to start.</h3><p>Select a note in Inbox, Spaces or a view. Its text and next steps appear here.</p><button className="ab-link" onClick={() => model.add()}>Write a new note</button></div> : !document ? <div role={error ? 'alert' : 'status'}>{error ?? 'Opening note…'}{error && <button onClick={() => void load(id, true)}>Retry</button>}</div> : <>
      <div className="an-reading-folder"><NotesIcon name="folder" />{folderLabel(model.folders.find(folder => folder.id === document.folderId)?.humanId)}</div><h1>{document.name}</h1>
      {item && <p className="an-note-meta"><span className="an-note-kind">{item.planning.kind}</span><span>·</span><span>{item.planning.plan.kind === 'unplanned' ? 'Not scheduled' : planLabel(item.planning.plan, model.planningConfig)}</span>{item.planning.status !== 'open' && <span>· {item.planning.status}</span>}</p>}
      <div className="an-note-actions">{item && <ItemActionsButton item={item} disabled={model.actions.busy || model.dirty} />}<button className="ab-link" onClick={() => details('folder')}><NotesIcon name="folder" />Move to Space</button><button className="ab-link" onClick={() => details('planning')}><NotesIcon name="calendar" />Schedule</button></div>
      <NotesWriting key={id} model={model} document={document} />
      {item && <>
        {item.planning.checklist.length > 0 && <section className="an-reading-steps"><h2>Next steps <small>{item.planning.checklist.filter(step => step.done).length}/{item.planning.checklist.length}</small></h2>{item.planning.checklist.map(step => <label key={step.id} data-done={step.done}><input type="checkbox" checked={step.done} disabled={model.actions.busy || model.dirty || item.invalidPlanning} onChange={event => {
          const done = event.target.checked;
          void model.actions.update(item, { planning: { ...model.actions.fields(item), checklist: item.planning.checklist.map(check => check.id === step.id ? { ...check, done } : check) } });
        }} /><span>{step.text}</span></label>)}</section>}
        {item.planning.notes.length > 0 && <section className="an-reading-notes"><h2>Notes</h2>{item.planning.notes.map(note => <p key={note.id}>{note.text}</p>)}</section>}
        <details className="an-note-details"><summary>Planning & details</summary><p>{item.planning.plan.kind === 'unplanned' ? 'Not scheduled' : planLabel(item.planning.plan, model.planningConfig)} · {item.planning.status}</p><button onClick={() => details('planning')}>Edit planning and context</button></details>
      </>}
    </>}</div>
    {id && document && <footer className="an-reading-footer"><small>Updated {new Date(document.updatedAt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' })}</small></footer>}
  </section>;
}
