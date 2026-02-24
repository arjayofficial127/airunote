/**
 * Hook for managing board state
 * Phase 4 — Board state ownership by Lens
 * 
 * Manages lanes and card positions from lens metadata
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { airunoteApi } from '../services/airunoteApi';
import { toast } from '@/lib/toast';
import type { BoardLane, BoardCardPosition, AiruDocumentMetadata } from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface UseBoardStateOptions {
  lensId: string | null;
  lens: AiruLens | null;
  documents: AiruDocumentMetadata[];
}

export function useBoardState({ lensId, lens, documents }: UseBoardStateOptions) {
  const queryClient = useQueryClient();
  
  // Local board state
  const [lanes, setLanes] = useState<BoardLane[]>([]);
  const [cardPositions, setCardPositions] = useState<Record<string, BoardCardPosition>>({});
  
  // Phase 8.1: Batch update tracking
  const pendingCardUpdates = useRef<Record<string, { laneId: string; fractionalOrder: number }>>({});
  const batchSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize board state from lens metadata on load
  useEffect(() => {
    if (!lens || !lensId) {
      // No lens, use default state
      setLanes([]);
      setCardPositions({});
      return;
    }

    // Read lanes from lens.metadata.views.board.lanes
    const metadata = lens.metadata || {};
    const views = (metadata.views as Record<string, unknown>) || {};
    const board = (views.board as Record<string, unknown>) || {};
    const boardLanes = (board.lanes as BoardLane[]) || [];
    const boardCardPositions = (board.cardPositions as Record<string, BoardCardPosition>) || {};

    // Sort lanes by order
    const sortedLanes = [...boardLanes].sort((a, b) => a.order - b.order);
    setLanes(sortedLanes);

    // Initialize card positions for documents that don't have one
    const mergedCardPositions: Record<string, BoardCardPosition> = { ...boardCardPositions };
    documents.forEach((doc) => {
      if (!mergedCardPositions[doc.id] && sortedLanes.length > 0) {
        // Default to first lane with order 0
        mergedCardPositions[doc.id] = {
          laneId: sortedLanes[0].id,
          fractionalOrder: 0,
        };
      }
    });
    setCardPositions(mergedCardPositions);
  }, [lens, lensId, documents]);

  // Update card position (local state only - no immediate API call)
  const updateCardPosition = useCallback((documentId: string, laneId: string, fractionalOrder: number) => {
    setCardPositions((prev) => ({
      ...prev,
      [documentId]: { laneId, fractionalOrder },
    }));
    
    // Phase 8.1: Track pending updates for batching
    pendingCardUpdates.current[documentId] = { laneId, fractionalOrder };
  }, []);

  // Update lanes (local state)
  const updateLanes = useCallback((newLanes: BoardLane[]) => {
    const sorted = [...newLanes].sort((a, b) => a.order - b.order);
    setLanes(sorted);
  }, []);

  // Phase 8.1: Batch save card positions using batch-layout endpoint
  const batchSaveMutation = useMutation({
    mutationFn: async (updates: Record<string, { laneId: string; fractionalOrder: number }>) => {
      if (!lensId) {
        throw new Error('No lens ID available');
      }

      // Convert fractionalOrder to order for batch API
      const boardPositions: Record<string, { laneId: string; order: number }> = {};
      for (const [docId, pos] of Object.entries(updates)) {
        boardPositions[docId] = {
          laneId: pos.laneId,
          order: pos.fractionalOrder,
        };
      }

      const response = await airunoteApi.updateBatchLayout(lensId, {
        boardPositions,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save card positions');
      }

      return response.data.lens;
    },
    onSuccess: (updatedLens) => {
      // Clear pending updates
      pendingCardUpdates.current = {};
      
      // Update local lanes from response if needed
      if (updatedLens) {
        const metadata = updatedLens.metadata || {};
        const views = (metadata.views as Record<string, unknown>) || {};
        const board = (views.board as Record<string, unknown>) || {};
        const boardCardPositions = (board.cardPositions as Record<string, BoardCardPosition>) || {};
        
        // Update card positions from response
        setCardPositions((prev) => ({
          ...prev,
          ...boardCardPositions,
        }));
      }
      
      // Invalidate lens query (but don't refetch immediately due to staleTime)
      queryClient.invalidateQueries({ queryKey: ['folder-lens'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to save card positions', 'error');
    },
  });

  // Save lanes to lens
  const saveLanesMutation = useMutation({
    mutationFn: async (newLanes: BoardLane[]) => {
      if (!lensId) {
        throw new Error('No lens ID available');
      }

      const response = await airunoteApi.updateBoardLanes(lensId, {
        lanes: newLanes,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save lanes');
      }

      return response.data.lens;
    },
    onSuccess: (updatedLens) => {
      // Update local lanes from response
      const metadata = updatedLens.metadata || {};
      const views = (metadata.views as Record<string, unknown>) || {};
      const board = (views.board as Record<string, unknown>) || {};
      const boardLanes = (board.lanes as BoardLane[]) || [];
      const sorted = [...boardLanes].sort((a, b) => a.order - b.order);
      setLanes(sorted);
      
      // Invalidate lens query (but don't refetch immediately due to staleTime)
      queryClient.invalidateQueries({ queryKey: ['folder-lens'] });
      toast('Lanes saved', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to save lanes', 'error');
    },
  });

  // Phase 8.1: Batch save card positions (debounced)
  const saveCardPosition = useCallback((documentId: string, laneId: string, fractionalOrder: number) => {
    // Clear existing timeout
    if (batchSaveTimeoutRef.current) {
      clearTimeout(batchSaveTimeoutRef.current);
    }

    // Set new timeout to batch updates (500ms debounce)
    batchSaveTimeoutRef.current = setTimeout(() => {
      const updates = { ...pendingCardUpdates.current };
      if (Object.keys(updates).length > 0) {
        batchSaveMutation.mutate(updates);
      }
    }, 500);
  }, [batchSaveMutation]);

  const saveLanes = useCallback((newLanes: BoardLane[]) => {
    saveLanesMutation.mutate(newLanes);
  }, [saveLanesMutation]);

  // Phase 8.1: Memoize board grouping computation
  const cardsByLane = useMemo(() => {
    const grouped: Record<string, AiruDocumentMetadata[]> = {};
    lanes.forEach((lane) => {
      grouped[lane.id] = documents
        .filter((doc) => cardPositions[doc.id]?.laneId === lane.id)
        .sort((a, b) => {
          const posA = cardPositions[a.id]?.fractionalOrder || 0;
          const posB = cardPositions[b.id]?.fractionalOrder || 0;
          return posA - posB;
        });
    });
    return grouped;
  }, [documents, lanes, cardPositions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchSaveTimeoutRef.current) {
        clearTimeout(batchSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    lanes,
    cardPositions,
    cardsByLane, // Phase 8.1: Memoized grouping
    updateCardPosition,
    updateLanes,
    saveCardPosition,
    saveLanes,
    isSavingCard: batchSaveMutation.isPending,
    isSavingLanes: saveLanesMutation.isPending,
  };
}
