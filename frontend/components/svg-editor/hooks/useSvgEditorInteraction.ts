/**
 * SVG Editor Interaction State Hook
 * Manages drag, resize, pan, zoom, selection box, and smart guides
 */

import { useState } from 'react';
import type { Point, SvgEditorElement } from '../types/svgEditor.types';

export interface UseSvgEditorInteractionReturn {
  // Drag
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  dragOffset: Point | null;
  setDragOffset: (offset: Point | null) => void;
  dragStartElement: SvgEditorElement | null;
  setDragStartElement: (element: SvgEditorElement | null) => void;
  
  // Resize
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  resizeHandle: string | null;
  setResizeHandle: (handle: string | null) => void;
  resizeStartElement: SvgEditorElement | null;
  setResizeStartElement: (element: SvgEditorElement | null) => void;
  
  // Pan
  isPanning: boolean;
  setIsPanning: (panning: boolean) => void;
  panStart: Point | null;
  setPanStart: (point: Point | null) => void;
  spacePressed: boolean;
  setSpacePressed: (pressed: boolean) => void;
  
  // Zoom & Pan
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: Point;
  setPan: React.Dispatch<React.SetStateAction<Point>>;
  
  // Selection box
  isSelectionBox: boolean;
  setIsSelectionBox: (isSelectionBox: boolean) => void;
  selectionBoxStart: Point | null;
  setSelectionBoxStart: (point: Point | null) => void;
  selectionBoxEnd: Point | null;
  setSelectionBoxEnd: (point: Point | null) => void;
  
  // Smart guides
  smartGuides: Array<{ type: 'horizontal' | 'vertical'; position: number }>;
  setSmartGuides: React.Dispatch<React.SetStateAction<Array<{ type: 'horizontal' | 'vertical'; position: number }>>>;
  
  // Groups
  groups: Map<string, string[]>;
  setGroups: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
  draggedLayerId: string | null;
  setDraggedLayerId: (id: string | null) => void;
}

export function useSvgEditorInteraction(): UseSvgEditorInteractionReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [dragStartElement, setDragStartElement] = useState<SvgEditorElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartElement, setResizeStartElement] = useState<SvgEditorElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isSelectionBox, setIsSelectionBox] = useState(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<Point | null>(null);
  const [smartGuides, setSmartGuides] = useState<Array<{ type: 'horizontal' | 'vertical'; position: number }>>([]);
  const [groups, setGroups] = useState<Map<string, string[]>>(new Map());
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  return {
    isDragging,
    setIsDragging,
    dragOffset,
    setDragOffset,
    dragStartElement,
    setDragStartElement,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    resizeStartElement,
    setResizeStartElement,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    spacePressed,
    setSpacePressed,
    zoom,
    setZoom,
    pan,
    setPan,
    isSelectionBox,
    setIsSelectionBox,
    selectionBoxStart,
    setSelectionBoxStart,
    selectionBoxEnd,
    setSelectionBoxEnd,
    smartGuides,
    setSmartGuides,
    groups,
    setGroups,
    draggedLayerId,
    setDraggedLayerId,
  };
}
