/**
 * SVG Editor Type Definitions
 * Centralized type definitions for the SVG editor component
 */

export interface SvgEditorElement {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'polyline' | 'text' | 'image';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: string;
  d?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  transform?: string;
  layerId: string;
  imageUrl?: string;
  // PHASE 2: Grouping support
  groupId?: string;
  // PHASE 3: Advanced styling
  fillGradient?: {
    type: 'linear' | 'radial';
    stops: Array<{ offset: number; color: string }>;
    x1?: number; y1?: number; x2?: number; y2?: number; // Linear gradient
    cx?: number; cy?: number; r?: number; // Radial gradient
  };
  strokeGradient?: {
    type: 'linear' | 'radial';
    stops: Array<{ offset: number; color: string }>;
    x1?: number; y1?: number; x2?: number; y2?: number;
    cx?: number; cy?: number; r?: number;
  };
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  filter?: string; // For shadows, blur, etc.
  mixBlendMode?: string;
}

export interface SvgEditorLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface SvgEditorData {
  width: number;
  height: number;
  elements: SvgEditorElement[];
  layers: SvgEditorLayer[];
  viewBox?: string;
}

export interface SvgEditorProps {
  initialSvg?: string;
  initialData?: SvgEditorData;
  width?: number;
  height?: number;
  title?: string;
  mode?: 'logo' | 'generic';
  readOnly?: boolean;
  initialTool?: Tool;
  onSave?: (svg: string, data: SvgEditorData) => void;
  onClose?: () => void;
  onExportSvg?: (svg: string) => void;
}

export type Tool = 'select' | 'pen' | 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'text' | 'image';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PathPoint {
  x: number;
  y: number;
  type: 'M' | 'L' | 'C' | 'Q';
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface Gradient {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
}

// PHASE 1: Command system for undo/redo
export interface Command {
  do: (doc: SvgEditorDocument) => SvgEditorDocument;
  undo: (doc: SvgEditorDocument) => SvgEditorDocument;
}

export interface SvgEditorDocument {
  elements: SvgEditorElement[];
  layers: SvgEditorLayer[];
}
