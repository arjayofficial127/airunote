'use client';
import { useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { NotesRichText } from './NotesRichText';
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
export function KindBody({ value, onChange, type = 'MD', disabled, onChecklist, label = 'Content' }: { value: string; onChange: (value: string) => void; type?: 'MD' | 'TXT' | 'RTF'; disabled: boolean; onChecklist: () => void; label?: string }) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false), [source, setSource] = useState(false);
  function format(prefix: string, suffix = '') {
    const input = field.current; if (!input || disabled) return;
    const start = input.selectionStart, end = input.selectionEnd;
    onChange(value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end));
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + prefix.length, end + prefix.length); });
  }
  return <section className="an-kind-body" aria-label={label}>
    <div className="an-kind-body-toolbar" role="group" aria-label="Writing controls">
      {type === 'MD' && !preview && <><button type="button" aria-label="Bold text" disabled={disabled} onClick={() => format('**', '**')}><strong>B</strong></button><button type="button" aria-label="Heading" disabled={disabled} onClick={() => format('\n## ')}>H2</button><button type="button" aria-label="Bullet list" disabled={disabled} onClick={() => format('\n- ')}>List</button></>}
      <button type="button" disabled={disabled} onClick={onChecklist}>Checklist</button>
      <button type="button" aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Write' : 'Preview'}</button>
      {type === 'RTF' && <button type="button" aria-pressed={source} onClick={() => setSource(value => !value)}>{source ? 'Rich text' : 'HTML source'}</button>}
    </div>
    {type === 'RTF' && !source ? <NotesRichText content={value} editable={!preview && !disabled} onChange={onChange} onSource={() => setSource(true)}/> : preview ? <article className="an-prose" aria-label="Content preview">{type === 'MD' ? <div dangerouslySetInnerHTML={{ __html: markdown.render(value) }}/> : <p style={{ whiteSpace: 'pre-wrap' }}>{value}</p>}</article> : <textarea ref={field} aria-label={type === 'RTF' ? 'HTML source' : 'Item content'} value={value} disabled={disabled} maxLength={1000000} rows={Math.min(22, Math.max(5, value.split('\n').length + 2))} placeholder="Start writing…" onChange={event => onChange(event.target.value)}/>}
  </section>;
}
export function KindPreview({ content, type }: { content: string; type: string }) {
  return <article className="an-prose">{type === 'MD' ? <div dangerouslySetInnerHTML={{ __html: markdown.render(content) }}/> : type === 'RTF' ? <NotesRichText content={content}/> : <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>}</article>;
}
