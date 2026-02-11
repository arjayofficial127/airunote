/**
 * SVG Editor Core State Hook
 * Manages elements, layers, and selection state
 */

import { useState, useCallback } from 'react';
import type { SvgEditorElement, SvgEditorLayer, SvgEditorData } from '../types/svgEditor.types';

export interface UseSvgEditorStateReturn {
  // Elements
  elements: SvgEditorElement[];
  setElements: React.Dispatch<React.SetStateAction<SvgEditorElement[]>>;
  
  // Layers
  layers: SvgEditorLayer[];
  setLayers: React.Dispatch<React.SetStateAction<SvgEditorLayer[]>>;
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  
  // Selection
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  selectedElementIds: Set<string>;
  setSelectedElementIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Helpers
  getSelectedElement: () => SvgEditorElement | undefined;
  initializeFromData: (data: SvgEditorData | undefined) => void;
}

export function useSvgEditorState(initialData?: SvgEditorData): UseSvgEditorStateReturn {
  const [elements, setElements] = useState<SvgEditorElement[]>(initialData?.elements || []);
  const [layers, setLayers] = useState<SvgEditorLayer[]>(
    initialData?.layers || [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1 }]
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [activeLayerId, setActiveLayerId] = useState<string>(
    initialData?.layers?.[0]?.id || 'layer-1'
  );

  const getSelectedElement = useCallback((): SvgEditorElement | undefined => {
    if (!selectedElementId) return undefined;
    return elements.find(el => el.id === selectedElementId);
  }, [selectedElementId, elements]);

  const initializeFromData = useCallback((data: SvgEditorData | undefined) => {
    if (data) {
      setElements(data.elements || []);
      setLayers(data.layers || [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1 }]);
      setActiveLayerId(data.layers?.[0]?.id || 'layer-1');
    }
  }, []);

  return {
    elements,
    setElements,
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    selectedElementId,
    setSelectedElementId,
    selectedElementIds,
    setSelectedElementIds,
    getSelectedElement,
    initializeFromData,
  };
}
