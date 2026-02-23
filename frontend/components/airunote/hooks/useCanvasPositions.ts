/**
 * Hook for managing canvas positions
 * Phase 3 — Canvas layout ownership by Lens
 * 
 * Manages local canvas state and syncs to lens metadata
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { toast } from '@/lib/toast';
import type { CanvasPosition, AiruLens, AiruDocumentMetadata } from '../types';

interface UseCanvasPositionsOptions {
  lensId: string | null;
  lens: AiruLens | null;
  documents: AiruDocumentMetadata[];
}

export function useCanvasPositions({ lensId, lens, documents }: UseCanvasPositionsOptions) {
  // Local canvas state - positions for each document
  const [localPositions, setLocalPositions] = useState<Record<string, CanvasPosition>>({});
  // Track original positions from lens (for change detection)
  const [originalPositions, setOriginalPositions] = useState<Record<string, CanvasPosition>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize positions from lens metadata on load
  useEffect(() => {
    if (!lens || !lensId) {
      // No lens, use default positions
      const defaults: Record<string, CanvasPosition> = {};
      documents.forEach((doc) => {
        defaults[doc.id] = { x: 0, y: 0 };
      });
      setLocalPositions(defaults);
      setOriginalPositions(defaults);
      setHasUnsavedChanges(false);
      return;
    }

    // Read positions from lens.metadata.views.canvas.positions
    const metadata = lens.metadata || {};
    const views = (metadata.views as Record<string, unknown>) || {};
    const canvas = (views.canvas as Record<string, unknown>) || {};
    const positions = (canvas.positions as Record<string, CanvasPosition>) || {};

    // Merge with documents - use saved positions or fallback to { x: 0, y: 0 }
    const merged: Record<string, CanvasPosition> = {};
    documents.forEach((doc) => {
      merged[doc.id] = positions[doc.id] || { x: 0, y: 0 };
    });

    setLocalPositions(merged);
    setOriginalPositions(merged);
    setHasUnsavedChanges(false);
  }, [lens, lensId, documents]);

  // Update position for a document (local state only)
  const updatePosition = useCallback((documentId: string, position: CanvasPosition) => {
    setLocalPositions((prev) => ({
      ...prev,
      [documentId]: position,
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Phase 8.1: Batch save positions using batch-layout endpoint
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!lensId) {
        throw new Error('No lens ID available');
      }

      // Calculate changed positions only
      const changedPositions: Record<string, CanvasPosition> = {};
      for (const [docId, currentPos] of Object.entries(localPositions)) {
        const originalPos = originalPositions[docId];
        // Position changed if:
        // 1. No original position exists (new position)
        // 2. Original position exists but x or y differs
        if (
          !originalPos ||
          originalPos.x !== currentPos.x ||
          originalPos.y !== currentPos.y
        ) {
          changedPositions[docId] = currentPos;
        }
      }

      // Only send if there are changes
      if (Object.keys(changedPositions).length === 0) {
        return null; // No changes to save
      }

      // Phase 8.1: Use batch-layout endpoint
      const response = await airunoteApi.updateBatchLayout(lensId, {
        canvasPositions: changedPositions,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save canvas positions');
      }

      return response.data.lens;
    },
    onSuccess: (updatedLens) => {
      if (updatedLens) {
        // Update original positions to match saved positions
        setOriginalPositions({ ...localPositions });
        setHasUnsavedChanges(false);
        toast('Canvas positions saved', 'success');
      }
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to save canvas positions', 'error');
    },
  });

  const savePositions = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  // Phase 8.1: Memoize canvas layout computation (document positions array)
  const documentPositions = useMemo(() => {
    return documents.map((doc) => ({
      doc,
      position: localPositions[doc.id] || { x: 0, y: 0 },
    }));
  }, [documents, localPositions]);

  return {
    positions: localPositions,
    documentPositions, // Phase 8.1: Memoized layout computation
    updatePosition,
    savePositions,
    hasUnsavedChanges,
    isSaving: saveMutation.isPending,
  };
}
