'use client';
import { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { ContextPane } from '@/components/book/ContextPane';
import { PaneHeading } from '@/components/book/PaneHeading';
import { folderLabel, planLabel } from '@/components/book/domain';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
function RichPreview({ content }: { content: string }) {
  const editor = useEditor({ extensions: [StarterKit, Image, Link.configure({ openOnClick: true })], content, editable: false, immediatelyRender: false });
  return <EditorContent editor={editor} />;
}

export function NotesContent({ model }: { model: BookWorkspaceModel }) {
  const [editing, setEditing] = useState(false);
  const id = model.selected?.id;
  const document = useAirunoteStore(state => id ? state.documentContentById.get(id) : undefined);
  const { load, error } = useBookContent();
  useEffect(() => { setEditing(false); if (id) void load(id); }, [id, load]);
  if (editing || model.creating) return <div className="an-content-editor" hidden={!model.shownPanels.includes('context')}>
    {!model.creating && <button className="an-back-reading" onClick={() => { if (model.dirty) { model.actions.setError('Save or discard your draft before reading.'); return; } setEditing(false); }}>← Read note</button>}
    <ContextPane model={model} />
  </div>;
  return <section className="ab-pane ab-context" hidden={!model.shownPanels.includes('context')} aria-label="04 Content"><PaneHeading panel="context" title="Content" model={model}>{id && <><button onClick={() => setEditing(true)}>Edit</button><button aria-label="Close note" onClick={() => model.setSelectedId(null)}>×</button></>}</PaneHeading>
    <div className="ab-scroll an-reading">{!id ? <div className="an-content-empty"><span aria-hidden="true">▤</span><h3>Room for your thoughts.</h3><p>Choose a note from any column.</p><button className="ab-link" onClick={() => model.add()}>Write a note</button></div> : !document ? <div role={error ? 'alert' : 'status'}>{error ?? 'Opening note…'}{error && <button onClick={() => void load(id, true)}>Retry</button>}</div> : <>
      <small>{folderLabel(model.folders.find(folder => folder.id === document.folderId)?.humanId)}</small><h1>{document.name}</h1>
      <p className="an-note-meta">{model.selected?.planning.status} · Updated {new Date(document.updatedAt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short' })}</p>
      <article className="an-prose">{document.type === 'RTF' ? <RichPreview key={`${id}:${document.updatedAt}`} content={document.canonicalContent ?? document.content} /> : document.type === 'MD' ? <div dangerouslySetInnerHTML={{ __html: markdown.render(document.canonicalContent ?? document.content) }} /> : <p style={{ whiteSpace: 'pre-wrap' }}>{document.canonicalContent ?? document.content}</p>}{!document.content && <p className="ab-empty">Add a thought, image, or link with Edit.</p>}</article>
      {model.selected && <details className="an-note-details"><summary>Planning & details</summary><p>{planLabel(model.selected.planning.plan, model.planningConfig)}</p>{model.selected.planning.checklist.map(item => <p key={item.id}>{item.done ? '✓' : '□'} {item.text}</p>)}<button onClick={() => setEditing(true)}>Edit planning and context</button></details>}
    </>}</div>
  </section>;
}
