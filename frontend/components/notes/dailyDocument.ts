import type { JSONContent } from '@tiptap/react';
import { z } from 'zod';
import { writeDailyBody, type DailyBlock, type DailyTask } from './dailyBody';

export const dailyLimit = 1_000_000;
export type ListStyle = 'number' | 'lower' | 'upper';

const checkboxSchema = z.object({
  id: z.string().uuid(), done: z.boolean(), offset: z.number().int().nonnegative(),
});
const lineSchema = z.object({
  style: z.enum(['number', 'lower', 'upper']).nullable(),
  start: z.number().int().min(1).max(999999),
  boxes: z.array(checkboxSchema),
  prefix: z.string().max(900),
});
const lineMarker = /^\[\/\/\]: # \(airunote-daily-line:([A-Za-z0-9+/=]+)\)$/;
type Line = z.infer<typeof lineSchema>;

export function listLabel(style: ListStyle, number: number) {
  if (style === 'number') return String(number);
  let value = number;
  let label = '';
  while (value > 0) {
    value--;
    label = String.fromCharCode((style === 'lower' ? 97 : 65) + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

export function listStart(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  return [...value.toLowerCase()].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 96, 0);
}

export function nextNumber(previous: { style: ListStyle; value: number } | null, style: ListStyle, start: number) {
  return previous?.style === style ? previous.value + 1 : start;
}

const paragraph = (content?: JSONContent[], attrs?: JSONContent['attrs']): JSONContent => ({ type: 'paragraph', attrs, content });
const textNode = (text: string): JSONContent => ({ type: 'text', text });

function inlineLines(value: string): JSONContent[] {
  return value.split(/\r?\n|\u2028/).flatMap((part, index) => [
    ...(index ? [{ type: 'hardBreak' }] : []),
    ...(part ? [textNode(part)] : []),
  ]);
}

function decodeLine(value: string): Line | undefined {
  try {
    const parsed = lineSchema.safeParse(JSON.parse(atob(value)));
    if (parsed.success) return parsed.data;
  } catch { /* Keep unrecognized Markdown as text. */ }
}

function readText(text: string, tasks: Map<string, DailyTask>) {
  const content: JSONContent[] = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]!;
    const markerIndex = lines[index + 1] === '' ? index + 2 : index + 1;
    const marker = lineMarker.exec(lines[markerIndex] ?? '');
    const data = marker && decodeLine(marker[1]!);
    if (!data || !raw.startsWith(data.prefix)) {
      content.push(paragraph(raw ? [textNode(raw)] : undefined));
      continue;
    }
    index = markerIndex;
    const prose = raw.slice(data.prefix.length);
    const children: JSONContent[] = [];
    let prev = 0;
    for (const box of data.boxes) {
      const offset = Math.min(prose.length, Math.max(prev, box.offset));
      const saved = tasks.get(box.id);

      if (offset > prev) children.push(...inlineLines(prose.slice(prev, offset)));
      children.push({ type: 'dailyCheckbox', attrs: { id: box.id, done: saved?.done ?? box.done, dueDate: saved?.dueDate ?? null } });
      prev = offset;
    }
    if (prev < prose.length) children.push(...inlineLines(prose.slice(prev)));
    content.push(paragraph(children, { listStyle: data.style, listStart: data.start }));
  }
  return content;
}

export function dailyDocument(blocks: DailyBlock[]) {
  const tasks = new Map(blocks.flatMap(block => block.kind === 'task' ? [[block.task.id, block.task] as const] : []));
  const used = new Set<string>();
  for (const block of blocks) {
    if (block.kind !== 'text') continue;
    for (const line of block.text.split('\n')) {
      const marker = lineMarker.exec(line);
      if (marker) decodeLine(marker[1]!)?.boxes.forEach(box => used.add(box.id));
    }
  }
  // Structured lines own their task placement. Old notes keep the original ordering.
  const content = blocks.flatMap((block): JSONContent[] => {
    if (block.kind === 'text') return readText(block.text, tasks);
    if (block.kind === 'task') {
      if (used.has(block.task.id)) return [];
      const { id, done, dueDate, text } = block.task;
      return [paragraph([{ type: 'dailyCheckbox', attrs: { id, done, dueDate: dueDate ?? null } }, ...inlineLines(text)])];
    }
    return [{ type: 'dailyMedia', attrs: { ...block } }];
  });
  if (!content.length || content.at(-1)?.type === 'dailyMedia') content.push(paragraph());
  return { type: 'doc', content };
}

function serializeLine(node: JSONContent, numbering: { style: ListStyle; value: number } | null, checklist: DailyTask[]) {
  const style = node.attrs?.listStyle as ListStyle | null ?? null;
  const start = Number(node.attrs?.listStart) || 1;
  const value = style ? nextNumber(numbering, style, start) : 0;
  const next = style ? { style, value } : null;
  const boxes: Array<Line['boxes'][number] & { dueDate?: string }> = [];
  let leading = 0;
  let prose = '';
  for (const child of node.content ?? []) {
    if (child.type === 'dailyCheckbox') {
      boxes.push({ id: child.attrs!.id, done: !!child.attrs!.done, offset: prose.length, dueDate: child.attrs!.dueDate || undefined });
      if (!prose) leading++;
    } else if (child.type === 'hardBreak') {
      // A soft break remains in the same row, including inside numbered lists.
      prose += '\u2028';
    } else if (child.type === 'text') {
      prose += child.text ?? '';
    }
  }
  const fullText = prose.replace(/\u2028/g, '\n').trim();
  boxes.forEach((box, index) => {
    const end = boxes[index + 1]?.offset ?? prose.length;
    const taskText = prose.slice(box.offset, end).replace(/\u2028/g, '\n').trim() || fullText;
    if (!taskText) return;
    const { dueDate } = box;
    checklist.push({ id: box.id, done: box.done, text: taskText, ...(dueDate ? { dueDate } : {}) });
  });
  const prefix = (leading ? boxes.slice(0, leading).map(box => box.done ? '[x] ' : '[ ] ').join('') : '') + (style ? listLabel(style, value) + '. ' : '');
  if (!style && !boxes.length && !prose.includes('\u2028')) return { text: prose, next };
  const marker = btoa(JSON.stringify({ style, start, boxes: boxes.map(({ id, done, offset }) => ({ id, done, offset })), prefix }));
  return { text: `${prefix}${prose}\n\n[//]: # (airunote-daily-line:${marker})`, next };
}

export function writeDailyDocument(doc: JSONContent) {
  const checklist: DailyTask[] = [];
  let numbering: { style: ListStyle; value: number } | null = null;
  let body = '';
  for (const node of doc.content ?? []) {
    if (node.type === 'dailyMedia') {
      if (body) body += '\n';
      body += writeDailyBody([node.attrs as DailyBlock]).content + '\n\n';
      numbering = null;
      continue;
    }
    const result = serializeLine(node, numbering, checklist);
    body += result.text + '\n';
    numbering = result.next;
  }
  return { content: body.endsWith('\n') ? body.slice(0, -1) : body, checklist };
}
