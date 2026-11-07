'use client';
import { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { useBookServices } from '@/components/book/BookServicesContext';
import { errorMessage } from '@/components/book/services';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { AiruDocument } from '@/components/airunote/types';
import type { DocumentRelease } from '@/lib/book';
import type { KindEditorModel } from './useKindEditor';
import { KindPreview } from './KindBody';
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function printKindDocument(name: string, content: string, type: string) {
  const page = window.open('', '_blank');
  if (!page) return false;
  const html = type === 'MD' ? markdown.render(content) : `<pre>${escape(type === 'RTF' ? new DOMParser().parseFromString(content, 'text/html').body.textContent ?? '' : content)}</pre>`;
  page.opener = null;
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(name)}</title><style>body{font:16px/1.65 system-ui,sans-serif;color:#172b45;max-width:780px;margin:40px auto;padding:0 20px}h1{font-size:30px}img,table{max-width:100%}pre{white-space:pre-wrap}a{color:inherit}@page{margin:20mm}@media print{body{margin:0;padding:0}}</style></head><body><h1>${escape(name)}</h1>${html}</body></html>`);
  page.document.close(); page.focus(); page.print(); return true;
}
export function KindDocumentActions({ editor, model, document, capabilities, disabled }: { editor: KindEditorModel; model: BookWorkspaceModel; document: AiruDocument; capabilities: boolean; disabled: boolean }) {
  const services = useBookServices();
  const [digest, setDigest] = useState(''), [share, setShare] = useState(false), [version, setVersion] = useState<DocumentRelease & { content: string } | null>(null), [loading, setLoading] = useState(false), [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const releases = editor.details?.releases ?? [], latest = releases.at(-1);
  const { state } = editor;
  useEffect(() => {
    let active = true;
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([state.name.trim(), document.type, state.content]))).then(buffer => { if (active) setDigest([...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join('')); });
    return () => { active = false; };
  }, [state.name, state.content, document.type]);
  useEffect(() => { if (share || version) dialog.current?.showModal(); else dialog.current?.close(); }, [share, version]);
  async function ready() { if (!disabled && await editor.save() && model.selected) await model.actions.readyDocument(model.selected, editor.expected.current); }
  async function openVersion(id: string) {
    setLoading(true); setMessage('');
    try { setVersion(await services.version(model.orgId, document.id, model.rootFolderId, id)); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { setLoading(false); }
  }
  function download() {
    const text = document.type === 'RTF' ? new DOMParser().parseFromString(state.content, 'text/html').body.textContent ?? '' : state.content;
    const link = window.document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    link.href = url; link.download = `${state.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 180)}.${document.type === 'MD' ? 'md' : 'txt'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Copy downloaded.');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(state.name + '\n\n' + (document.type === 'RTF' ? new DOMParser().parseFromString(state.content, 'text/html').body.textContent ?? '' : state.content)); setMessage('Copied.'); }
    catch { setMessage('Clipboard unavailable. Download a copy instead.'); }
  }
  function close() { setShare(false); setVersion(null); setMessage(''); }
  return <section className="an-kind-document-actions" aria-label="Document workflow">
    <div className="an-kind-release-bar"><span><strong>Version</strong> · {latest && digest === latest.sha256 ? `Ready · v${latest.number}` : latest ? `Working draft · last ready v${latest.number}` : 'Private draft'}</span><div><button type="button" disabled={disabled || editor.dirty} onClick={() => { if (!printKindDocument(state.name, state.content, document.type)) setMessage('Allow the print window to export a PDF.'); }}>Print / PDF</button><button type="button" disabled={disabled || editor.dirty} onClick={() => { setShare(true); setMessage(''); }}>Share a copy…</button>{capabilities && <button type="button" className="ab-primary" disabled={disabled || editor.dirty || latest?.sha256 === digest} onClick={() => void ready()}>Mark ready</button>}</div></div>
    {releases.length > 0 && <details className="an-kind-details"><summary>Version history · {releases.length}</summary>{[...releases].reverse().map(release => <button key={release.id} type="button" disabled={loading} onClick={() => void openVersion(release.id)}>v{release.number} · {release.name} <small>{new Date(release.createdAt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })}</small></button>)}</details>}
    {message && !share && <p role="status">{message}</p>}
    <dialog ref={dialog} className="an-kind-dialog" aria-label={share ? 'Share a document copy' : 'Ready document version'} onCancel={close}><header><h2>{share ? 'Share a copy' : `Ready version ${version?.number}`}</h2><button type="button" aria-label="Close document dialog" onClick={close}>×</button></header>
      {share ? <><p>Your original stays {document.visibility === 'private' ? 'private' : document.visibility === 'org' ? 'shared with your organisation' : 'public'}. You choose where to send the exported copy.</p><div className="an-kind-dialog-actions"><button type="button" onClick={() => void copy()}>Copy text</button><button type="button" onClick={download}>{document.type === 'MD' ? 'Download Markdown' : 'Download text'}</button><button type="button" onClick={() => printKindDocument(state.name, state.content, document.type)}>Print / PDF</button></div>{message && <p role="status">{message}</p>}</> : version && <><h3>{version.name}</h3><KindPreview content={version.content} type={version.type}/><button type="button" disabled={disabled || editor.dirty || version.type !== document.type} onClick={() => { editor.change({ name: version.name, content: version.content }); close(); }}>Use as working draft</button><small>Ready versions stay unchanged. Further edits create a working draft.</small></>}
    </dialog>
  </section>;
}
