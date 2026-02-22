/**
 * DocumentList Component
 * Displays list of documents in a folder
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileTypeChip } from './FileTypeChip';
import type { AiruDocument, AiruDocumentMetadata } from '../types';

interface DocumentListProps {
  documents: (AiruDocument | AiruDocumentMetadata)[];
  orgId: string;
  onMove?: (document: AiruDocument | AiruDocumentMetadata) => void;
  onDelete?: (document: AiruDocument | AiruDocumentMetadata) => void;
}

export function DocumentList({ documents, orgId, onMove, onDelete }: DocumentListProps) {
  const params = useParams();
  const orgIdFromParams = params.orgId as string;

  const getDocumentIcon = (type: 'TXT' | 'MD' | 'RTF') => {
    switch (type) {
      case 'TXT':
        return '📄';
      case 'MD':
        return '📝';
      case 'RTF':
        return '📋';
      default:
        return '📄';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No documents yet</p>
        <p className="text-sm">Create your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const documentPath = `/orgs/${orgIdFromParams}/airunote/document/${doc.id}`;
        return (
          <div key={doc.id} className="group relative">
            <Link
              href={documentPath}
              className="block p-3 border border-gray-200 rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate">
                      {doc.name}
                    </h3>
                    <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500">
                      <FileTypeChip type={doc.type} />
                      <span>•</span>
                      <span>Updated {formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            {(onMove || onDelete) && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity duration-150">
                {onMove && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMove(doc);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150"
                    title="Move document"
                  >
                    Move
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(doc);
                    }}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-150"
                    title="Delete document"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
