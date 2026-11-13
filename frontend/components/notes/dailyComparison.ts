import type { JSONContent } from '@tiptap/react';
import { dailyDocument, listLabel, writeDailyDocument } from './dailyDocument';
import { readDailyBody } from './dailyBody';
import type { DailySnapshot } from './mergeDailyNote';

export type Choice = 'original' | 'copy' | 'both';
export type Difference<T> = { original: T[]; copy: T[]; shared: boolean };

function align<T>(original: T[], copy: T[], key: (value: T) => string): Difference<T>[] {
  const a = original.map(key);
  const b = copy.map(key);
  const rows: Difference<T>[] = [];
  let ai = 0, bi = 0;
  function match(x: number, y: number) {
    if (x > ai || y > bi) rows.push({ original: original.slice(ai, x), copy: copy.slice(bi, y), shared: false });
    const tail = rows.at(-1);
    if (tail?.shared) { tail.original.push(original[x]!); tail.copy.push(copy[y]!); }
    else rows.push({ original: [original[x]!], copy: [copy[y]!], shared: true });
    ai = x + 1;
    bi = y + 1;
  }
  while (ai < a.length && bi < b.length && a[ai] === b[bi]) match(ai, bi);
  let endA = a.length, endB = b.length;
  while (endA > ai && endB > bi && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const height = endA - ai, width = endB - bi;
  // Keep large rewrites responsive. Unmatched ranges remain intact and selectable.
  if (height && width && height * width <= 100_000) {
    const table = Array.from({ length: height + 1 }, () => new Uint32Array(width + 1));
    const startA = ai, startB = bi;
    for (let x = height - 1; x >= 0; x--) for (let y = width - 1; y >= 0; y--) {
      table[x]![y] = a[startA + x] === b[startB + y]
        ? 1 + table[x + 1]![y + 1]!
        : Math.max(table[x + 1]![y]!, table[x]![y + 1]!);
    }
    let x = 0, y = 0;
    while (x < height && y < width) {
      if (a[startA + x] === b[startB + y]) { match(startA + x, startB + y); x++; y++; }
      else if (table[x + 1]![y]! >= table[x]![y + 1]!) x++;
      else y++;
    }
  }
  while (endA < a.length) match(endA++, endB++);
  if (ai < a.length || bi < b.length) rows.push({ original: original.slice(ai), copy: copy.slice(bi), shared: false });
  return rows;
}

export function dailyComparisonBlocks(snapshot: DailySnapshot) {
  const nodes = dailyDocument(readDailyBody(snapshot.content, snapshot.checklist)).content;
  return nodes.length === 1 && !nodes[0]?.content?.length && nodes[0]?.type === 'paragraph' && !nodes[0]?.attrs?.listStyle ? [] : nodes;
}

export function compareDailyVersions(original: DailySnapshot, copy: DailySnapshot) {
  const originalNodes = dailyComparisonBlocks(original);
  const copyNodes = dailyComparisonBlocks(copy);
  const body = align(originalNodes, copyNodes, node => JSON.stringify(node));
  return {
    body: body.some(group => group.shared && group.original.some(node => comparisonLine(node).trim()))
      ? body : originalNodes.length || copyNodes.length ? [{ original: originalNodes, copy: copyNodes, shared: false }] : [],
    reflection: align(original.reflection ? original.reflection.split('\n') : [], copy.reflection ? copy.reflection.split('\n') : [], line => line),
  };
}

export function selectedParts<T>(group: Difference<T>, choice: Choice = 'both') {
  if (group.shared || choice === 'original') return group.original;
  if (choice === 'copy') return group.copy;
  return [...group.original, ...group.copy];
}

export function buildDailyMerge(comparison: ReturnType<typeof compareDailyVersions>, choices: Record<string, Choice>): DailySnapshot {
  const seen = new Set<string>();
  const nodes = comparison.body.flatMap((group, index) => selectedParts(group, choices[`body-${index}`])).map(node => {
    if (node.type === 'dailyMedia') {
      const key = String(node.attrs?.key);
      const result = seen.has(key) ? { ...node, attrs: { ...node.attrs, key: crypto.randomUUID() } } : node;
      seen.add(key);
      return result;
    }
    const content = node.content?.map(child => {
      if (child.type !== 'dailyCheckbox') return child;
      const id = String(child.attrs?.id);
      const result = seen.has(id) ? { ...child, attrs: { ...child.attrs, id: crypto.randomUUID() } } : child;
      seen.add(id);
      return result;
    });
    return { ...node, content };
  });
  const body = writeDailyDocument({ type: 'doc', content: nodes });
  return { ...body, reflection: comparison.reflection.flatMap((group, index) => selectedParts(group, choices[`reflection-${index}`])).join('\n') };
}

export function comparisonLine(node: JSONContent) {
  if (node.type === 'dailyMedia') return node.attrs?.kind === 'divider' ? '────────' : node.attrs?.label || (node.attrs?.kind === 'image' ? 'Photo' : node.attrs?.url || 'Media');
  const text = node.content?.map(child => child.type === 'dailyCheckbox' ? (child.attrs?.done ? '☑ ' : '☐ ') : child.type === 'hardBreak' ? '\n' : child.text ?? '').join('');
  const list = node.attrs?.listStyle;
  const number = Number(node.attrs?.listStart) || 1;
  return list ? `${listLabel(list, number)}. ${text ?? ''}` : text ?? '';
}
