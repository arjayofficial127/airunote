'use client';
import { useEffect, useRef, useState } from 'react';
import { planningFieldsSchema } from '@/lib/book';
import type { PlanningFields } from '@/lib/book';
import { BookItemRow } from '@/components/book/BookItemRow';
import { DropZone } from '@/components/book/BookDrag';
import { PaneHeading } from '@/components/book/PaneHeading';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { InboxDecision } from './InboxDecision';

export function NotesInbox({ model }: { model: BookWorkspaceModel }) {
  const [draft, setDraft] = useState(''); const [kind, setKind] = useState<PlanningFields['kind']>('note');
  const [processed, setProcessed] = useState(false); const [review, setReview] = useState(false);
  const [paste, setPaste] = useState(false); const [preview, setPreview] = useState<string[] | null>(null);
  const [ready, setReady] = useState(false); const [activeId, setActiveId] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null); const saving = useRef(false); const restoreFocus = useRef(false);
  const storageKey = `airunote:capture:${model.orgId}:${model.userId}`;
  const { setDraftFlag } = model;
  const pending = model.filtered.filter(item => !item.planning.processed && item.planning.status === 'open');
  const items = (processed ? model.filtered : pending).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const shown = review ? items.slice(0, 1) : items;
  useEffect(() => {
    try { const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (saved && typeof saved === 'object' && 'text' in saved && typeof saved.text === 'string') {
        setDraft(saved.text); if ('paste' in saved) setPaste(saved.paste === true);
        const parsed = planningFieldsSchema.shape.kind.safeParse('kind' in saved ? saved.kind : null); if (parsed.success) setKind(parsed.data);
      }
    } catch { /* Capture still works when browser storage is unavailable. */ }
    setReady(true);
  }, [storageKey]);
  useEffect(() => { if (!ready) return; try { if (draft) sessionStorage.setItem(storageKey, JSON.stringify({ text: draft, kind, paste })); else sessionStorage.removeItem(storageKey); } catch { /* The live draft remains available. */ } }, [draft, kind, paste, ready, storageKey]);
  useEffect(() => { if (ready && !model.actions.busy && restoreFocus.current) { input.current?.focus(); restoreFocus.current = false; } }, [draft, ready, model.actions.busy]);
  useEffect(() => { setDraftFlag('inbox', !!draft.trim()); return () => setDraftFlag('inbox', false); }, [draft, setDraftFlag]);
  async function capture() {
    if (!draft.trim() || saving.current || model.actions.busy) return;
    saving.current = true; const text = draft.trim();
    try {
      const name = text.split('\n').find(line => line.trim())?.trim().slice(0, 255) ?? 'New note';
      const saved = await model.actions.capture(name, kind, undefined, model.rootFolderId, text);
      if (saved) { restoreFocus.current = true; setDraft(''); setProcessed(false); }
    } finally { saving.current = false; }
  }
  async function savePreview() {
    if (saving.current || model.actions.busy) return;
    saving.current = true; const remaining = [...(preview ?? [])];
    try {
      while (remaining.length) {
        const text = remaining[0]; if (!text) break;
        const saved = await model.actions.capture(text.slice(0, 255), kind, undefined, model.rootFolderId, text); if (!saved) break;
        remaining.shift(); setPreview([...remaining]); setDraft(remaining.join('\n'));
      }
      if (!remaining.length) { restoreFocus.current = true; setPreview(null); setPaste(false); setProcessed(false); }
    } finally { saving.current = false; }
  }
  return <section className="ab-pane ab-inbox" hidden={!model.shownPanels.includes('inbox')} aria-label="Inbox">
    <PaneHeading panel="inbox" title="Inbox" model={model} count={pending.length} />
    <div className="an-inbox-caption"><small>{review ? `${pending.length} left to decide` : 'To decide'}</small>{(pending.length > 0 || review) && <button className="ab-link" onClick={() => { setReview(value => !value); setProcessed(false); }}>{review ? 'Finish review' : 'Review'}</button>}</div>
    <DropZone id="an-inbox-drop" scrollKey="inbox" target={{ kind: 'inbox' }} className="ab-scroll ab-inbox-list">
      {shown.map((item, index) => <div className="an-inbox-card" key={item.id}>
        <BookItemRow item={item} model={model} />
        {!processed && <><button className="an-decide-toggle" aria-label={`Decide on ${item.name}`} aria-expanded={review || activeId === item.id || (!activeId && index === 0)} onClick={() => setActiveId(activeId === item.id ? 'none' : item.id)}>•••</button>
          {(review || activeId === item.id || (!activeId && index === 0)) && <InboxDecision item={item} model={model} />}</>}
      </div>)}
      {!items.length && <p className="ab-empty">{model.query ? 'No thoughts match your search.' : review ? 'All caught up. Your plan is ready.' : 'Nothing waiting. Capture a thought below.'}</p>}
      {items.length > 0 && !processed && <p className="an-inbox-hint">Drag to a day, or choose Today.</p>}
    </DropZone>
    <footer className="an-composer-footer"><button className="ab-link" onClick={() => { setProcessed(value => !value); setReview(false); }}>{processed ? 'Back to Inbox' : 'Show processed'}</button>
      {preview && <div className="ab-import"><p>{preview.length} thoughts ready to save</p><ol>{preview.map((text, index) => <li key={index}>{text}</li>)}</ol><button disabled={model.actions.busy || !preview.length} onClick={() => void savePreview()}>Save reviewed items</button><button disabled={model.actions.busy} onClick={() => setPreview(null)}>Back</button></div>}
      <div className="ab-capture an-composer"><label className="ab-sr-only" htmlFor="an-capture">Capture a thought</label><textarea ref={input} id="an-capture" rows={4} value={draft} disabled={!ready || model.actions.busy} maxLength={1000000} placeholder={paste ? 'Paste a list, one thought per line…' : 'Capture a thought…'} onChange={event => { setDraft(event.target.value); setPreview(null); }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !paste) { event.preventDefault(); void capture(); } }} />
        <div><select aria-label="Capture kind" value={kind} disabled={model.actions.busy} onChange={event => { const parsed = planningFieldsSchema.shape.kind.safeParse(event.target.value); if (parsed.success) setKind(parsed.data); }}><option value="note">Note</option><option value="task">Task</option><option value="event">Event</option><option value="goal">Goal</option><option value="document">Document</option></select><button className="ab-link" disabled={model.actions.busy} onClick={() => { setPaste(value => !value); setPreview(null); }}>{paste ? 'One thought' : 'Paste list'}</button><button className="an-capture-send" aria-label={paste ? 'Preview pasted list' : 'Add to Inbox'} disabled={model.actions.busy || !draft.trim()} onClick={() => paste ? setPreview(draft.split(/\n+/).map(line => line.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean)) : void capture()}>{paste ? '→' : '↑'}</button></div>
      </div><small>Enter to save · Shift+Enter for a new line</small>
    </footer>
  </section>;
}
