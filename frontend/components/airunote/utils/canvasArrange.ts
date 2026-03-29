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

export interface CanvasArrangeOptions {
  viewportWidth?: number;
  viewportHeight?: number;
}


interface LayoutFrame {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

interface ItemFootprint {
  width: number;
  height: number;
}

interface GridLayoutConfig {
  minColumns: number;
  maxColumns: number;
  minGapX: number;
  maxGapX: number;
  gapY: number;
}

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const DEFAULT_ORIGIN_X = 56;
const DEFAULT_ORIGIN_Y = 80;
const MIN_LAYOUT_WIDTH = 640;
const MIN_LAYOUT_HEIGHT = 520;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
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

function getFootprint(viewMode: ViewMode): ItemFootprint {
  switch (viewMode) {
    case 'icon':
      return { width: 148, height: 136 };
    case 'preview':
      return { width: 248, height: 236 };
    case 'full':
      return { width: 344, height: 348 };
    case 'list':
    default:
      return { width: 216, height: 104 };
  }
}

function resolveLayoutFrame(options?: CanvasArrangeOptions): LayoutFrame {
  const viewportWidth = Math.max(options?.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH, MIN_LAYOUT_WIDTH);
  const viewportHeight = Math.max(options?.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT, MIN_LAYOUT_HEIGHT);
  const horizontalPadding = clamp(round(viewportWidth * 0.045), DEFAULT_ORIGIN_X, 96);
  const verticalPadding = clamp(round(viewportHeight * 0.07), DEFAULT_ORIGIN_Y, 112);

  return {
    originX: horizontalPadding,
    originY: verticalPadding,
    width: Math.max(viewportWidth - horizontalPadding * 2, MIN_LAYOUT_WIDTH - DEFAULT_ORIGIN_X * 2),
    height: Math.max(viewportHeight - verticalPadding * 2, MIN_LAYOUT_HEIGHT - DEFAULT_ORIGIN_Y * 2),
  };
}

function buildTargetModes(items: CanvasArrangeItem[], preset: CanvasArrangePreset): Map<string, ViewMode> {
  return new Map<string, ViewMode>(
    items.map((item) => [item.id, getTargetViewMode(preset, item.type)])
  );
}

function buildAdaptiveGridLayout(
  items: CanvasArrangeItem[],
  targetModes: Map<string, ViewMode>,
  frame: LayoutFrame,
  config: GridLayoutConfig
): Map<string, CanvasArrangeState> {
  const nextStates = new Map<string, CanvasArrangeState>();

  if (items.length === 0) {
    return nextStates;
  }

  const cellWidths = items.map((item) => getFootprint(targetModes.get(item.id) ?? 'list').width);
  const maxCellWidth = Math.max(...cellWidths);
  const idealColumns = Math.floor((frame.width + config.minGapX) / (maxCellWidth + config.minGapX));
  const columns = clamp(idealColumns, config.minColumns, Math.min(config.maxColumns, items.length));
  const usableColumns = Math.max(columns, 1);
  const computedGapX = usableColumns > 1
    ? Math.floor((frame.width - usableColumns * maxCellWidth) / (usableColumns - 1))
    : 0;
  const gapX = clamp(computedGapX, config.minGapX, config.maxGapX);
  const totalRowWidth = usableColumns * maxCellWidth + (usableColumns - 1) * gapX;
  const startX = frame.originX + Math.max(0, Math.floor((frame.width - totalRowWidth) / 2));

  let currentX = startX;
  let currentY = frame.originY;
  let rowHeight = 0;

  items.forEach((item, index) => {
    const viewMode = targetModes.get(item.id) ?? 'list';
    const footprint = getFootprint(viewMode);
    const column = index % usableColumns;

    if (column === 0 && index > 0) {
      currentX = startX;
      currentY += rowHeight + config.gapY;
      rowHeight = 0;
    }

    nextStates.set(item.id, {
      id: item.id,
      x: currentX,
      y: currentY,
      viewMode,
    });

    rowHeight = Math.max(rowHeight, footprint.height);
    currentX += maxCellWidth + gapX;
  });

  return nextStates;
}

function buildAdaptiveReadingLayout(
  items: CanvasArrangeItem[],
  targetModes: Map<string, ViewMode>,
  frame: LayoutFrame
): Map<string, CanvasArrangeState> {
  const nextStates = new Map<string, CanvasArrangeState>();
  const folders = items.filter((item) => item.type === 'folder');
  const documents = items.filter((item) => item.type === 'document');

  if (documents.length === 0) {
    return buildAdaptiveGridLayout(items, targetModes, frame, {
      minColumns: 1,
      maxColumns: 3,
      minGapX: 20,
      maxGapX: 36,
      gapY: 24,
    });
  }

  const documentFootprint = getFootprint('full');
  const folderFootprint = getFootprint('list');
  const columnGap = clamp(round(frame.width * 0.035), 24, 44);
  const railGap = clamp(round(frame.width * 0.03), 28, 40);
  const stackGapY = clamp(round(frame.height * 0.02), 16, 28);

  const canUseTwoDocumentColumns =
    documents.length > 1 && frame.width >= documentFootprint.width * 2 + columnGap + 40;
  const canUseFolderRail =
    folders.length > 0 &&
    frame.width >=
      (canUseTwoDocumentColumns ? documentFootprint.width * 2 + columnGap : documentFootprint.width) +
        folderFootprint.width +
        railGap +
        40;

  const documentColumns = canUseTwoDocumentColumns ? 2 : 1;
  const documentAreaWidth = canUseFolderRail
    ? frame.width - folderFootprint.width - railGap
    : frame.width;
  const documentColumnWidth = Math.max(
    documentFootprint.width,
    Math.floor((documentAreaWidth - columnGap * (documentColumns - 1)) / documentColumns)
  );
  const totalDocumentWidth = documentColumnWidth * documentColumns + columnGap * (documentColumns - 1);
  const documentStartX = frame.originX + Math.max(0, Math.floor((documentAreaWidth - totalDocumentWidth) / 2));
  const documentColumnXs = Array.from({ length: documentColumns }, (_, index) => documentStartX + index * (documentColumnWidth + columnGap));
  const documentColumnHeights = Array.from({ length: documentColumns }, () => frame.originY);

  documents.forEach((item) => {
    const viewMode = targetModes.get(item.id) ?? 'full';
    const footprint = getFootprint(viewMode);
    const targetColumnIndex = documentColumnHeights[0] <= documentColumnHeights[documentColumns - 1]
      ? documentColumnHeights.indexOf(Math.min(...documentColumnHeights))
      : 0;

    nextStates.set(item.id, {
      id: item.id,
      x: documentColumnXs[targetColumnIndex],
      y: documentColumnHeights[targetColumnIndex],
      viewMode,
    });

    documentColumnHeights[targetColumnIndex] += footprint.height + stackGapY;
  });

  if (canUseFolderRail) {
    const folderRailX = documentStartX + totalDocumentWidth + railGap;
    let folderCursorY = frame.originY;

    folders.forEach((item) => {
      const viewMode = targetModes.get(item.id) ?? 'list';
      const footprint = getFootprint(viewMode);

      nextStates.set(item.id, {
        id: item.id,
        x: folderRailX,
        y: folderCursorY,
        viewMode,
      });

      folderCursorY += footprint.height + 16;
    });

    return nextStates;
  }

  if (folders.length > 0) {
    const folderFrame: LayoutFrame = {
      originX: frame.originX,
      originY: Math.max(...documentColumnHeights) + 20,
      width: frame.width,
      height: Math.max(frame.height - (Math.max(...documentColumnHeights) - frame.originY), 220),
    };

    const folderStates = buildAdaptiveGridLayout(folders, targetModes, folderFrame, {
      minColumns: 1,
      maxColumns: 3,
      minGapX: 16,
      maxGapX: 28,
      gapY: 20,
    });

    folderStates.forEach((state, itemId) => {
      nextStates.set(itemId, state);
    });
  }

  return nextStates;
}

export function computeCanvasArrangement(
  preset: CanvasArrangePreset,
  items: CanvasArrangeItem[],
  options?: CanvasArrangeOptions
): Map<string, CanvasArrangeState> {
  const targetModes = buildTargetModes(items, preset);
  const frame = resolveLayoutFrame(options);

  switch (preset) {
    case 'compact-grid':
      return buildAdaptiveGridLayout(items, targetModes, frame, {
        minColumns: 3,
        maxColumns: 8,
        minGapX: 12,
        maxGapX: 24,
        gapY: 18,
      });
    case 'preview-wall':
      return buildAdaptiveGridLayout(items, targetModes, frame, {
        minColumns: 2,
        maxColumns: 5,
        minGapX: 20,
        maxGapX: 36,
        gapY: 28,
      });
    case 'full-reading-layout':
      return buildAdaptiveReadingLayout(items, targetModes, frame);
    case 'tidy-grid':
    default:
      return buildAdaptiveGridLayout(items, targetModes, frame, {
        minColumns: 2,
        maxColumns: 5,
        minGapX: 18,
        maxGapX: 34,
        gapY: 24,
      });
  }
}
