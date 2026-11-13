import type { DailyTask } from './dailyBody';

export type DailySnapshot = { checklist: DailyTask[]; content: string; reflection: string };

function sameTask(left: DailyTask | undefined, right: DailyTask | undefined) {
  return left === right || (!!left && !!right && left.id === right.id && left.text === right.text
    && left.done === right.done && left.dueDate === right.dueDate);
}

export function sameDailyChecklist(left: DailyTask[], right: DailyTask[]) {
  return left.length === right.length && left.every((task, index) => sameTask(task, right[index]));
}

function changedRange(base: string, changed: string) {
  let from = 0;
  while (from < base.length && from < changed.length && base[from] === changed[from]) from++;
  let to = base.length;
  let end = changed.length;
  while (to > from && end > from && base[to - 1] === changed[end - 1]) { to--; end--; }
  return { from, to, text: changed.slice(from, end) };
}

function mergeText(base: string, saved: string, draft: string) {
  if (base === saved || saved === draft) return draft;
  if (base === draft) return saved;
  const local = changedRange(base, draft);
  const remote = changedRange(base, saved);
  if (local.from === remote.from && local.from === local.to && remote.from === remote.to) {
    // Preserve independently appended paragraphs, while keeping overlapping inline edits for review.
    if (local.from === base.length && local.text.startsWith('\n') && remote.text.startsWith('\n')) return base + remote.text + local.text;
    return null;
  }
  const [first, last] = [local, remote].sort((left, right) => left.from - right.from || left.to - right.to) as [typeof local, typeof remote];
  if (first.to > last.from) return null;
  return base.slice(0, first.from) + first.text + base.slice(first.to, last.from) + last.text + base.slice(last.to);
}

function mergeChecklist(base: DailyTask[], saved: DailyTask[], draft: DailyTask[]) {
  const maps = [base, saved, draft].map(list => new Map(list.map(task => [task.id, task])));
  const [original, remote, local] = maps as [Map<string, DailyTask>, Map<string, DailyTask>, Map<string, DailyTask>];
  const merged: DailyTask[] = [];
  for (const id of new Set([...local.keys(), ...remote.keys()])) {
    const before = original.get(id);
    const savedTask = remote.get(id);
    const draftTask = local.get(id);
    const remoteChanged = !sameTask(savedTask, before);
    const localChanged = !sameTask(draftTask, before);
    if (remoteChanged && localChanged && !sameTask(savedTask, draftTask)) {
      if (!before || !savedTask || !draftTask) return null;
      const text = mergeText(before.text, savedTask.text, draftTask.text);
      if (text === null || (savedTask.dueDate !== before.dueDate && draftTask.dueDate !== before.dueDate && savedTask.dueDate !== draftTask.dueDate)) return null;
      const dueDate = savedTask.dueDate === before.dueDate ? draftTask.dueDate : savedTask.dueDate;
      const done = savedTask.done === before.done ? draftTask.done : savedTask.done;
      merged.push({ id, text, done, ...(dueDate ? { dueDate } : {}) });
      continue;
    }
    const task = remoteChanged ? savedTask : draftTask;
    if (task) merged.push(task);
  }
  return merged.length <= 200 ? merged : null;
}

export function mergeDailyNote(base: DailySnapshot, saved: DailySnapshot, draft: DailySnapshot): DailySnapshot | null {
  const content = mergeText(base.content, saved.content, draft.content);
  const reflection = mergeText(base.reflection, saved.reflection, draft.reflection);
  const checklist = mergeChecklist(base.checklist, saved.checklist, draft.checklist);
  return content === null || reflection === null || checklist === null ? null : { checklist, content, reflection };
}
