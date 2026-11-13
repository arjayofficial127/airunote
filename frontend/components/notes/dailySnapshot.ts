import type { AiruDocument } from '@/components/airunote/types';
import { readPlanning } from '@/lib/book';
import type { DailySnapshot } from './mergeDailyNote';

export const reflectionPrefix = 'Close the day\n';

export function savedSnapshot(document: AiruDocument): DailySnapshot | null {
  const planning = readPlanning(document.attributes);
  if (!planning) return null;
  return {
    checklist: planning.checklist,
    content: document.canonicalContent ?? document.content,
    reflection: planning.notes.find(note => note.text.startsWith(reflectionPrefix))?.text.slice(reflectionPrefix.length) ?? '',
  };
}
