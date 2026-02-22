/**
 * DocumentList Component
 * Displays list of documents in a folder
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AiruDocument, AiruDocumentMetadata } from '../types';

interface DocumentListProps {
  documents: (AiruDocument | AiruDocumentMetadata)[];
  orgId: string;
}

export function DocumentList({ documents, orgId }: DocumentListProps) {
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
          <Link
            key={doc.id}
            href={documentPath}
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {doc.name}
                  </h3>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{doc.type}</span>
                    <span>•</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
