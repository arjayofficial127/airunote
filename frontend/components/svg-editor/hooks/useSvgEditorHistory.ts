/**
 * SVG Editor History Hook
 * Manages command system for undo/redo functionality
 */

import { useState, useCallback } from 'react';
import type { Command, SvgEditorDocument } from '../types/svgEditor.types';

const MAX_HISTORY_SIZE = 200;

export interface UseSvgEditorHistoryReturn {
  history: Command[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  executeCommand: (command: Command) => SvgEditorDocument;
  undo: (currentDoc: SvgEditorDocument) => SvgEditorDocument | null;
  redo: (currentDoc: SvgEditorDocument) => SvgEditorDocument | null;
  clearHistory: () => void;
}

export function useSvgEditorHistory(): UseSvgEditorHistoryReturn {
  const [history, setHistory] = useState<Command[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const executeCommand = useCallback((command: Command): SvgEditorDocument => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(command);
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        setHistoryIndex(newHistory.length - 1);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      return newHistory;
    });
    
    // Return the result of executing the command
    // Note: The actual document state should be passed in, but for now we return a placeholder
    // The caller will need to provide the current document state
    return { elements: [], layers: [] };
  }, [historyIndex]);

  const undo = useCallback((currentDoc: SvgEditorDocument): SvgEditorDocument | null => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const command = history[historyIndex];
      const result = command.undo(currentDoc);
      setHistoryIndex(prev => prev - 1);
      return result;
    }
    return null;
  }, [history, historyIndex]);

  const redo = useCallback((currentDoc: SvgEditorDocument): SvgEditorDocument | null => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const command = history[historyIndex + 1];
      const result = command.do(currentDoc);
      setHistoryIndex(prev => prev + 1);
      return result;
    }
    return null;
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    executeCommand,
    undo,
    redo,
    clearHistory,
  };
}
