/**
 * Board View Component
 * Phase 4 — Board state ownership by Lens
 * 
 * Displays documents in a board layout with lanes and cards
 * State is stored in lens metadata, not document metadata
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useBoardState } from '../hooks/useBoardState';
import { FileTypeChip } from './FileTypeChip';
import type { AiruDocumentMetadata, BoardLane } from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface BoardViewProps {
  documents: AiruDocumentMetadata[];
  lens: AiruLens | null;
  lensId: string | null;
  orgId: string;
}

export function BoardView({ documents, lens, lensId, orgId }: BoardViewProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingLaneName, setEditingLaneName] = useState('');

  const {
    lanes,
    cardPositions,
    cardsByLane, // Phase 8.1: Memoized grouping
    updateCardPosition,
    updateLanes,
    saveCardPosition,
    saveLanes,
    isSavingCard,
    isSavingLanes,
  } = useBoardState({
    lensId,
    lens,
    documents,
    orgId,
  });

  // Compute fractional order for a card in a lane
  const computeFractionalOrder = useCallback((laneId: string, insertIndex: number, totalCards: number): number => {
    if (totalCards === 0) return 0;
    if (insertIndex === 0) return -1;
    if (insertIndex >= totalCards) return totalCards;
    return insertIndex - 0.5;
  }, []);

  const handleCardDragStart = useCallback((e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCardDrop = useCallback(
    (e: React.DragEvent, targetLaneId: string, insertIndex: number) => {
      e.preventDefault();
      if (!draggedDocId) return;

      // Phase 8.1: Use memoized cardsByLane instead of computing per drop
      const cardsInLane = cardsByLane[targetLaneId] || [];

      // Compute new fractional order
      const totalCards = cardsInLane.length;
      const fractionalOrder = computeFractionalOrder(targetLaneId, insertIndex, totalCards);

      // Update local state
      updateCardPosition(draggedDocId, targetLaneId, fractionalOrder);

      // Phase 8.1: Save to lens (batched, debounced)
      saveCardPosition(draggedDocId, targetLaneId, fractionalOrder);

      setDraggedDocId(null);
    },
    [draggedDocId, cardsByLane, computeFractionalOrder, updateCardPosition, saveCardPosition]
  );

  const handleLaneNameEdit = useCallback((laneId: string, currentName: string) => {
    setEditingLaneId(laneId);
    setEditingLaneName(currentName);
  }, []);

  const handleLaneNameSave = useCallback(() => {
    if (!editingLaneId) return;

    const updatedLanes = lanes.map((lane) =>
      lane.id === editingLaneId ? { ...lane, name: editingLaneName } : lane
    );

    updateLanes(updatedLanes);
    saveLanes(updatedLanes);
    setEditingLaneId(null);
    setEditingLaneName('');
  }, [editingLaneId, editingLaneName, lanes, updateLanes, saveLanes]);

  const handleLaneNameCancel = useCallback(() => {
    setEditingLaneId(null);
    setEditingLaneName('');
  }, []);

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No documents to display</p>
      </div>
    );
  }

  if (lanes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No lanes configured. Please create lanes first.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {lanes.map((lane) => {
        // Phase 8.1: Use memoized cardsByLane instead of computing per render
        const cards = cardsByLane[lane.id] || [];
        const isEditing = editingLaneId === lane.id;

        return (
          <div
            key={lane.id}
            className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border border-gray-200 p-4"
            onDragOver={handleCardDragOver}
            onDrop={(e) => handleCardDrop(e, lane.id, cards.length)}
          >
            {/* Lane Header */}
            <div className="mb-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingLaneName}
                    onChange={(e) => setEditingLaneName(e.target.value)}
                    onBlur={handleLaneNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLaneNameSave();
                      } else if (e.key === 'Escape') {
                        handleLaneNameCancel();
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h3
                    className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => handleLaneNameEdit(lane.id, lane.name)}
                  >
                    {lane.name}
                  </h3>
                  <span className="text-xs text-gray-500">{cards.length}</span>
                </div>
              )}
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px]">
              {cards.map((doc, index) => {
                const position = cardPositions[doc.id];
                const isDragging = draggedDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, doc.id)}
                    className={`p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150 cursor-move ${
                      isDragging ? 'opacity-50' : ''
                    }`}
                  >
                    <Link
                      href={`/orgs/${orgIdFromParams}/airunote/document/${doc.id}`}
                      className="block"
                      onClick={(e) => {
                        // Prevent navigation while dragging
                        if (isDragging) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <FileTypeChip type={doc.type} />
                        <h4 className="font-medium text-gray-900 truncate text-sm">{doc.name}</h4>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </Link>
                  </div>
                );
              })}

              {/* Drop zone at end of lane */}
              <div
                className="h-4 border-2 border-dashed border-gray-300 rounded opacity-0 hover:opacity-100 transition-opacity"
                onDragOver={handleCardDragOver}
                onDrop={(e) => handleCardDrop(e, lane.id, cards.length)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
