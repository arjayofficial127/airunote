import type { ViewMode } from '@/lib/api/airunoteLensesApi';

export type CanvasArrangePreset =
  | 'tidy-grid'
  | 'compact-grid'
  | 'preview-wall'
  | 'full-reading-layout';

export const CANVAS_ARRANGE_OPTIONS: Array<{
  preset: CanvasArrangePreset;
  label: string;
}> = [
  { preset: 'tidy-grid', label: 'Tidy Grid' },
  { preset: 'compact-grid', label: 'Compact Grid' },
  { preset: 'preview-wall', label: 'Preview Wall' },
  { preset: 'full-reading-layout', label: 'Full Reading Layout' },
];

export interface CanvasArrangeItem {
  id: string;
  type: 'document' | 'folder';
}

export interface CanvasArrangeState {
  id: string;
  x: number;
  y: number;
  viewMode: ViewMode;
}

function getTargetViewMode(preset: CanvasArrangePreset, itemType: CanvasArrangeItem['type']): ViewMode {
  switch (preset) {
    case 'tidy-grid':
      return 'list';
    case 'compact-grid':
      return 'icon';
    case 'preview-wall':
      return itemType === 'document' ? 'preview' : 'icon';
    case 'full-reading-layout':
      return itemType === 'document' ? 'full' : 'list';
    default:
      return 'list';
  }
}

function getFootprint(viewMode: ViewMode): { width: number; height: number } {
  switch (viewMode) {
    case 'icon':
      return { width: 140, height: 120 };
    case 'preview':
      return { width: 260, height: 190 };
    case 'full':
      return { width: 360, height: 320 };
    case 'list':
    default:
      return { width: 220, height: 88 };
  }
}

function buildGridLayout(
  items: CanvasArrangeItem[],
  targetModes: Map<string, ViewMode>,
  columns: number,
  originX: number,
  originY: number,
  gapX: number,
  gapY: number
): Map<string, CanvasArrangeState> {
  const nextStates = new Map<string, CanvasArrangeState>();

  items.forEach((item, index) => {
    const viewMode = targetModes.get(item.id) ?? 'list';
    const column = index % columns;
    const row = Math.floor(index / columns);

    nextStates.set(item.id, {
      id: item.id,
      x: originX + column * gapX,
      y: originY + row * gapY,
      viewMode,
    });
  });

  return nextStates;
}

function buildReadingLayout(
  items: CanvasArrangeItem[],
  targetModes: Map<string, ViewMode>,
  originX: number,
  originY: number,
  gapY: number
): Map<string, CanvasArrangeState> {
  const nextStates = new Map<string, CanvasArrangeState>();
  const folders = items.filter((item) => item.type === 'folder');
  const documents = items.filter((item) => item.type === 'document');
  const documentColumnXs = [originX, originX + 396];
  const folderRailX = originX + 812;
  const documentColumnHeights = [originY, originY];
  let folderCursorY = originY;

  documents.forEach((item) => {
    const viewMode = targetModes.get(item.id) ?? 'full';
    const footprint = getFootprint(viewMode);
    const targetColumnIndex = documentColumnHeights[0] <= documentColumnHeights[1] ? 0 : 1;

    nextStates.set(item.id, {
      id: item.id,
      x: documentColumnXs[targetColumnIndex],
      y: documentColumnHeights[targetColumnIndex],
      viewMode,
    });

    documentColumnHeights[targetColumnIndex] += footprint.height + gapY;
  });

  folders.forEach((item) => {
    const viewMode = targetModes.get(item.id) ?? 'list';
    const footprint = getFootprint(viewMode);

    nextStates.set(item.id, {
      id: item.id,
      x: folderRailX,
      y: folderCursorY,
      viewMode,
    });

    folderCursorY += footprint.height + 20;
  });

  const unplacedItems = items.filter((item) => !nextStates.has(item.id));
  let fallbackCursorY = Math.max(...documentColumnHeights, folderCursorY, originY);

  unplacedItems.forEach((item) => {
    const viewMode = targetModes.get(item.id) ?? 'list';
    const footprint = getFootprint(viewMode);

    nextStates.set(item.id, {
      id: item.id,
      x: originX,
      y: fallbackCursorY,
      viewMode,
    });

    fallbackCursorY += footprint.height + gapY;
  });

  return nextStates;
}

export function computeCanvasArrangement(
  preset: CanvasArrangePreset,
  items: CanvasArrangeItem[]
): Map<string, CanvasArrangeState> {
  const targetModes = new Map<string, ViewMode>(
    items.map((item) => [item.id, getTargetViewMode(preset, item.type)])
  );

  switch (preset) {
    case 'compact-grid':
      return buildGridLayout(items, targetModes, 5, 48, 72, 152, 132);
    case 'preview-wall':
      return buildGridLayout(items, targetModes, 3, 56, 84, 286, 222);
    case 'full-reading-layout':
      return buildReadingLayout(items, targetModes, 72, 84, 28);
    case 'tidy-grid':
    default:
      return buildGridLayout(items, targetModes, 3, 56, 80, 236, 132);
  }
}