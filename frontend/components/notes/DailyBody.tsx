'use client';

import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { GrowingField } from './GrowingField';
import { PaneMenu } from './PaneMenu';
import { readDailyPhoto } from './readDailyPhoto';
import { safeDailyUrl, youtubeId, type DailyBlock, type DailyMedia } from './dailyBody';

const mediaNames: Record<DailyMedia, string> = { image: 'Image', link: 'Link', video: 'YouTube video', divider: 'Divider' };
type MediaBlock = Extract<DailyBlock, { kind: DailyMedia }>;

function DailyMediaPreview({ block }: { block: MediaBlock }) {
  const [playing, setPlaying] = useState(false);
  const id = block.kind === 'video' ? youtubeId(block.url) : null;
  if (block.kind === 'divider') return <hr aria-label="Divider"/>;
  // User-supplied and embedded photos are rendered directly, without a remote image proxy.
  // eslint-disable-next-line @next/next/no-img-element
  if (block.kind === 'image') return <div className="an-daily-photo"><img src={block.url} alt={block.label} loading="lazy" referrerPolicy="no-referrer" /></div>;
  if (id && playing) return <iframe title={block.label || 'YouTube video'} src={`https://www.youtube-nocookie.com/embed/${id}`}
    referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  return <div>{id && <button type="button" onClick={() => setPlaying(true)}>Play video</button>} <a href={block.url} target="_blank" rel="noopener noreferrer">{block.label || block.url}</a></div>;
}

const paragraph = (text = ''): DailyBlock => ({ kind: 'text', key: crypto.randomUUID(), text });
function task(text = ''): DailyBlock {
  const id = crypto.randomUUID();
  return { kind: 'task', key: id, task: { id, text, done: false } };
}

export function DailyBody({ blocks, disabled, onChange, saveAction }: {
  blocks: DailyBlock[];
  disabled: boolean;
  onChange: (blocks: DailyBlock[]) => void;
  saveAction: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const mediaDialog = useRef<HTMLDialogElement>(null);
  const mediaType = useRef<DailyMedia>('link');
  const [media, setMedia] = useState<DailyMedia>('link');
  const [mediaError, setMediaError] = useState('');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const mediaForm = useRef<HTMLFormElement>(null);
  const selection = useRef<{ key: string; start: number; end: number } | null>(null);
  const hasRoom = blocks.filter(block => block.kind === 'task').length < 200;
  const limit = 1_000_000;

  function focus(key: string) {
    requestAnimationFrame(() => {
      const input = surface.current?.querySelector<HTMLTextAreaElement>(`[data-daily-block="${key}"]`);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function replace(index: number, replacements: DailyBlock[], next: DailyBlock) {
    onChange([...blocks.slice(0, index), ...replacements, ...blocks.slice(index + 1)]);
    focus(next.key);
  }

  function insert(next: DailyBlock) {
    const picked = selection.current;
    const index = blocks.findIndex(block => block.key === picked?.key);
    const block = blocks[index];
    const focusable = next.kind === 'task' || next.kind === 'text';
    const writeAfter = focusable ? next : paragraph();
    const insertion = focusable ? [next] : [next, writeAfter];
    if (!block || block.kind !== 'text') {
      const position = index < 0 ? blocks.length : index + 1;
      onChange([...blocks.slice(0, position), ...insertion, ...blocks.slice(position)]);
      focus(writeAfter.key);
      return;
    }
    const start = picked?.start ?? block.text.length;
    const end = picked?.end ?? start;
    const at = next.kind === 'text' ? end : block.text.indexOf('\n', end);
    const split = at < 0 ? block.text.length : at;
    const before = block.text.slice(0, split);
    const after = block.text.slice(at < 0 || next.kind === 'text' ? split : split + 1);
    const following = after ? [paragraph(after)] : [];
    replace(index, [...(before ? [{ ...block, text: before }] : []), ...insertion, ...following], writeAfter);
  }

  function addMedia(kind: DailyMedia) {
    if (kind === 'divider') {
      insert({ kind, key: crypto.randomUUID(), url: '', label: '' });
      return;
    }
    mediaType.current = kind;
    setMedia(kind);
    setMediaError('');
    mediaForm.current?.reset();
    mediaDialog.current?.showModal();
  }

  async function saveMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const kind = mediaType.current;
    const fields = new FormData(event.currentTarget);
    const file = fields.get('photo');
    let value = String(fields.get('url') ?? '');
    const occupied = blocks.reduce((size, block) => size + (block.kind === 'text' ? block.text.length : block.kind === 'task' ? block.task.text.length + 100 : block.url.length + block.label.length + 100), 0);
    if (kind === 'image' && file instanceof File && file.size) {
      setReadingPhoto(true);
      try {
        value = await readDailyPhoto(file, limit - occupied - 350);
      } catch (error) {
        setMediaError(error instanceof Error ? error.message : 'Could not read the photo.');
        return;
      } finally { setReadingPhoto(false); }
    }
    const url = safeDailyUrl(value, kind === 'image');
    if (!url || kind === 'video' && !youtubeId(url)) {
      setMediaError(kind === 'video' ? 'Enter a YouTube video URL.' : 'Enter a valid link starting with http or https.');
      return;
    }
    const label = String(fields.get('label') ?? '').trim() || (kind === 'link' ? url : mediaNames[kind]);
    const next = { kind, key: crypto.randomUUID(), url, label };
    if (occupied + url.length + label.length + 100 > limit) {
      setMediaError('This note is too large for that attachment. Try a smaller image or a link.');
      return;
    }
    mediaDialog.current?.close();
    insert(next);
  }

  function handleTask(event: KeyboardEvent<HTMLTextAreaElement>, block: Extract<DailyBlock, { kind: 'task' }>, index: number) {
    if (event.nativeEvent.isComposing || event.shiftKey) return;
    if ((event.key === 'Backspace' && !block.task.text) || (event.key === 'Enter' && !block.task.text.trim())) {
      event.preventDefault();
      const next = paragraph();
      replace(index, [next], next);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!hasRoom) return;
      const before = block.task.text.slice(0, event.currentTarget.selectionStart);
      const after = block.task.text.slice(event.currentTarget.selectionEnd);
      const next = task(after);
      replace(index, [{ ...block, task: { ...block.task, text: before } }, next], next);
    }
  }

  return <div className="an-daily-body" ref={surface}>
    <div className="an-daily-blocks">
      {blocks.map((block, index) => block.kind !== 'task' && block.kind !== 'text' ? <div className="an-daily-media" key={block.key}>
        <DailyMediaPreview block={block}/>
        <button type="button" aria-label={`Remove ${mediaNames[block.kind]}`} disabled={disabled} onClick={() => {
          const remaining = blocks.filter(value => value !== block);
          onChange(remaining.length ? remaining : [paragraph()]);
        }}>×</button>
      </div> : <div key={block.key} className={block.kind === 'task' ? 'an-daily-inline-task' : 'an-daily-paragraph'} data-done={block.kind === 'task' && block.task.done}>
        {block.kind === 'task' && <input type="checkbox" aria-label={block.task.text ? `Complete ${block.task.text}` : 'Complete task'} checked={block.task.done} disabled={disabled} onChange={event => {
          const done = event.currentTarget.checked;
          onChange(blocks.map(value => value === block ? { ...block, task: { ...block.task, done } } : value));
        }}/>}
        <GrowingField data-daily-block={block.key} aria-label={block.kind === 'task' ? 'Checklist task' : 'Daily notes'}
          placeholder={block.kind === 'task' ? 'To-do' : 'Start writing…'} disabled={disabled} maxLength={block.kind === 'task' ? 2000 : limit}
          value={block.kind === 'task' ? block.task.text : block.text}
          onFocus={event => { selection.current = { key: block.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
          onSelect={event => { selection.current = { key: block.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
          onChange={event => {
            const input = event.currentTarget;
            const text = input.value;
            selection.current = { key: block.key, start: input.selectionStart, end: input.selectionEnd };
            if (block.kind === 'task' && text.includes('\n')) {
              const [first, ...following] = text.split('\n');
              const remaining = 200 - blocks.filter(value => value.kind === 'task').length;
              const additions = following.map((line, offset) => offset < remaining ? task(line) : paragraph(line));
              const initial = first?.trim() ? { ...block, task: { ...block.task, text: first } } : paragraph();
              replace(index, [initial, ...additions], additions.at(-1) ?? initial);
              return;
            }
            onChange(blocks.map(value => value !== block ? value : block.kind === 'task' ? { ...block, task: { ...block.task, text } } : { ...block, text }));
          }}
          onKeyDown={event => {
            if (block.kind === 'task') handleTask(event, block, index);
          }}/>
        {block.kind === 'task' && <button type="button" aria-label={block.task.text ? `Remove ${block.task.text}` : 'Remove task'} disabled={disabled} onClick={() => {
          const next = blocks.filter(value => value !== block);
          onChange(next.length ? next : [paragraph()]);
        }}>×</button>}
      </div>)}
    </div>
    <div className="an-daily-insert" aria-label="Insert in daily note">
      <button type="button" disabled={disabled || !hasRoom} onClick={() => insert(task())}>☑ Checklist</button>
      {blocks.some(block => block.kind !== 'text') && <button type="button" disabled={disabled} onClick={() => insert(paragraph())}>Continue writing</button>}
      <PaneMenu label="Insert in daily note" trigger={<span>Insert +</span>}>
        {Object.entries(mediaNames).map(([kind, label]) => <button key={kind} type="button" data-menu-action disabled={disabled} onClick={() => addMedia(kind as DailyMedia)}>{label}</button>)}
      </PaneMenu>
      {saveAction}
    </div>
    <dialog ref={mediaDialog} className="an-kind-dialog" aria-label={`Insert ${mediaNames[media]}`} onCancel={event => { if (readingPhoto) event.preventDefault(); }}>
      <form ref={mediaForm} className="an-daily-media-form" onSubmit={event => void saveMedia(event)}>
        <h2>{mediaNames[media]}</h2>
        <label>{media === 'image' ? 'Image URL' : 'URL'}<input name="url" type="url" autoComplete="off" maxLength={2000} placeholder="https://…"/></label>
        {media === 'image' && <label>Or choose a photo<input name="photo" type="file" accept="image/*"/></label>}
        <label>{media === 'image' ? 'Description' : 'Display text'}<input name="label" maxLength={200}/></label>
        {mediaError && <p role="alert">{mediaError}</p>}
        <div className="an-kind-dialog-actions"><button type="button" onClick={() => mediaDialog.current?.close()} disabled={readingPhoto}>Cancel</button><button className="ab-primary" disabled={readingPhoto}>{readingPhoto ? 'Reading…' : 'Insert'}</button></div>
      </form>
    </dialog>
  </div>;
}
