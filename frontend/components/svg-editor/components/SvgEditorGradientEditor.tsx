/**
 * SVG Editor Gradient Editor Component
 * Modal for editing gradient stops and type
 */

'use client';

import React from 'react';
import type { GradientStop } from '../types/svgEditor.types';

interface SvgEditorGradientEditorProps {
  isOpen: boolean;
  gradientType: 'fill' | 'stroke' | null;
  type: 'linear' | 'radial';
  stops: GradientStop[];
  onClose: () => void;
  onTypeChange: (type: 'linear' | 'radial') => void;
  onStopsChange: (stops: GradientStop[]) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onApply: () => void;
}

export function SvgEditorGradientEditor({
  isOpen,
  gradientType,
  type,
  stops,
  onClose,
  onTypeChange,
  onStopsChange,
  onAddStop,
  onRemoveStop,
  onApply,
}: SvgEditorGradientEditorProps) {
  if (!isOpen || !gradientType) return null;

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-96 max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">
            {gradientType === 'fill' ? 'Fill' : 'Stroke'} Gradient
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as 'linear' | 'radial')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-2">Color Stops</label>
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="range"
                    value={stop.offset}
                    onChange={(e) => {
                      const newStops = [...stops];
                      newStops[i].offset = Number(e.target.value);
                      onStopsChange(newStops);
                    }}
                    className="flex-1"
                    min="0"
                    max="100"
                  />
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => {
                      const newStops = [...stops];
                      newStops[i].color = e.target.value;
                      onStopsChange(newStops);
                    }}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 w-12">{stop.offset}%</span>
                  {stops.length > 2 && (
                    <button
                      onClick={() => onRemoveStop(i)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={onAddStop}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
              >
                + Add Stop
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onApply}
              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Apply
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
