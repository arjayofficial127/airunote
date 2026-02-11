/**
 * SVG Editor Toolbar Component
 * Tool selection, colors, undo/redo, zoom controls
 */

'use client';

import React from 'react';
import type { Tool } from '../types/svgEditor.types';

interface SvgEditorToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  fillEnabled: boolean;
  setFillEnabled: (enabled: boolean) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeEnabled: boolean;
  setStrokeEnabled: (enabled: boolean) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  onFit: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  onExport: () => void;
}

export function SvgEditorToolbar({
  tool,
  setTool,
  fillColor,
  setFillColor,
  fillEnabled,
  setFillEnabled,
  strokeColor,
  setStrokeColor,
  strokeEnabled,
  setStrokeEnabled,
  strokeWidth,
  setStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDuplicate,
  zoom,
  setZoom,
  onFit,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  setGridSize,
  showLayers,
  setShowLayers,
  showProperties,
  setShowProperties,
  onExport,
}: SvgEditorToolbarProps) {
  return (
    <div className="border-b border-gray-200 p-3 flex items-center gap-2 bg-gray-50 overflow-x-auto flex-shrink-0">
      <div className="flex items-center gap-2 min-w-max">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded ${tool === 'select' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Select (V)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          </button>
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded ${tool === 'pen' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Pen (P)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
            </svg>
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded ${tool === 'rect' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Rectangle (R)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded ${tool === 'circle' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Circle (O)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
          <button
            onClick={() => setTool('ellipse')}
            className={`p-2 rounded ${tool === 'ellipse' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Ellipse"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="12" rx="10" ry="6" />
            </svg>
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded ${tool === 'line' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Line (L)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded ${tool === 'text' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Text"
          >
            <span className="text-lg font-bold">A</span>
          </button>
          <button
            onClick={() => setTool('polygon')}
            className={`p-2 rounded ${tool === 'polygon' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'}`}
            title="Polygon (G)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2 border-r border-gray-300 pr-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-600">Fill:</label>
            <button
              onClick={() => setFillEnabled(!fillEnabled)}
              className={`w-6 h-6 border rounded flex items-center justify-center ${fillEnabled ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'}`}
              title={fillEnabled ? 'Disable Fill' : 'Enable Fill'}
            >
              {fillEnabled ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
            </button>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              disabled={!fillEnabled}
              className={`w-8 h-8 border border-gray-300 rounded ${fillEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-600">Stroke:</label>
            <button
              onClick={() => setStrokeEnabled(!strokeEnabled)}
              className={`w-6 h-6 border rounded flex items-center justify-center ${strokeEnabled ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'}`}
              title={strokeEnabled ? 'Disable Stroke' : 'Enable Stroke'}
            >
              {strokeEnabled ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
            </button>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              disabled={!strokeEnabled}
              className={`w-8 h-8 border border-gray-300 rounded ${strokeEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            />
          </div>
          <input
            type="number"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            disabled={!strokeEnabled}
            className={`w-16 px-2 py-1 border border-gray-300 rounded text-xs ${strokeEnabled ? '' : 'cursor-not-allowed opacity-50'}`}
            placeholder="Width"
            min="1"
            max="50"
          />
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
            </svg>
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 rounded hover:bg-gray-100"
            title="Duplicate (Ctrl+D)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 border-r border-gray-300 pr-2">
          <label className="text-xs text-gray-600">Zoom:</label>
          <input
            type="range"
            value={zoom * 100}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-20"
            min="10"
            max="500"
          />
          <input
            type="number"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
            min="10"
            max="500"
          />
          <span className="text-xs text-gray-600">%</span>
          <button
            onClick={onFit}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Fit to Screen"
          >
            Fit
          </button>
        </div>

        {/* Grid */}
        <div className="flex items-center gap-2 border-r border-gray-300 pr-2">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1 text-xs border rounded ${snapToGrid ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-300 hover:bg-gray-100'}`}
            title="Snap to Grid"
          >
            Grid
          </button>
          <input
            type="number"
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
            min="5"
            max="100"
            title="Grid Size"
          />
        </div>

        {/* Panel Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`px-2 py-1 text-xs border rounded ${showLayers ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-300 hover:bg-gray-100'}`}
            title="Toggle Layers Panel"
          >
            Layers
          </button>
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`px-2 py-1 text-xs border rounded ${showProperties ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-300 hover:bg-gray-100'}`}
            title="Toggle Properties Panel"
          >
            Properties
          </button>
          <button
            onClick={onExport}
            className="p-2 rounded hover:bg-gray-100"
            title="Export"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
