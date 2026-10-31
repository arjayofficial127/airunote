/** Writing surface for TXT/MD. Saves remain explicit and failed drafts stay local. */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';
import { useRouter } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { AttributeEditor } from './AttributeEditor';
import { DocumentMoreMenu } from './DocumentMoreMenu';
import { UnsavedDocumentDialog } from './UnsavedDocumentDialog';
import type { AiruDocument } from '../types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });

interface DocumentEditorProps {
  document: AiruDocument;
  onSave: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onUpdateAttributes?: (attributes: Record<string, unknown>) => Promise<void>;
  isSaving?: boolean;
}

export function DocumentEditor({ document: note, onSave, onDelete, onRename, onUpdateAttributes, isSaving = false }: DocumentEditorProps) {
  const [content, setContent] = useState(note.content);
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState(note.name);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAttributes, setShowAttributes] = useState(false);
  const [hasUnsavedAttributes, setHasUnsavedAttributes] = useState(false);
  const [localAttributes, setLocalAttributes] = useState<Record<string, unknown>>(note.attributes || {});
  const [preview, setPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const discardNavigation = useRef(false);
  const router = useRouter();
  const originalContentRef = useRef(note.content);
  const currentContentRef = useRef(note.content);
  const originalAttributesRef = useRef<Record<string, unknown>>(note.attributes || {});
  const currentIdRef = useRef(note.id);
  const folder = useAirunoteStore(state => state.foldersById.get(note.folderId));
  const previewHtml = useMemo(() => preview ? markdown.render(content) : '', [content, preview]);

  useEffect(() => {
    if (currentIdRef.current !== note.id) {
      currentIdRef.current = note.id;
      currentContentRef.current = note.content;
      originalContentRef.current = note.content;
      setContent(note.content);
      setLocalAttributes(note.attributes || {});
      originalAttributesRef.current = note.attributes || {};
      setHasUnsavedChanges(false);
      setHasUnsavedAttributes(false);
      setSaveError(null);
      setPreview(false);
    } else if (note.content !== originalContentRef.current) {
      // A completed save may arrive while the user is already typing the next edit.
      if (currentContentRef.current === originalContentRef.current) {
        currentContentRef.current = note.content;
        setContent(note.content);
      }
      originalContentRef.current = note.content;
      setHasUnsavedChanges(currentContentRef.current !== note.content);
    }
  }, [note.id, note.content, note.attributes]);

  useEffect(() => { setDocumentName(note.name); }, [note.name]);
  useEffect(() => {
    if (hasUnsavedAttributes) return;
    originalAttributesRef.current = note.attributes || {};
    setLocalAttributes(note.attributes || {});
  }, [note.attributes, hasUnsavedAttributes]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    const savedContent = currentContentRef.current;
    setSaveError(null);
    try {
      await onSave(savedContent);
      originalContentRef.current = savedContent;
      setHasUnsavedChanges(currentContentRef.current !== savedContent);
    } catch {
      setSaveError('Could not save. Your draft is still here. Try Save again.');
    }
  }, [hasUnsavedChanges, isSaving, onSave]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); void handleSave();
      }
    };
    window.addEventListener('keydown', saveShortcut);
    return () => window.removeEventListener('keydown', saveShortcut);
  }, [handleSave]);
  useEffect(() => {
    if (!hasUnsavedChanges && !hasUnsavedAttributes && documentName === note.name) return;
    const retain = (event: BeforeUnloadEvent) => { if (!discardNavigation.current) { event.preventDefault(); event.returnValue = ''; } };
    const retainOnNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault(); event.stopPropagation(); setPendingNavigation(destination.href);
    };
    window.addEventListener('beforeunload', retain);
    document.addEventListener('click', retainOnNavigation, true);
    return () => { window.removeEventListener('beforeunload', retain); document.removeEventListener('click', retainOnNavigation, true); };
  }, [hasUnsavedChanges, hasUnsavedAttributes, documentName, note.name]);

  const handleNameSave = async () => {
    if (!documentName.trim()) { setDocumentName(note.name); setIsEditingName(false); return; }
    try {
      if (documentName.trim() !== note.name) await onRename(documentName.trim());
      setIsEditingName(false);
    } catch { setSaveError('Could not rename this document. Your title is still here.'); }
  };
  const handleSaveAttributes = async () => {
    if (!onUpdateAttributes || !hasUnsavedAttributes) return;
    try {
      await onUpdateAttributes(localAttributes);
      originalAttributesRef.current = localAttributes;
      setHasUnsavedAttributes(false);
      setSaveError(null);
    } catch { setSaveError('Could not save attributes. Your changes are still here.'); }
  };

  return <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
    {pendingNavigation && <UnsavedDocumentDialog onKeep={() => setPendingNavigation(null)} onLeave={() => {
      discardNavigation.current = true;
      const destination = new URL(pendingNavigation);
      setPendingNavigation(null);
      if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      else window.location.assign(destination.href);
    }} />}
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          {isEditingName ? <input aria-label="Document title" type="text" value={documentName}
            onChange={event => setDocumentName(event.target.value)} onBlur={() => void handleNameSave()}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDocumentName(note.name); setIsEditingName(false); } }}
            className="w-full rounded-lg border border-blue-400 px-2 py-1 text-2xl font-semibold text-slate-900 outline-blue-600" autoFocus />
            : <h1 className="text-2xl font-semibold tracking-tight text-slate-900"><button type="button" onClick={() => setIsEditingName(true)} title="Rename document" className="max-w-full break-words rounded text-left hover:text-blue-700 focus-visible:outline-blue-600">{note.name}</button></h1>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{note.type === 'MD' ? 'Markdown' : 'Plain text'}</span><span aria-hidden="true">·</span>
            <span role="status" className={hasUnsavedChanges || hasUnsavedAttributes ? 'font-medium text-amber-700' : 'text-emerald-700'}>{isSaving ? 'Saving…' : hasUnsavedChanges || hasUnsavedAttributes ? 'Unsaved changes' : 'Saved'}</span>
            <span className="hidden sm:inline">Updated {new Date(note.updatedAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowAttributes(value => !value)} aria-expanded={showAttributes} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">{showAttributes ? 'Hide attributes' : 'Attributes'}</button>
          <DocumentMoreMenu onDelete={onDelete} />
          <button type="button" onClick={() => void handleSave()} disabled={!hasUnsavedChanges || isSaving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400">{isSaving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {note.type === 'MD' && <div className="mt-4 flex items-center justify-between gap-3">
        <div role="group" aria-label="Document view" className="inline-flex rounded-lg bg-slate-100 p-1">
          {['Write', 'Preview'].map(label => <button type="button" key={label} aria-pressed={preview === (label === 'Preview')} onClick={() => setPreview(label === 'Preview')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${preview === (label === 'Preview') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{label}</button>)}
        </div><span className="text-xs text-slate-400">{content.trim() ? content.trim().split(/\s+/).length : 0} words <span className="hidden sm:inline">· Ctrl / ⌘ S to save</span></span>
      </div>}
    </header>
    {saveError && <p role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">{saveError}</p>}
    {showAttributes && <section aria-label="Document attributes" className="max-h-72 overflow-auto border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">Document attributes</h2>
        {hasUnsavedAttributes && onUpdateAttributes && <button type="button" onClick={() => void handleSaveAttributes()} disabled={isSaving} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white">Save attributes</button>}
      </div><fieldset disabled={isSaving}><AttributeEditor attributes={localAttributes} folder={folder ?? null} onChange={attributes => { setLocalAttributes(attributes); setHasUnsavedAttributes(JSON.stringify(attributes) !== JSON.stringify(originalAttributesRef.current)); }} /></fieldset>
    </section>}
    <div className="relative mx-auto flex min-h-[360px] w-full max-w-[1080px] flex-1 flex-col border-x border-slate-100 bg-white">
      {!content && !preview && <p className="pointer-events-none absolute left-16 top-5 z-10 text-sm text-slate-400">Start writing{note.type === 'MD' ? ', or use Markdown headings and lists' : ''}…</p>}
      {preview ? <article aria-label="Markdown preview" className="document-markdown-preview flex-1 overflow-auto px-6 py-8 sm:px-12" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Your preview will appear here as you write.</p>' }} />
        : <MonacoEditor height="100%" language={note.type === 'MD' ? 'markdown' : 'plaintext'} value={content}
          onChange={value => { const next = value ?? ''; currentContentRef.current = next; setContent(next); setHasUnsavedChanges(next !== originalContentRef.current); }} theme="vs-light"
          options={{ minimap: { enabled: false }, fontSize: 15, lineHeight: 26, padding: { top: 20, bottom: 24 }, wordWrap: 'on', lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, overviewRulerLanes: 0, renderLineHighlight: 'none' }} />}
    </div>
    <style jsx global>{`
      .document-markdown-preview { color: #334155; font-size: 16px; line-height: 1.85; overflow-wrap: anywhere; }
      .document-markdown-preview h1 { font-size: 30px; font-weight: 650; color: #0f172a; margin: 0 0 20px; }
      .document-markdown-preview h2 { font-size: 23px; font-weight: 600; margin: 28px 0 12px; }
      .document-markdown-preview h3 { font-size: 19px; font-weight: 600; margin: 24px 0 10px; }
      .document-markdown-preview p { margin: 0 0 16px; }
      .document-markdown-preview ul { list-style: disc; padding-left: 24px; margin-bottom: 18px; }
      .document-markdown-preview ol { list-style: decimal; padding-left: 24px; margin-bottom: 18px; }
      .document-markdown-preview a { color: #2563eb; text-decoration: underline; }
      .document-markdown-preview pre { overflow: auto; background: #f1f5f9; padding: 16px; border-radius: 10px; }
      .document-markdown-preview code { background: #f1f5f9; border-radius: 4px; padding: 2px 4px; font-size: .9em; }
      .document-markdown-preview blockquote { border-left: 3px solid #bfdbfe; padding-left: 16px; color: #64748b; }
      .document-markdown-preview img { max-width: 100%; height: auto; }
    `}</style>
  </div>;
}
