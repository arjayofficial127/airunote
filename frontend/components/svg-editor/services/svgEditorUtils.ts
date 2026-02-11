/**
 * SVG Editor Utilities
 * Pure utility functions for calculations, transformations, and hit testing
 */

import type { SvgEditorElement, BoundingBox, Point, PathPoint } from '../types/svgEditor.types';

/**
 * Calculate bounding box for an element
 */
export function getElementBoundingBox(element: SvgEditorElement): BoundingBox | null {
  if (element.type === 'rect' && element.x !== undefined && element.y !== undefined && element.width && element.height) {
    return { x: element.x, y: element.y, width: element.width, height: element.height };
  }
  if (element.type === 'circle' && element.cx !== undefined && element.cy !== undefined && element.r) {
    return { x: element.cx - element.r, y: element.cy - element.r, width: element.r * 2, height: element.r * 2 };
  }
  if (element.type === 'ellipse' && element.cx !== undefined && element.cy !== undefined && element.rx && element.ry) {
    return { x: element.cx - element.rx, y: element.cy - element.ry, width: element.rx * 2, height: element.ry * 2 };
  }
  if (element.type === 'line' && element.x1 !== undefined && element.y1 !== undefined && element.x2 !== undefined && element.y2 !== undefined) {
    const minX = Math.min(element.x1, element.x2);
    const minY = Math.min(element.y1, element.y2);
    const maxX = Math.max(element.x1, element.x2);
    const maxY = Math.max(element.y1, element.y2);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  // PHASE 2: Calculate bounding box for polygon
  if (element.type === 'polygon' && element.points) {
    const points = element.points.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (points.length >= 4) {
      const xCoords = points.filter((_, i) => i % 2 === 0);
      const yCoords = points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xCoords);
      const minY = Math.min(...yCoords);
      const maxX = Math.max(...xCoords);
      const maxY = Math.max(...yCoords);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
  return null;
}

/**
 * Parse SVG path data to extract points
 */
export function parsePathData(d: string): PathPoint[] {
  const points: PathPoint[] = [];
  if (!d) return points;
  
  // Simple parser for M, L, C, Q commands
  const commands = d.match(/[MLCQ][^MLCQ]*/gi) || [];
  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase() as 'M' | 'L' | 'C' | 'Q';
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if (type === 'M' || type === 'L') {
      // Move or Line - take first two coordinates
      if (coords.length >= 2) {
        points.push({ x: coords[0], y: coords[1], type });
      }
    } else if (type === 'C') {
      // Cubic bezier - take last two coordinates (end point)
      if (coords.length >= 6) {
        points.push({ x: coords[4], y: coords[5], type });
      }
    } else if (type === 'Q') {
      // Quadratic bezier - take last two coordinates (end point)
      if (coords.length >= 4) {
        points.push({ x: coords[2], y: coords[3], type });
      }
    }
  });
  
  return points;
}

/**
 * Snap point to grid
 */
export function snapPoint(point: Point, snapToGrid: boolean, gridSize: number): Point {
  if (!snapToGrid) return point;
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Hit testing: Check if point is inside rectangle
 */
export function isPointInRect(point: Point, x: number, y: number, width: number, height: number): boolean {
  return point.x >= x && point.x <= x + width &&
         point.y >= y && point.y <= y + height;
}

/**
 * Hit testing: Check if point is inside circle
 */
export function isPointInCircle(point: Point, cx: number, cy: number, r: number): boolean {
  const dx = point.x - cx;
  const dy = point.y - cy;
  return Math.sqrt(dx * dx + dy * dy) <= r;
}

/**
 * Hit testing: Check if point is inside ellipse
 */
export function isPointInEllipse(point: Point, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * Hit testing: Check if point is on line (within tolerance)
 */
export function isPointOnLine(point: Point, x1: number, y1: number, x2: number, y2: number, tolerance: number = 5): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return false;
  
  const toPointX = point.x - x1;
  const toPointY = point.y - y1;
  const projection = (toPointX * dx + toPointY * dy) / (length * length);
  if (projection < 0 || projection > 1) return false;
  
  const projX = x1 + projection * dx;
  const projY = y1 + projection * dy;
  const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  return dist < tolerance;
}

/**
 * Hit testing: Check if point is inside polygon (point-in-polygon using ray casting)
 */
export function isPointInPolygon(point: Point, points: number[]): boolean {
  if (points.length < 6) return false; // Need at least 3 points (x, y pairs)
  
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const xi = points[i], yi = points[i + 1];
    const xj = points[j], yj = points[j + 1];
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Hit testing: Check if point hits an element
 */
export function hitTestElement(point: Point, element: SvgEditorElement): boolean {
  if (element.type === 'rect' && element.x !== undefined && element.y !== undefined && element.width && element.height) {
    return isPointInRect(point, element.x, element.y, element.width, element.height);
  }
  if (element.type === 'circle' && element.cx !== undefined && element.cy !== undefined && element.r) {
    return isPointInCircle(point, element.cx, element.cy, element.r);
  }
  if (element.type === 'ellipse' && element.cx !== undefined && element.cy !== undefined && element.rx && element.ry) {
    return isPointInEllipse(point, element.cx, element.cy, element.rx, element.ry);
  }
  if (element.type === 'line' && element.x1 !== undefined && element.y1 !== undefined && element.x2 !== undefined && element.y2 !== undefined) {
    return isPointOnLine(point, element.x1, element.y1, element.x2, element.y2, (element.strokeWidth || 2) + 5);
  }
  if (element.type === 'polygon' && element.points) {
    const points = element.points.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    return isPointInPolygon(point, points);
  }
  return false;
}

/**
 * Get SVG coordinates from mouse event
 * Note: This requires SVG element ref, zoom, and pan - should be called from component
 */
export function getSvgPointFromEvent(
  e: React.MouseEvent<SVGSVGElement> | MouseEvent,
  svgElement: SVGSVGElement | null,
  zoom: number,
  pan: Point
): Point {
  if (!svgElement) return { x: 0, y: 0 };
  const pt = svgElement.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgP = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
  return { x: svgP.x / zoom - pan.x, y: svgP.y / zoom - pan.y };
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Calculate center point of bounding box
 */
export function getBoundingBoxCenter(bbox: BoundingBox): Point {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}
