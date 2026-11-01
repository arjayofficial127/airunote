import type { SVGProps } from 'react';

type Icon = 'folder' | 'home' | 'search' | 'sun' | 'moon' | 'more' | 'calendar' | 'note' | 'edit' | 'book' | 'canvas' | 'board' | 'study';
export const collectionIcon = { pages: 'book', canvas: 'canvas', board: 'board', study: 'study' } as const;
const paths: Record<Icon, string> = {
  book: 'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16',
  canvas: 'M3 3h18v18H3Zm3 4h6v6H6Zm8 5h4v6h-4Z',
  board: 'M3 3h18v18H3Zm6 0v18m6-18v18M5 7h2m4 4h2m4-4h2',
  study: 'm2 8 10-5 10 5-10 5L2 8Zm4 3v7c4 3 8 3 12 0v-7m4-3v10',
  folder: 'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 10h18',
  note: 'M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h6',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5',
};

export function NotesIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: Icon }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3.5 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
