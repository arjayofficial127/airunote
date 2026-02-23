/**
 * Lens Projection Helper
 * Builds structured projection data from folder children and lens items
 */

import type { AiruFolder, AiruDocumentMetadata } from '../types';
import type { AiruLensItem } from '@/lib/api/airunoteLensesApi';

export interface LensProjectionItem {
  entity: AiruFolder | AiruDocumentMetadata;
  item: AiruLensItem | null;
}

export interface BoardProjection {
  type: 'board';
  columns: Array<{
    id: string;
    title: string;
    description?: string | null;
    order: number;
    items: LensProjectionItem[];
  }>;
}

export interface CanvasProjection {
  type: 'canvas';
  items: Array<LensProjectionItem & {
    x: number;
    y: number;
  }>;
}

export interface BookProjection {
  type: 'book';
  items: Array<LensProjectionItem & {
    order: number;
  }>;
}

export type LensProjection = BoardProjection | CanvasProjection | BookProjection;

/**
 * Build lens projection from folder children and lens items
 */
export function buildLensProjection(
  children: {
    folders: AiruFolder[];
    documents: AiruDocumentMetadata[];
  },
  lensItems: AiruLensItem[],
  lensType: 'board' | 'canvas' | 'book'
): LensProjection {
  // Create a map of entityId -> lens item for quick lookup
  const itemsMap = new Map<string, AiruLensItem>();
  for (const item of lensItems) {
    itemsMap.set(item.entityId, item);
  }

  // Combine all children
  const allChildren: Array<AiruFolder | AiruDocumentMetadata> = [
    ...children.folders,
    ...children.documents,
  ];

  if (lensType === 'board') {
    // Group by columnId
    const columnsMap = new Map<string, LensProjectionItem[]>();

    for (const child of allChildren) {
      const item = itemsMap.get(child.id) || null;
      const columnId = item?.columnId || 'unassigned';
      
      if (!columnsMap.has(columnId)) {
        columnsMap.set(columnId, []);
      }
      columnsMap.get(columnId)!.push({ entity: child, item });
    }

    // Convert to array and sort by order
    const columns = Array.from(columnsMap.entries()).map(([id, items]) => ({
      id,
      title: id === 'unassigned' ? 'Unassigned' : id,
      description: null,
      order: items[0]?.item?.order || 0,
      items: items.sort((a, b) => {
        const orderA = a.item?.order ?? 0;
        const orderB = b.item?.order ?? 0;
        return orderA - orderB;
      }),
    }));

    return {
      type: 'board',
      columns: columns.sort((a, b) => a.order - b.order),
    };
  }

  if (lensType === 'canvas') {
    // Map items with x, y coordinates
    const items = allChildren.map((child) => {
      const item = itemsMap.get(child.id) || null;
      return {
        entity: child,
        item,
        x: item?.x ?? 0,
        y: item?.y ?? 0,
      };
    });

    return {
      type: 'canvas',
      items,
    };
  }

  if (lensType === 'book') {
    // Sort by order
    const items = allChildren
      .map((child) => {
        const item = itemsMap.get(child.id) || null;
        return {
          entity: child,
          item,
          order: item?.order ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      type: 'book',
      items,
    };
  }

  // Fallback (should not happen)
  return {
    type: 'book',
    items: [],
  };
}
