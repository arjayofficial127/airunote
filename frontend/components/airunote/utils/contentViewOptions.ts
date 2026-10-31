export type ContentFilter = 'all' | 'documents' | 'folders';
export type ContentSort = 'updated' | 'name' | 'created';

interface SortableContent {
  title?: string;
  name?: string;
  humanId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

function contentName(item: SortableContent): string {
  return item.title ?? item.name ?? item.humanId ?? '';
}

function timestamp(value: Date | string | undefined): number {
  if (!value) return 0;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

export function compareContentItems(a: SortableContent, b: SortableContent, sort: ContentSort): number {
  const names = contentName(a).localeCompare(contentName(b), undefined, { numeric: true, sensitivity: 'base' });
  if (sort === 'name') return names;
  const aDate = sort === 'created' ? a.createdAt : a.updatedAt ?? a.createdAt;
  const bDate = sort === 'created' ? b.createdAt : b.updatedAt ?? b.createdAt;
  return timestamp(bDate) - timestamp(aDate) || names;
}
