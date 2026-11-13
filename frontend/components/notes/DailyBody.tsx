'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Slice } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { PaneMenu } from './PaneMenu';
import { readDailyPhoto } from './readDailyPhoto';
import { safeDailyUrl, youtubeId, type DailyBlock, type DailyMedia } from './dailyBody';
import { countCheckboxes, dailyExtensions, formatDailySelection, mediaNames } from './dailyEditor';
import { dailyDocument, dailyLimit, writeDailyDocument } from './dailyDocument';

type MediaBlock = Extract<DailyBlock, { kind: DailyMedia }>;

const extensions = [
  StarterKit.configure({
    blockquote: false, bulletList: false, codeBlock: false, heading: false,
    horizontalRule: false, listItem: false, orderedList: false,
    bold: false, code: false, italic: false, strike: false,
  }),
  ...dailyExtensions,
];
const textDocument = (value: string) => value.replace(/\r\n?/g, '\n').split('\n').map(line => ({
  type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [],
}));

export function DailyBody({ initialBlocks, disabled, onChange, saveAction }: {
  initialBlocks: DailyBlock[];
  disabled: boolean;
  onChange: (body: ReturnType<typeof writeDailyDocument>) => void;
  saveAction: ReactNode;
}) {
  const mediaDialog = useRef<HTMLDialogElement>(null);
  const mediaType = useRef<DailyMedia>('link');
  const [media, setMedia] = useState<DailyMedia>('link');
  const [mediaError, setMediaError] = useState('');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [boxCount, setBoxCount] = useState(0);
  const [selectedLines, setSelectedLines] = useState(false);
  const [line, setLine] = useState<{ top: number; from: number; to: number } | null>(null);
  const [lineFocused, setLineFocused] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const mediaForm = useRef<HTMLFormElement>(null);
  const editor = useEditor({
    extensions,
    content: dailyDocument(initialBlocks),
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onSelectionUpdate: ({ editor }) => setSelectedLines(!editor.state.selection.empty),
    onCreate: ({ editor }) => setBoxCount(countCheckboxes(editor.state.doc)),
    onUpdate: ({ editor }) => {
      setBoxCount(countCheckboxes(editor.state.doc));
      onChange(writeDailyDocument(editor.getJSON()));
    },
    editorProps: {
      handlePaste(view, event, slice) {
        const text = event.clipboardData?.getData('text/plain');
        if (!text?.includes('\n') || event.clipboardData?.getData('text/html')) return false;
        const { $from } = view.state.selection;
        const boxes: number[] = [];
        $from.parent.forEach((node, offset) => { if (node.type.name === 'dailyCheckbox') boxes.push(offset); });
        if (boxes.length === 0 && !$from.parent.attrs.listStyle) return false;
        const lines = text.replace(/\r\n?/g, '\n').split('\n');
        if (countCheckboxes(view.state.doc) + (lines.length - 1) * boxes.length > 200 || slice.size > dailyLimit) return false;
        const { schema, tr } = view.state;
        tr.deleteSelection();
        if (lines[0]) tr.insertText(lines[0], tr.selection.from);
        for (const line of lines.slice(1)) {
          const position = tr.selection.from;
          tr.split(position, 1, [{ type: schema.nodes.paragraph!, attrs: $from.parent.attrs }]);
          const children = boxes.map(() => schema.nodes.dailyCheckbox!.create({ id: crypto.randomUUID() }));
          if (line) children.push(schema.text(line));
          tr.insert(position + 2, children);
          tr.setSelection(TextSelection.create(tr.doc, position + 2 + boxes.length + line.length));
        }
        view.dispatch(tr.scrollIntoView());
        return true;
      },
      clipboardTextParser(text, _context, _plain, view) {
        const content = view.state.schema.nodeFromJSON({ type: 'doc', content: textDocument(text) }).content;
        return new Slice(content, 1, 1);
      },
    },
  });

  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const parent = editor.state.selection.$head;
      if (!parent.depth || !canvas.current || !editor.isFocused) return;
      placeRemove(editor.view.nodeDOM(parent.before()));
    };
    editor.on('selectionUpdate', update).on('update', update).on('focus', update);
    return () => { editor.off('selectionUpdate', update).off('update', update).off('focus', update); };
    // Only the mounted editor owns this geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function placeRemove(target: EventTarget | null) {
    const paragraph = target instanceof Element ? target.closest('.tiptap > p.an-daily-marked-line') : null;
    if (!paragraph || !editor || !canvas.current || !canvas.current.contains(paragraph)) { setLine(null); return; }
    const from = editor.view.posAtDOM(paragraph, 0) - 1;
    const node = editor.state.doc.nodeAt(from);
    if (!node || node.type.name !== 'paragraph') { setLine(null); return; }
    setLine({ top: paragraph.getBoundingClientRect().top - canvas.current.getBoundingClientRect().top, from, to: from + node.nodeSize });
  }

  function hoverLine(event: MouseEvent<HTMLDivElement>) {
    if (matchMedia('(hover: hover)').matches && !(event.target instanceof Element && event.target.closest('.an-daily-remove-line'))) placeRemove(event.target);
  }

  function insert(block: MediaBlock) {
    if (!editor) return;
    editor.chain().focus().command(({ tr, state }) => {
      const { $to } = tr.selection;
      const media = state.schema.nodes.dailyMedia!.create(block);
      const paragraph = state.schema.nodes.paragraph!.create();
      const insertAt = $to.depth ? $to.after() : $to.pos;
      tr.insert(insertAt, [media, paragraph]);
      tr.setSelection(TextSelection.create(tr.doc, insertAt + media.nodeSize + 1)).scrollIntoView();
      return true;
    }).run();
  }

  function checkbox() {
    if (!editor) return;
    if (!editor.state.selection.empty) { formatDailySelection(editor, 'checkbox'); return; }
    if (boxCount >= 200) return;
    editor.chain().focus().command(({ tr, state }) => {
      const position = tr.selection.from;
      if (!tr.selection.$from.parent.isTextblock) return false;
      tr.insert(position, state.schema.nodes.dailyCheckbox!.create({ id: crypto.randomUUID() }));
      tr.setSelection(TextSelection.create(tr.doc, position + 1)).scrollIntoView();
      return true;
    }).run();
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
    const occupied = editor ? writeDailyDocument(editor.getJSON()).content.length : 0;
    if (kind === 'image' && file instanceof File && file.size) {
      setReadingPhoto(true);
      try {
        value = await readDailyPhoto(file, dailyLimit - occupied - 350);
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
    if (occupied + url.length + label.length + 100 > dailyLimit) {
      setMediaError('This note is too large for that attachment. Try a smaller image or a link.');
      return;
    }
    mediaDialog.current?.close();
    insert(next);
  }

  return <div className="an-daily-body">
    <div ref={canvas} className="an-daily-editor-frame" onMouseOver={hoverLine}
      onMouseLeave={() => { if (!lineFocused) setLine(null); }}
      onFocus={() => setLineFocused(true)} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) { setLineFocused(false); setLine(null); }
      }}>
      <EditorContent className="an-daily-editable" editor={editor}/>
      {line && !disabled && <button type="button" className="an-daily-remove-line" aria-label="Remove checklist line" style={{ top: line.top }}
        onMouseDown={event => event.preventDefault()} onClick={() => {
          editor?.chain().focus().deleteRange({ from: line.from, to: line.to }).run();
          setLine(null);
        }}>×</button>}
    </div>
    <div className="an-daily-insert" aria-label="Insert in daily note">
      <button type="button" disabled={disabled || !editor || !selectedLines && boxCount >= 200} onMouseDown={event => event.preventDefault()} onClick={checkbox}>☑ Checklist</button>
      <PaneMenu label="List formatting" trigger={<span>List style</span>}>
        {([['number', '1. 2. 3.'], ['lower', 'a. b. c.'], ['upper', 'A. B. C.'], ['plain', 'Remove numbering']] as const).map(([format, label]) =>
          <button key={format} type="button" data-menu-action disabled={disabled || !editor} onClick={() => { if (editor) formatDailySelection(editor, format); }}>{label}</button>)}
      </PaneMenu>
      <PaneMenu label="Insert in daily note" trigger={<span>Insert +</span>}>
        {Object.entries(mediaNames).map(([kind, label]) => <button key={kind} type="button" data-menu-action disabled={disabled || !editor} onClick={() => addMedia(kind as DailyMedia)}>{label}</button>)}
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
