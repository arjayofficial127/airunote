/**
 * SVG Editor Layers Panel Component
 * Manages layer visibility, naming, reordering, and deletion
 */

'use client';

import React from 'react';
import type { SvgEditorLayer, SvgEditorElement, Command } from '../types/svgEditor.types';

interface SvgEditorLayersPanelProps {
  layers: SvgEditorLayer[];
  elements: SvgEditorElement[];
  activeLayerId: string;
  draggedLayerId: string | null;
  onSetActiveLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onToggleLayerVisibility: (layerId: string, visible: boolean) => void;
  onReorderLayers: (draggedId: string, targetIndex: number) => void;
  onSetDraggedLayerId: (id: string | null) => void;
  executeCommand: (command: Command) => void;
}

export function SvgEditorLayersPanel({
  layers,
  elements,
  activeLayerId,
  draggedLayerId,
  onSetActiveLayer,
  onAddLayer,
  onDeleteLayer,
  onRenameLayer,
  onToggleLayerVisibility,
  onReorderLayers,
  onSetDraggedLayerId,
  executeCommand,
}: SvgEditorLayersPanelProps) {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Layers</h3>
        <button
          onClick={onAddLayer}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            draggable
            onDragStart={(e) => {
              onSetDraggedLayerId(layer.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedLayerId && draggedLayerId !== layer.id) {
                onReorderLayers(draggedLayerId, index);
              }
              onSetDraggedLayerId(null);
            }}
            onDragEnd={() => onSetDraggedLayerId(null)}
            className={`p-2 rounded border cursor-move ${
              activeLayerId === layer.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
            } ${draggedLayerId === layer.id ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => {
                  const command: Command = {
                    do: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, visible: e.target.checked } : l),
                    }),
                    undo: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, visible: layer.visible } : l),
                    }),
                  };
                  executeCommand(command);
                  onToggleLayerVisibility(layer.id, e.target.checked);
                }}
                title="Toggle visibility"
              />
              <button
                onClick={() => {
                  const command: Command = {
                    do: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l),
                    }),
                    undo: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, locked: layer.locked } : l),
                    }),
                  };
                  executeCommand(command);
                }}
                className={`p-1 rounded ${layer.locked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
              >
                {layer.locked ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 016 0v2h1V7a5 5 0 00-5-5z" />
                  </svg>
                )}
              </button>
              <input
                type="text"
                value={layer.name}
                onChange={(e) => {
                  const command: Command = {
                    do: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l),
                    }),
                    undo: (doc) => ({
                      elements: doc.elements,
                      layers: doc.layers.map(l => l.id === layer.id ? { ...l, name: layer.name } : l),
                    }),
                  };
                  executeCommand(command);
                  onRenameLayer(layer.id, e.target.value);
                }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                onClick={() => onSetActiveLayer(layer.id)}
                onDoubleClick={(e) => {
                  e.currentTarget.focus();
                  e.currentTarget.select();
                }}
              />
              <button
                onClick={() => {
                  const command: Command = {
                    do: (doc) => ({
                      elements: doc.elements.filter(el => el.layerId !== layer.id),
                      layers: doc.layers.filter(l => l.id !== layer.id),
                    }),
                    undo: (doc) => {
                      const deletedElements = elements.filter(el => el.layerId === layer.id);
                      return {
                        elements: [...doc.elements, ...deletedElements],
                        layers: [...doc.layers, layer],
                      };
                    },
                  };
                  executeCommand(command);
                  onDeleteLayer(layer.id);
                  if (activeLayerId === layer.id && layers.length > 1) {
                    onSetActiveLayer(layers.find(l => l.id !== layer.id)?.id || layers[0].id);
                  }
                }}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
