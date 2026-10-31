'use client';
import { useState } from 'react';
import MarkdownIt from 'markdown-it';
import type { AiruDocument } from '@/components/airunote/types';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { useNoteWriting } from './useNoteWriting';
import { NotesRichText } from './NotesRichText';
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
export function NotesWriting({ model, document }: { model: BookWorkspaceModel; document: AiruDocument }) {
  const writing = useNoteWriting(model, document); const [source, setSource] = useState(false);
  const readOnly = model.selected?.invalidPlanning;
  function begin() { if (!readOnly && writing.ready) writing.setEditing(true); }
  return <section className="an-writing">
    <div className="an-writing-tools"><small role="status">{writing.saving ? 'Saving…' : writing.paused ? 'Not saved. Your draft is here.' : writing.dirty ? 'Unsaved changes' : 'Saved'}</small>
      <button className="ab-link" disabled={readOnly || !writing.ready} onClick={() => writing.setEditing(value => !value)}>{writing.editing ? 'Preview' : 'Write'}</button>
      {writing.undo && <button className="ab-link" disabled={writing.dirty || writing.saving || model.actions.busy} onClick={writing.undo}>Undo last save</button>}
    </div>
    {writing.paused && <div className="an-draft-recovery" role="alert"><p>The saved note may have changed, or the connection failed. Your draft has been kept.</p><button disabled={model.actions.busy} onClick={() => void writing.save()}>Retry save</button><button disabled={model.actions.busy} onClick={() => void writing.saveCopy()}>{document.type === 'RTF' ? 'Save HTML source as new note' : 'Save as new note'}</button></div>}
    <article className="an-prose" onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); begin(); } }} onClick={event => { if (!(event.target instanceof Element) || event.target.closest('a,button,input,textarea,[contenteditable=true]')) return; begin(); }} tabIndex={writing.editing || readOnly ? undefined : 0} aria-label={writing.editing ? undefined : 'Note body. Press Enter to write'}>
      {writing.editing && (document.type !== 'RTF' || source) ? <textarea aria-label={source ? 'Note HTML source' : 'Note text'} autoFocus className="an-inline-text" rows={Math.min(24, Math.max(8, writing.content.split('\n').length + 2))} value={writing.content} maxLength={1000000} onChange={event => writing.change(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); void writing.save(); } }} placeholder="Start writing…" /> : document.type === 'RTF' ? <NotesRichText content={writing.content} editable={writing.editing && !readOnly} onChange={writing.change} onSource={() => setSource(true)} /> : document.type === 'MD' ? <div dangerouslySetInnerHTML={{ __html: markdown.render(writing.content) }} /> : <p style={{ whiteSpace: 'pre-wrap' }}>{writing.content}</p>}
      {!writing.content && !writing.editing && <button className="ab-link" disabled={readOnly} onClick={begin}>Start writing…</button>}
    </article>
    {(writing.dirty || writing.saving) && <div className="an-writing-tools"><button disabled={model.actions.busy} onClick={() => void writing.save()}>Save now</button><button disabled={model.actions.busy} onClick={writing.discard}>Discard draft</button></div>}
  </section>;
}
