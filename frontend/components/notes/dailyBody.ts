import type { BookPlanning } from '@/lib/book';

export type DailyTask = BookPlanning['checklist'][number];
export type DailyMedia = 'image' | 'link' | 'video' | 'divider';
export type DailyBlock =
  | { kind: 'text'; key: string; text: string }
  | { kind: 'task'; key: string; task: DailyTask }
  | { kind: DailyMedia; key: string; url: string; label: string };

const taskLine = /^- \[([ x])\] (.*)$/;
const linkLine = /^\[\/\/\]: # \(airunote-daily:([a-f\d-]{36})(?::(image|link|video|divider))?\)$/i;
const mediaLine = /^!?\[(.*)\]\(<([^>]+)>\)$/;
const photoData = /^data:image\/(?:jpeg|png|gif|webp);base64,[a-z0-9+/=]+$/i;

export function safeDailyUrl(value: string, localImage = false) {
  if (localImage && photoData.test(value)) return value;
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch { /* Expected when the URL is incomplete. */ }
  return null;
}

export function youtubeId(value: string) {
  const url = safeDailyUrl(value);
  if (!url) return null;
  const { hostname, pathname, searchParams } = new URL(url);
  const [, first, second] = pathname.split('/');
  const id = hostname === 'youtu.be' ? first :
    ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(hostname)
      ? first === 'watch' ? searchParams.get('v') : ['shorts', 'embed', 'live'].includes(first ?? '') ? second : null
      : null;
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function readDailyBody(content: string, checklist: DailyTask[]): DailyBlock[] {
  const blocks: DailyBlock[] = [];
  const byId = new Map(checklist.map(task => [task.id, task]));
  const seen = new Set<string>();
  const lines = content.split('\n');
  let text: string[] = [];
  function flushText() {
    if (text.length) blocks.push({ kind: 'text', key: `text:${blocks.length}`, text: text.join('\n') });
    text = [];
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const markerIndex = lines[index + 1] === '' ? index + 2 : index + 1;
    const marker = linkLine.exec(lines[markerIndex] ?? '');
    const id = marker?.[1];
    const kind = marker?.[2] as DailyMedia | undefined;
    const task = kind ? null : taskLine.exec(line);
    const media = kind && kind !== 'divider' ? mediaLine.exec(line) : null;
    const url = media && safeDailyUrl(media[2]!, kind === 'image');
    let block: DailyBlock | undefined;
    if (id && !seen.has(id)) {
      if (task) block = { kind: 'task', key: id, task: byId.get(id) ?? { id, text: task[2]!, done: task[1] === 'x' } };
      else if (kind === 'divider' && line === '---') block = { kind, key: id, label: '', url: '' };
      else if (kind && media && url) block = { kind, key: id, label: media[1]!.replace(/\\([\\\[\]])/g, '$1'), url };
    }
    if (!block) { text.push(line); continue; }
    if (text.at(-1) === '') text.pop();
    flushText();
    seen.add(block.key);
    blocks.push(block);
    index = markerIndex;
    if (lines[index + 1] === '') index++;
  }
  flushText();
  for (const task of checklist) if (!seen.has(task.id)) blocks.push({ kind: 'task', key: task.id, task });
  return blocks.length ? blocks : [{ kind: 'text', key: 'text:0', text: '' }];
}

export function writeDailyBody(blocks: DailyBlock[]) {
  const checklist: DailyTask[] = [];
  const body: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'text') {
      if (block.text) body.push(block.text);
    } else if (block.kind === 'task') {
      const text = block.task.text.trim();
      if (!text) continue;
      checklist.push({ ...block.task, text });
      body.push(`- [${block.task.done ? 'x' : ' '}] ${text.replace(/\r?\n/g, ' ')}\n\n[//]: # (airunote-daily:${block.task.id})`);
    } else {
      const label = block.label.replace(/([\\\[\]])/g, '\\$1').replace(/\r?\n/g, ' ');
      const url = block.url.replace(/</g, '%3C').replace(/>/g, '%3E');
      const markup = block.kind === 'divider' ? '---' : `${block.kind === 'image' ? '!' : ''}[${label}](<${url}>)`;
      body.push(`${markup}\n\n[//]: # (airunote-daily:${block.key}:${block.kind})`);
    }
  }
  return { content: body.join('\n\n'), checklist };
}
