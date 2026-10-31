'use client';
import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';

// Custom HTML can be edited as source without silently removing unsupported formatting.
function supportsRichEditing(html: string) {
  if (typeof DOMParser === 'undefined') return false;
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const tags = new Set('P BR H1 H2 H3 H4 H5 H6 STRONG B EM I S STRIKE DEL U CODE PRE BLOCKQUOTE HR OL UL LI IMG TABLE COLGROUP COL TBODY THEAD TFOOT TR TD TH A SPAN MARK'.split(' '));
  return [...body.querySelectorAll('*')].every(element => tags.has(element.tagName) && [...element.attributes].every(attribute => {
    if (attribute.name === 'style') return attribute.value.split(';').filter(value => value.trim()).every(value => /^(color|background-color|text-align|width|min-width)\s*:/i.test(value.trim()));
    return ['href', 'target', 'rel', 'src', 'alt', 'title', 'start', 'colspan', 'rowspan', 'data-colwidth', 'data-color', 'width'].includes(attribute.name);
  }));
}
export function NotesRichText({ content, editable = false, onChange, onSource }: { content: string; editable?: boolean; onChange?: (html: string) => void; onSource?: () => void }) {
  const supported = supportsRichEditing(content);
  const editor = useEditor({ extensions: [StarterKit, Image.configure({ inline: true, allowBase64: true }), Link.configure({ openOnClick: !editable }), Table, TableRow, TableCell, TableHeader, TextAlign.configure({ types: ['heading', 'paragraph'] }), Underline, Color, TextStyle, Highlight.configure({ multicolor: true })], content, editable: editable && supported, immediatelyRender: false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()), editorProps: { attributes: { 'aria-label': 'Note text', role: 'textbox', 'aria-multiline': 'true' } } });
  useEffect(() => { if (editor && content !== editor.getHTML()) editor.commands.setContent(content, false); }, [editor, content]);
  useEffect(() => { editor?.setEditable(editable && supported, false); }, [editor, editable, supported]);
  return <>{editable && !supported && <p className="an-edit-hint">This note uses custom formatting. <button onClick={onSource}>Edit source</button></p>}<EditorContent editor={editor} /></>;
}
