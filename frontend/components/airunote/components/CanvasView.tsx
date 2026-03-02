/**
 * Canvas View Component
 * Phase 3 — Canvas layout ownership by Lens
 * 
 * Displays documents in a canvas layout with drag-and-drop positioning
 * Positions are stored in lens metadata, not document metadata
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCanvasPositions } from '../hooks/useCanvasPositions';
import { FileTypeChip } from './FileTypeChip';
import type { AiruDocumentMetadata } from '../types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';

interface CanvasViewProps {
  documents: AiruDocumentMetadata[];
  lens: AiruLens | null;
  lensId: string | null;
  orgId: string;
}

export function CanvasView({ documents, lens, lensId, orgId }: CanvasViewProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { positions, documentPositions, updatePosition, savePositions, hasUnsavedChanges, isSaving } = useCanvasPositions({
    lensId,
    lens,
    documents,
    orgId,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, docId: string) => {
      e.preventDefault();
      const position = positions[docId] || { x: 0, y: 0 };
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDraggedDocId(docId);
      setDragOffset({
        x: e.clientX - rect.left - position.x,
        y: e.clientY - rect.top - position.y,
      });
    },
    [positions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedDocId || !dragOffset || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      // Update local state only - do NOT mutate document metadata
      updatePosition(draggedDocId, { x: Math.max(0, newX), y: Math.max(0, newY) });
    },
    [draggedDocId, dragOffset, updatePosition]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedDocId(null);
    setDragOffset(null);
  }, []);

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No documents to display</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Save button - only show if there are unsaved changes */}
      {hasUnsavedChanges && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={savePositions}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Positions'}
          </button>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={canvasRef}
        className="relative w-full h-screen border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Phase 8.1: Use memoized documentPositions instead of computing per render */}
        {documentPositions.map(({ doc, position }) => {
          const isDragging = draggedDocId === doc.id;

          return (
            <div
              key={doc.id}
              className="absolute cursor-move select-none"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 150ms ease',
                zIndex: isDragging ? 1000 : 1,
              }}
              onMouseDown={(e) => handleMouseDown(e, doc.id)}
            >
              <Link
                href={`/orgs/${orgIdFromParams}/airunote/document/${doc.id}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150 min-w-[200px]"
                onClick={(e) => {
                  // Prevent navigation while dragging
                  if (isDragging) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <FileTypeChip type={doc.type} />
                  <h3 className="font-medium text-gray-900 truncate text-sm">{doc.name}</h3>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
