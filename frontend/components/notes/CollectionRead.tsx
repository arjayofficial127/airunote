'use client';
import MarkdownIt from 'markdown-it';
import { useDocumentContent } from '@/components/airunote/hooks/useDocumentContent';
import { NotesRichText } from './NotesRichText';
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
/** Reading a reference uses the original content cache. Editing stays in the shared protected editor. */
export function CollectionRead({ id }: { id: string }) {
  const { document, error } = useDocumentContent(id);
  if (!document) return <p role={error ? 'alert' : 'status'}>{error?.message ?? 'Loading original…'}</p>;
  const content = document.content ?? document.canonicalContent ?? '';
  return <article className="an-prose an-reference-preview">{document.type === 'RTF' ? <NotesRichText content={content} editable={false} onChange={() => undefined} onSource={() => undefined}/> : document.type === 'MD' ? <div dangerouslySetInnerHTML={{ __html: markdown.render(content) }}/> : <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>}</article>;
}
