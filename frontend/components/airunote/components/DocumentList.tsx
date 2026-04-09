/**
 * DocumentList Component
 * Displays list of documents in a folder
 */

'use client';

import { DocumentCard } from './DocumentCard';
import type { AiruDocument, AiruDocumentMetadata } from '../types';

interface DocumentListProps {
  documents: (AiruDocument | AiruDocumentMetadata)[];
  orgId: string;
  onMove?: (document: AiruDocument | AiruDocumentMetadata) => void;
  onDelete?: (document: AiruDocument | AiruDocumentMetadata) => void;
}

export function DocumentList({ documents, orgId, onMove, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No documents yet</p>
        <p className="text-sm">Create your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc as AiruDocumentMetadata}
          mode="list"
          orgId={orgId}
          onMove={onMove ? (document) => onMove(document) : undefined}
          onDelete={onDelete ? (document) => onDelete(document) : undefined}
        />
      ))}
    </div>
  );
}
