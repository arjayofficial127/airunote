import type { AiruLens } from '@/lib/api/airunoteLensesApi';

export const LENS_TYPE_LABELS: Record<AiruLens['type'], string> = {
  box: 'Box', board: 'Board', canvas: 'Canvas', book: 'Book', study: 'Study', desktop: 'Desktop', saved: 'Saved',
};
export const LENS_DESCRIPTIONS: Record<AiruLens['type'], string> = {
  box: 'Browse notes and folders as a collection.',
  board: 'Move work through stages with a kanban board.',
  canvas: 'Arrange notes and folders on a visual workspace.',
  book: 'Capture, organize, plan, and write with context.',
  study: 'Read, connect, and edit notes in an outline.',
  desktop: 'Gather content across your workspace.',
  saved: 'Return to a saved selection of content.',
};

export function lensDisplayName(lens: AiruLens, lenses: AiruLens[]): string {
  const name = lens.name.trim() || LENS_TYPE_LABELS[lens.type];
  const matching = lenses.filter((item) => (item.name.trim() || LENS_TYPE_LABELS[item.type]).toLowerCase() === name.toLowerCase());
  return matching.length > 1 ? `${name} ${matching.findIndex((item) => item.id === lens.id) + 1}` : name;
}
