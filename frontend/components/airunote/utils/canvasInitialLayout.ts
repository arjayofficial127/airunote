interface CanvasPlacementCandidate {
  id: string;
  width: number;
  height: number;
  x?: number | null;
  y?: number | null;
}
interface CanvasPosition { x: number; y: number }
interface CanvasRectangle extends CanvasPosition { width: number; height: number }

function hasPosition(item: CanvasPlacementCandidate): item is CanvasPlacementCandidate & CanvasPosition {
  return typeof item.x === 'number' && Number.isFinite(item.x) && typeof item.y === 'number' && Number.isFinite(item.y);
}
function overlaps(a: CanvasRectangle, b: CanvasRectangle): boolean {
  const gap = 24;
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/** Existing coordinates are authoritative. New cards get stable, collision-free slots. */
export function initialCanvasPositions(items: CanvasPlacementCandidate[]): Map<string, CanvasPosition> {
  const result = new Map<string, CanvasPosition>();
  const occupied: CanvasRectangle[] = [];
  items.filter(hasPosition).forEach((item) => {
    const position = { x: Math.max(0, Math.round(item.x)), y: Math.max(0, Math.round(item.y)) };
    result.set(item.id, position);
    occupied.push({ ...position, width: item.width, height: item.height });
  });
  const cellWidth = Math.max(216, ...items.map((item) => item.width)) + 32;
  const cellHeight = Math.max(98, ...items.map((item) => item.height)) + 32;
  items.filter((item) => !hasPosition(item)).forEach((item) => {
    let slot = 0;
    let candidate: CanvasRectangle;
    do {
      candidate = { x: 40 + (slot % 3) * cellWidth, y: 72 + Math.floor(slot / 3) * cellHeight, width: item.width, height: item.height };
      slot += 1;
    } while (occupied.some((rectangle) => overlaps(candidate, rectangle)));
    occupied.push(candidate);
    result.set(item.id, { x: candidate.x, y: candidate.y });
  });
  return result;
}
