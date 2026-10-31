'use client';
import { useEffect, useState } from 'react';
import type { PlanningFields } from '@/lib/book';
import { BookItemRow } from './BookItemRow';
import { DropZone } from './BookDrag';
import { PaneHeading } from './PaneHeading';
import type { BookWorkspaceModel } from './useBookWorkspace';
export function InboxPane({ model, labelledCapture = false }: { model: BookWorkspaceModel; labelledCapture?: boolean }) {
  const { setDraftFlag } = model;
  const [draft, setDraft] = useState(''); const [kind, setKind] = useState<PlanningFields['kind']>('task'); const [processed, setProcessed] = useState(false);
  const [paste, setPaste] = useState(false); const [preview, setPreview] = useState<string[] | null>(null);
  const items = model.filtered.filter(item => processed || !item.planning.processed).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  useEffect(() => {
    setDraftFlag('inbox', Boolean(draft.trim() || preview?.length));
    return () => setDraftFlag('inbox', false);
  }, [draft, preview, setDraftFlag]);
  async function capture() {
    if (!draft.trim()) return;
    const saved = await model.actions.capture(draft.trim(), kind);
    if (saved) setDraft('');
  }
  async function savePreview() {
    const remaining = [...(preview ?? [])];
    while (remaining.length) {
      const text = remaining[0]; if (!text) break;
      const saved = await model.actions.capture(text, kind); if (!saved) break;
      remaining.shift(); setPreview([...remaining]);
    }
    if (!remaining.length) { setPreview(null); setDraft(''); setPaste(false); }
  }
  return <section className="ab-pane ab-inbox" hidden={!model.shownPanels.includes('inbox')} aria-label="01 Inbox">
    <PaneHeading panel="inbox" model={model} count={items.length}>{!labelledCapture && <button title="Write with context" aria-label="Write with context" onClick={() => model.add()}>+</button>}</PaneHeading>
    <div className="ab-capture"><label className="ab-sr-only" htmlFor="ab-capture">Capture a thought</label><textarea id="ab-capture" rows={paste ? 7 : 2} value={draft} maxLength={paste ? 20000 : 255} placeholder={paste ? 'Paste a list or call notes. Preview before saving.' : 'Capture a thought…'} onChange={event => { setDraft(event.target.value); setPreview(null); }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !paste) { event.preventDefault(); void capture(); } }} />
      <div><select aria-label="Capture kind" value={kind} onChange={event => { const selected = ['task', 'event', 'note', 'goal', 'document'].find(value => value === event.target.value); if (selected === 'task' || selected === 'event' || selected === 'note' || selected === 'goal' || selected === 'document') setKind(selected); }}><option value="task">• Task</option><option value="event">○ Event</option><option value="note">– Note</option><option value="goal">★ Goal</option><option value="document">Document</option></select><button className={labelledCapture ? 'ab-primary' : undefined} aria-label={paste ? 'Preview pasted list' : 'Add to Inbox'} disabled={model.actions.busy || !draft.trim()} onClick={() => paste ? setPreview(draft.split(/\n+/).map(line => line.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean).map(line => line.slice(0, 255))) : void capture()}>{paste ? 'Preview' : labelledCapture ? 'Add to Inbox' : '↵'}</button></div>
    </div>
    {preview && <div className="ab-import"><p>{preview.length} remaining items. Review before saving.</p>{preview.map((text, index) => <p key={`${index}:${text}`}>• {text}</p>)}<button disabled={model.actions.busy || !preview.length} onClick={() => void savePreview()}>Save reviewed items</button><button onClick={() => setPreview(null)}>Back</button></div>}
    <button className="ab-link" onClick={() => { setPaste(value => !value); setPreview(null); }}>{paste ? 'Quick capture' : 'Paste a list'}</button>
    <DropZone id="ab-inbox-drop" target={{ kind: 'inbox' }} className="ab-scroll ab-inbox-list">{items.length ? items.map(item => <BookItemRow key={item.id} item={item} model={model} />) : <p className="ab-empty">{model.query.trim() ? 'No Inbox entries match your search.' : 'Nothing waiting. Capture a thought above.'}</p>}</DropZone>
    <footer><button className="ab-link" onClick={() => setProcessed(value => !value)}>{processed ? 'Pending only' : 'Show processed'}</button><small>Enter to capture · Shift + Enter for a new line</small></footer>
  </section>;
}
