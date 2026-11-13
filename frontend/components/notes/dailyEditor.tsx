'use client';

import { useState } from 'react';
import { Extension, InputRule, Node, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps } from '@tiptap/react';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { listLabel, listStart, nextNumber, type ListStyle } from './dailyDocument';
import { safeDailyUrl, youtubeId, type DailyMedia } from './dailyBody';

export const mediaNames: Record<DailyMedia, string> = { image: 'Image', link: 'Link', video: 'YouTube video', divider: 'Divider' };
const checkboxAttrs = () => ({ id: crypto.randomUUID(), done: false, dueDate: null });

function CheckBox({ node, updateAttributes, editor }: NodeViewProps) {
  return <NodeViewWrapper as="span" className="an-daily-checkbox" contentEditable={false}>
    <input type="checkbox" aria-label={node.attrs.done ? 'Mark to-do incomplete' : 'Complete to-do'} checked={node.attrs.done}
      disabled={!editor.isEditable} onMouseDown={event => event.preventDefault()} onChange={event => updateAttributes({ done: event.target.checked })}/>
  </NodeViewWrapper>;
}

const Checkbox = Node.create({
  name: 'dailyCheckbox',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  addAttributes() {
    return { id: { default: null }, done: { default: false }, dueDate: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'span[data-daily-checkbox]', getAttrs: element => ({ done: (element as HTMLElement).dataset.checked === 'true' }) }];
  },
  renderText() { return '\ufffc'; },
  renderHTML({ node }) {
    return ['span', { 'data-daily-checkbox': '', 'data-checked': String(node.attrs.done) }, node.attrs.done ? '☑' : '☐'];
  },
  addNodeView() { return ReactNodeViewRenderer(CheckBox); },
});

function VideoPreview({ id, url, label }: { id: string; url: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="an-daily-video">
    {playing ? <iframe title={label} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
      referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> :
      <button type="button" className="an-daily-video-preview" aria-label={`Play ${label}`} onClick={() => setPlaying(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- public thumbnails are loaded directly */}
        {!failed && <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>}
        <span aria-hidden="true">▶</span>
      </button>}
    <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
  </div>;
}

function MediaView({ node, deleteNode, editor, selected }: NodeViewProps) {
  const kind = node.attrs.kind as DailyMedia;
  const url = safeDailyUrl(node.attrs.url, kind === 'image');
  const id = kind === 'video' && url ? youtubeId(url) : null;
  const label = node.attrs.label || mediaNames[kind] || 'Attachment';

  return <NodeViewWrapper className="an-daily-media" data-active={selected} contentEditable={false}>
    <div>
      {kind === 'divider' ? <hr aria-label="Divider"/> :
        id && url ? <VideoPreview key={id} id={id} label={label} url={url}/> :
        kind === 'image' && url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user photos include inline data and arbitrary image URLs
          <img src={url} alt={label} loading="lazy" referrerPolicy="no-referrer" />
        ) : url ? <a href={url} target="_blank" rel="noopener noreferrer">{label}</a> : <span>{label}</span>}
    </div>
    {editor.isEditable && <button type="button" className="an-daily-remove" aria-label={`Remove ${mediaNames[kind] || 'attachment'}`} onClick={deleteNode}>×</button>}
  </NodeViewWrapper>;
}

const Media = Node.create({
  name: 'dailyMedia',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { key: { default: null }, kind: { default: 'link' }, url: { default: '' }, label: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-daily-media]', getAttrs: element => {
      const { dailyMedia, url, label } = (element as HTMLElement).dataset;
      if (!dailyMedia || !(dailyMedia in mediaNames)) return false;
      return { kind: dailyMedia, url: url ?? '', label: label ?? '' };
    } }];
  },
  renderHTML({ node }) {
    return ['div', { 'data-daily-media': node.attrs.kind, 'data-url': node.attrs.url, 'data-label': node.attrs.label }, node.attrs.label || ''];
  },
  addNodeView() { return ReactNodeViewRenderer(MediaView); },
});

function boxesIn(node: ProseMirrorNode) {
  const positions: number[] = [];
  node.forEach((child, offset) => { if (child.type.name === 'dailyCheckbox') positions.push(offset); });
  return positions;
}

export function countCheckboxes(doc: ProseMirrorNode) {
  let count = 0;
  doc.descendants(node => { if (node.type.name === 'dailyCheckbox') count++; });
  return count;
}

export function formatDailySelection(editor: Editor, format: 'checkbox' | 'plain' | ListStyle) {
  const { state } = editor;
  const { from, to } = state.selection;
  const lines: { position: number; node: ProseMirrorNode }[] = [];
  state.doc.forEach((node, position) => {
    if (node.type.name === 'paragraph' && position < Math.max(from + 1, to) && position + node.nodeSize > from) {
      lines.push({ position, node });
    }
  });
  if (!lines.length) return;

  editor.chain().focus().command(({ tr }) => {
    if (format !== 'checkbox') {
      lines.forEach(({ position, node }, index) => {
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs, listStyle: format === 'plain' ? null : format,
          listStart: index === 0 ? 1 : node.attrs.listStart,
        });
      });
      return true;
    }
    const remove = lines.every(({ node }) => boxesIn(node).length > 0);
    const room = 200 - countCheckboxes(state.doc);
    if (!remove && lines.filter(({ node }) => !boxesIn(node).length).length > room) return false;
    for (const { position, node } of lines.reverse()) {
      const boxes = boxesIn(node);
      if (remove) for (const offset of boxes.reverse()) tr.delete(position + 1 + offset, position + 2 + offset);
      else if (!boxes.length) tr.insert(position + 1, state.schema.nodes.dailyCheckbox!.create(checkboxAttrs()));
    }
    return true;
  }).run();
}

const DailyLines = Extension.create({
  name: 'dailyLines',
  priority: 120,
  addGlobalAttributes() {
    return [{
      types: ['paragraph'],
      attributes: {
        listStyle: {
          default: null,
          parseHTML: element => ['number', 'lower', 'upper'].includes(element.dataset.listStyle ?? '') ? element.dataset.listStyle : null,
          renderHTML: attributes => attributes.listStyle ? { 'data-list-style': attributes.listStyle } : {},
        },
        listStart: {
          default: 1,
          parseHTML: element => Math.max(1, Math.min(999999, Number(element.dataset.listStart) || 1)),
          renderHTML: attributes => attributes.listStyle ? { 'data-list-start': attributes.listStart } : {},
        },
      },
    }];
  },
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s|\ufffc)\[( |x)?\] $/i,
        handler: ({ state, range, match }) => {
          if (countCheckboxes(state.doc) >= 200) return null;
          const leading = match[0].startsWith('[') ? 0 : 1;
          state.tr.replaceWith(range.from + leading, range.to, state.schema.nodes.dailyCheckbox!.create({ ...checkboxAttrs(), done: match[1]?.toLowerCase() === 'x' }));
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    const editor = this.editor;
    function removeSelectedLine() {
      if (editor.view.composing) return false;
      const { selection } = editor.state;
      const { $from, $to } = selection;
      if (selection.empty || $from.parent.type.name !== 'paragraph' || !$from.depth || $from.parentOffset !== 0) return false;
      if (!$from.parent.attrs.listStyle && !boxesIn($from.parent).length) return false;
      const coversLine = $from.parent === $to.parent ? $to.parentOffset === $from.parent.content.size :
        $to.depth === $from.depth && $to.parentOffset === 0 && $to.before() === $from.after();
      if (!coversLine || editor.state.doc.childCount < 2) return false;
      return editor.commands.command(({ tr }) => {
        const position = $from.before();
        const next = tr.doc.nodeAt($from.after());
        if (next?.type.name === 'paragraph' && next.attrs.listStyle === $from.parent.attrs.listStyle) {
          tr.setNodeMarkup($from.after(), undefined, { ...next.attrs, listStart: $from.parent.attrs.listStart });
        }
        tr.delete(position, $from.after());
        tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(position, tr.doc.content.size)), 1)).scrollIntoView();
        return true;
      });
    }
    return {
      Delete: removeSelectedLine,
      Enter: () => {
        if (editor.view.composing) return false;
        const { selection, schema } = editor.state;
        const { $from, $to } = selection;
        if ($from.parent !== $to.parent || $from.parent.type.name !== 'paragraph') return false;
        const line = $from.parent;
        const boxes = boxesIn(line);
        const style = line.attrs.listStyle;
        if (!boxes.length && !style) return false;
        if (!line.textContent.trim() && selection.empty) {
          return editor.commands.command(({ tr }) => {
            tr.replaceWith($from.before(), $from.after(), schema.nodes.paragraph!.create());
            tr.setSelection(TextSelection.create(tr.doc, $from.before() + 1));
            return true;
          });
        }
        return editor.commands.command(({ tr }) => {
          tr.deleteSelection();
          const position = tr.mapping.map($from.pos);
          const after = tr.doc.resolve(position);
          const beforeCount = boxesIn(after.parent).filter(offset => offset < after.parentOffset).length;
          const room = Math.max(0, 200 - countCheckboxes(tr.doc));
          tr.split(position, 1, [{ type: schema.nodes.paragraph!, attrs: { listStyle: style, listStart: line.attrs.listStart } }]);
          const next = position + 2;
          const copies = Array.from({ length: Math.min(beforeCount, room) }, () => schema.nodes.dailyCheckbox!.create(checkboxAttrs()));
          if (copies.length) tr.insert(next, copies);
          tr.setSelection(TextSelection.create(tr.doc, next + copies.length)).scrollIntoView();
          return true;
        });
      },
      Backspace: () => {
        if (removeSelectedLine()) return true;
        if (editor.view.composing) return false;
        const { selection, schema } = editor.state;
        const { $from } = selection;
        if (!selection.empty || $from.parent.type.name !== 'paragraph' || $from.parent.textContent.trim()) return false;
        const boxes = boxesIn($from.parent);
        if (!boxes.length && !$from.parent.attrs.listStyle) return false;
        return editor.commands.command(({ tr }) => {
          if (boxes.length) {
            const last = $from.start() + boxes[boxes.length - 1]!;
            tr.delete(last, last + 1);
            tr.setSelection(TextSelection.create(tr.doc, last));
          } else {
            tr.replaceWith($from.before(), $from.after(), schema.nodes.paragraph!.create());
            tr.setSelection(TextSelection.create(tr.doc, $from.before() + 1));
          }
          return true;
        });
      },
    };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      filterTransaction: (tr, state) => {
        if (!tr.docChanged || tr.getMeta('preventUpdate')) return true;
        const next = countCheckboxes(tr.doc);
        // Allow legacy data to be edited or reduced even if its count is above the limit.
        return next <= 200 || next <= countCheckboxes(state.doc);
      },
      appendTransaction: (transactions, _old, state) => {
        if (!transactions.some(tr => tr.docChanged)) return null;
        const seen = new Set<string>();
        const tr = state.tr;
        state.doc.descendants((node, pos) => {
          if (!['dailyCheckbox', 'dailyMedia'].includes(node.type.name)) return;
          const field = node.type.name === 'dailyCheckbox' ? 'id' : 'key';
          const key = node.attrs[field];
          if (!key || seen.has(key)) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, [field]: crypto.randomUUID() });
          } else seen.add(key);
        });
        return tr.docChanged ? tr : null;
      },
      props: {
        handleTextInput(view: EditorView, from, to, input) {
          if (input !== ' ' || from !== to || view.composing) return false;
          const { doc, tr } = view.state;
          const position = doc.resolve(from);
          if (position.parent.type.name !== 'paragraph') return false;
          const prefix = position.parent.textBetween(0, position.parentOffset, '', '');
          const marker = /^([1-9]\d{0,5}|[a-z]|[A-Z])\.$/.exec(prefix)?.[1];
          if (!marker) return false;
          const style = /^\d/.test(marker) ? 'number' : marker === marker.toLowerCase() ? 'lower' : 'upper';
          const text = position.nodeBefore;
          if (!text?.isText || text.text !== prefix) return false;
          tr.delete(from - prefix.length, from);
          tr.setSelection(TextSelection.create(tr.doc, from - prefix.length));
          tr.setNodeMarkup(position.before(), undefined, { ...position.parent.attrs, listStyle: style, listStart: listStart(marker) });
          view.dispatch(tr);
          return true;
        },
        decorations(state) {
          const decorations: Decoration[] = [];
          let previous: { style: ListStyle; value: number } | null = null;
          const activeLine = state.selection.$head.depth === 1 ? state.selection.$head.before() : -1;

          state.doc.forEach((line, offset) => {
            const style = line.attrs.listStyle as ListStyle | null;
            if (style) {
              const value = nextNumber(previous, style, line.attrs.listStart);
              previous = { style, value };
              let leading = 0;
              line.forEach((child, position) => { if (position === leading && child.type.name === 'dailyCheckbox') leading++; });
              decorations.push(Decoration.widget(offset + 1 + leading, () => {
                const marker = document.createElement('span');
                marker.className = 'an-daily-list-number';
                marker.contentEditable = 'false';
                marker.textContent = listLabel(style, value) + '.';
                return marker;
              }, { side: -1, key: `${style}:${value}` }));
            } else previous = null;

            if (line.type.name !== 'paragraph' || !editor.isEditable || !boxesIn(line).length) return;
            decorations.push(Decoration.node(offset, offset + line.nodeSize, {
              class: offset === activeLine ? 'an-daily-marked-line an-daily-line-active' : 'an-daily-marked-line',
            }));

          });
          return DecorationSet.create(state.doc, decorations);
        },
        handleDOMEvents: {
          beforeinput(view, event) {
            if (view.composing || event.isComposing || !event.cancelable || !['insertParagraph', 'deleteContentBackward'].includes(event.inputType)) return false;
            const key = event.inputType === 'insertParagraph' ? 'Enter' : 'Backspace';
            const keyCode = key === 'Enter' ? 13 : 8;
            const keydown = new KeyboardEvent('keydown', { key, code: key, keyCode } as KeyboardEventInit);
            const handled = view.someProp('handleKeyDown', handler => handler(view, keydown));
            if (handled) event.preventDefault();
            return !!handled;
          },
        },
        attributes: { 'aria-label': 'Daily notes', role: 'textbox', 'aria-multiline': 'true', 'data-placeholder': 'Start writing…' },
      },
    })];
  },
});

export const dailyExtensions = [DailyLines, Checkbox, Media];
