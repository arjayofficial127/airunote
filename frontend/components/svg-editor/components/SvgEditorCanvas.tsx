/**
 * SVG Editor Canvas Component
 * Handles SVG rendering, selection, resize handles, and interactive elements
 */

'use client';

import React, { useMemo } from 'react';
import type { 
  SvgEditorElement, 
  SvgEditorLayer, 
  Tool, 
  Point, 
  PathPoint 
} from '../types/svgEditor.types';
import { getElementBoundingBox } from '../services/svgEditorUtils';

interface SvgEditorCanvasProps {
  svgRef: React.RefObject<SVGSVGElement>;
  canvasRef: React.RefObject<HTMLDivElement>;
  width: number;
  height: number;
  zoom: number;
  pan: Point;
  elements: SvgEditorElement[];
  layers: SvgEditorLayer[];
  selectedElementId: string | null;
  selectedElementIds: Set<string>;
  tool: Tool;
  snapToGrid: boolean;
  gridSize: number;
  isPanning: boolean;
  spacePressed: boolean;
  polygonPoints: Point[];
  isSelectionBox: boolean;
  selectionBoxStart: Point | null;
  selectionBoxEnd: Point | null;
  editingPathId: string | null;
  pathPoints: PathPoint[];
  smartGuides: Array<{ type: 'horizontal' | 'vertical'; position: number }>;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
  blurRadius: number;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  onElementClick: (elementId: string) => void;
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: string, elementId: string) => void;
}

export function SvgEditorCanvas({
  svgRef,
  canvasRef,
  width,
  height,
  zoom,
  pan,
  elements,
  layers,
  selectedElementId,
  selectedElementIds,
  tool,
  snapToGrid,
  gridSize,
  isPanning,
  spacePressed,
  polygonPoints,
  isSelectionBox,
  selectionBoxStart,
  selectionBoxEnd,
  editingPathId,
  pathPoints,
  smartGuides,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  shadowColor,
  blurRadius,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onElementClick,
  onResizeHandleMouseDown,
}: SvgEditorCanvasProps) {
  
  // Render a single element
  const renderElement = useMemo(() => {
    const RenderElement = (element: SvgEditorElement) => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer?.visible) return null;

      const isSelected = element.id === selectedElementId;
      
      // PHASE 3: Build fill (gradient or solid color)
      let fillValue = element.fill;
      if (element.fillGradient) {
        const gradientId = `gradient-${element.id}-fill`;
        fillValue = `url(#${gradientId})`;
      }
      
      // PHASE 3: Build stroke (gradient or solid color)
      let strokeValue = isSelected ? '#16a34a' : element.stroke;
      if (element.strokeGradient && !isSelected) {
        const gradientId = `gradient-${element.id}-stroke`;
        strokeValue = `url(#${gradientId})`;
      }
      
      // PHASE 3: Build filter (for shadows and blur)
      let filterValue = undefined;
      if (element.filter) {
        filterValue = `url(#filter-${element.id})`;
      }
      
      const commonProps = {
        key: element.id,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onElementClick(element.id);
        },
        style: {
          cursor: 'pointer',
          opacity: element.opacity !== undefined ? element.opacity * layer.opacity : layer.opacity,
          mixBlendMode: (element.mixBlendMode || 'normal') as React.CSSProperties['mixBlendMode'],
        },
        stroke: strokeValue,
        strokeWidth: isSelected ? (element.strokeWidth || 2) + 2 : element.strokeWidth,
        fill: fillValue,
        strokeDasharray: element.strokeDasharray,
        strokeLinecap: element.strokeLinecap,
        strokeLinejoin: element.strokeLinejoin,
        filter: filterValue,
      };

      switch (element.type) {
        case 'rect':
          return (
            <rect
              {...commonProps}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              transform={element.transform}
            />
          );
        case 'circle':
          return (
            <circle
              {...commonProps}
              cx={element.cx}
              cy={element.cy}
              r={element.r}
              transform={element.transform}
            />
          );
        case 'ellipse':
          return (
            <ellipse
              {...commonProps}
              cx={element.cx}
              cy={element.cy}
              rx={element.rx}
              ry={element.ry}
              transform={element.transform}
            />
          );
        case 'line':
          return (
            <line
              {...commonProps}
              x1={element.x1}
              y1={element.y1}
              x2={element.x2}
              y2={element.y2}
              transform={element.transform}
            />
          );
        case 'polygon':
          return (
            <polygon
              {...commonProps}
              points={element.points || ''}
              transform={element.transform}
            />
          );
        case 'path':
          return (
            <path
              {...commonProps}
              d={element.d}
              transform={element.transform}
            />
          );
        case 'text':
          return (
            <text
              {...commonProps}
              x={element.x}
              y={element.y}
              fontSize={element.fontSize}
              fontFamily={element.fontFamily}
              transform={element.transform}
            >
              {element.text}
            </text>
          );
        case 'image':
          return (
            <image
              {...commonProps}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              href={element.imageUrl}
              transform={element.transform}
            />
          );
        default:
          return null;
      }
    };
    RenderElement.displayName = 'RenderElement';
    return RenderElement;
  }, [layers, selectedElementId, onElementClick]);

  // Render resize handles for selected element
  const renderResizeHandles = (element: SvgEditorElement) => {
    const bbox = getElementBoundingBox(element);
    if (!bbox) return null;

    const handles = [
      { id: 'nw', x: bbox.x, y: bbox.y },
      { id: 'ne', x: bbox.x + bbox.width, y: bbox.y },
      { id: 'sw', x: bbox.x, y: bbox.y + bbox.height },
      { id: 'se', x: bbox.x + bbox.width, y: bbox.y + bbox.height },
      { id: 'n', x: bbox.x + bbox.width / 2, y: bbox.y },
      { id: 's', x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height },
      { id: 'e', x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 },
      { id: 'w', x: bbox.x, y: bbox.y + bbox.height / 2 },
    ];

    return (
      <g key={`handles-${element.id}`}>
        {handles.map(handle => (
          <rect
            key={handle.id}
            x={handle.x - 4}
            y={handle.y - 4}
            width={8}
            height={8}
            fill="#16a34a"
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: `${handle.id}-resize`, pointerEvents: 'all' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeHandleMouseDown(e, handle.id, element.id);
            }}
          />
        ))}
      </g>
    );
  };

  // Render selection outline
  const renderSelectionOutline = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return null;
    const bbox = getElementBoundingBox(element);
    if (!bbox) return null;
    const isPrimary = elementId === selectedElementId;

    return (
      <g key={`selection-${elementId}`}>
        <rect
          x={bbox.x - 2}
          y={bbox.y - 2}
          width={bbox.width + 4}
          height={bbox.height + 4}
          fill="none"
          stroke="#16a34a"
          strokeWidth={isPrimary ? 2 : 1}
          strokeDasharray="4 4"
          pointerEvents="none"
        />
        {isPrimary && renderResizeHandles(element)}
      </g>
    );
  };

  return (
    <div className="flex-1 relative bg-gray-100 overflow-auto" ref={canvasRef}>
      <div className="p-8 flex items-center justify-center min-h-full">
        <svg
          ref={svgRef}
          width={width * zoom}
          height={height * zoom}
          viewBox={`${pan.x} ${pan.y} ${width / zoom} ${height / zoom}`}
          className="bg-white shadow-lg"
          style={{ 
            border: '1px solid #e5e7eb', 
            cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'default',
            minWidth: '100%',
            minHeight: '100%'
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
            
            {/* PHASE 3: Gradients and filters for elements */}
            {elements.map(element => {
              const defs: JSX.Element[] = [];
              
              // Fill gradient
              if (element.fillGradient) {
                const gradientId = `gradient-${element.id}-fill`;
                const bbox = getElementBoundingBox(element);
                if (bbox) {
                  if (element.fillGradient.type === 'linear') {
                    defs.push(
                      <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {element.fillGradient.stops.map((stop, i) => (
                          <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                        ))}
                      </linearGradient>
                    );
                  } else {
                    defs.push(
                      <radialGradient key={gradientId} id={gradientId} cx="50%" cy="50%" r="50%">
                        {element.fillGradient.stops.map((stop, i) => (
                          <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                        ))}
                      </radialGradient>
                    );
                  }
                }
              }
              
              // Stroke gradient
              if (element.strokeGradient) {
                const gradientId = `gradient-${element.id}-stroke`;
                const bbox = getElementBoundingBox(element);
                if (bbox) {
                  if (element.strokeGradient.type === 'linear') {
                    defs.push(
                      <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {element.strokeGradient.stops.map((stop, i) => (
                          <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                        ))}
                      </linearGradient>
                    );
                  } else {
                    defs.push(
                      <radialGradient key={gradientId} id={gradientId} cx="50%" cy="50%" r="50%">
                        {element.strokeGradient.stops.map((stop, i) => (
                          <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                        ))}
                      </radialGradient>
                    );
                  }
                }
              }
              
              // Filters (shadows, blur)
              if (element.filter) {
                const filterId = `filter-${element.id}`;
                const hasShadow = element.filter.includes('drop-shadow');
                const hasBlur = element.filter.includes('blur');
                
                defs.push(
                  <filter key={filterId} id={filterId}>
                    {hasShadow && (
                      <>
                        <feGaussianBlur in="SourceAlpha" stdDeviation={shadowBlur / 2} />
                        <feOffset dx={shadowOffsetX} dy={shadowOffsetY} result="offsetblur" />
                        <feFlood floodColor={shadowColor} floodOpacity="0.5" />
                        <feComposite in2="offsetblur" operator="in" />
                        <feMerge>
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </>
                    )}
                    {hasBlur && !hasShadow && (
                      <feGaussianBlur in="SourceGraphic" stdDeviation={blurRadius} />
                    )}
                  </filter>
                );
              }
              
              return defs;
            })}
          </defs>
          
          {snapToGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

          {/* Render elements */}
          {elements.map(renderElement)}

          {/* PHASE 2: Polygon preview while drawing */}
          {tool === 'polygon' && polygonPoints.length > 0 && (
            <g key="polygon-preview">
              <polyline
                points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              {polygonPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#16a34a"
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* PHASE 2: Selection box */}
          {isSelectionBox && selectionBoxStart && selectionBoxEnd && (
            <rect
              x={Math.min(selectionBoxStart.x, selectionBoxEnd.x)}
              y={Math.min(selectionBoxStart.y, selectionBoxEnd.y)}
              width={Math.abs(selectionBoxEnd.x - selectionBoxStart.x)}
              height={Math.abs(selectionBoxEnd.y - selectionBoxStart.y)}
              fill="rgba(22, 163, 74, 0.1)"
              stroke="#16a34a"
              strokeWidth="1"
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}

          {/* Selection outlines and resize handles */}
          {Array.from(selectedElementIds.size > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : [])).map(elementId => 
            renderSelectionOutline(elementId)
          )}

          {/* PHASE 2: Smart guides */}
          {smartGuides.map((guide, i) => (
            <line
              key={`guide-${i}`}
              x1={guide.type === 'horizontal' ? -10000 : guide.position}
              y1={guide.type === 'horizontal' ? guide.position : -10000}
              x2={guide.type === 'horizontal' ? 10000 : guide.position}
              y2={guide.type === 'horizontal' ? guide.position : 10000}
              stroke="#16a34a"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.5"
              pointerEvents="none"
            />
          ))}

          {/* PHASE 2: Path anchor points for editing */}
          {editingPathId && pathPoints.map((point, i) => (
            <circle
              key={`path-point-${i}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#16a34a"
              stroke="#fff"
              strokeWidth="1"
              style={{ cursor: 'move', pointerEvents: 'all' }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
