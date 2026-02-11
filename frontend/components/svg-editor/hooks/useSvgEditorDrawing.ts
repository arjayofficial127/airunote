/**
 * SVG Editor Drawing State Hook
 * Manages drawing tools, drawing state, and path editing
 */

import { useState, useCallback } from 'react';
import type { Tool, PathPoint, Point } from '../types/svgEditor.types';

export interface UseSvgEditorDrawingReturn {
  // Tool
  tool: Tool;
  setTool: (tool: Tool) => void;
  
  // Drawing state
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  drawingElementId: string | null;
  setDrawingElementId: (id: string | null) => void;
  drawStart: Point | null;
  setDrawStart: (point: Point | null) => void;
  
  // Pen tool
  currentPath: string;
  setCurrentPath: (path: string) => void;
  penPoints: Point[];
  setPenPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  
  // Polygon tool
  polygonPoints: Point[];
  setPolygonPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  
  // Path editing
  editingPathId: string | null;
  setEditingPathId: (id: string | null) => void;
  pathPoints: PathPoint[];
  setPathPoints: React.Dispatch<React.SetStateAction<PathPoint[]>>;
  
  // Helpers
  resetDrawing: () => void;
  resetPolygon: () => void;
}

export function useSvgEditorDrawing(): UseSvgEditorDrawingReturn {
  const [tool, setTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingElementId, setDrawingElementId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);

  const resetDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawingElementId(null);
    setDrawStart(null);
    setCurrentPath('');
    setPenPoints([]);
  }, []);

  const resetPolygon = useCallback(() => {
    setPolygonPoints([]);
    setIsDrawing(false);
    setDrawStart(null);
  }, []);

  return {
    tool,
    setTool,
    isDrawing,
    setIsDrawing,
    drawingElementId,
    setDrawingElementId,
    drawStart,
    setDrawStart,
    currentPath,
    setCurrentPath,
    penPoints,
    setPenPoints,
    polygonPoints,
    setPolygonPoints,
    editingPathId,
    setEditingPathId,
    pathPoints,
    setPathPoints,
    resetDrawing,
    resetPolygon,
  };
}
