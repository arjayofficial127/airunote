/**
 * SVG Editor UI State Hook
 * Manages UI visibility and grid settings
 */

import { useState } from 'react';

export interface UseSvgEditorUIReturn {
  // Panel visibility
  showLayers: boolean;
  setShowLayers: (show: boolean) => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  showExport: boolean;
  setShowExport: (show: boolean) => void;
  
  // Grid
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
}

export function useSvgEditorUI(): UseSvgEditorUIReturn {
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  return {
    showLayers,
    setShowLayers,
    showProperties,
    setShowProperties,
    showExport,
    setShowExport,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
  };
}
