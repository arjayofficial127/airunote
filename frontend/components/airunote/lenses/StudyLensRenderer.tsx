'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { toast } from '@/lib/toast';
import { InlineCanvasDocumentCard } from '../components/InlineCanvasDocumentCard';
import { useDocumentContent } from '../hooks/useDocumentContent';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import type { AiruDocument, AiruDocumentMetadata } from '../types';

interface StudyLensRendererProps {
  folderId: string;
}

interface StudyMeta {
  order?: number;
  tags?: string[];
  relatedDocIds?: string[];
  color?: string;
}

interface StudyLensDocument {
  id: string;
  title: string;
  content: string;
  document: AiruDocument;
  studyMeta?: StudyMeta;
}

interface ConnectionTab {
  id: string;
  label: string;
  title: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStudyMeta(value: unknown): StudyMeta | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;
  const relatedDocIds = Array.isArray(value.relatedDocIds)
    ? value.relatedDocIds.filter((docId): docId is string => typeof docId === 'string')
    : undefined;

  return {
    order: typeof value.order === 'number' ? value.order : undefined,
    tags,
    relatedDocIds,
    color: typeof value.color === 'string' ? value.color : undefined,
  };
}

function getStudyMeta(document: AiruDocument | AiruDocumentMetadata): StudyMeta | undefined {
  const directStudyMeta = readStudyMeta((document as AiruDocument & { studyMeta?: unknown }).studyMeta);
  if (directStudyMeta) {
    return directStudyMeta;
  }

  return readStudyMeta(document.attributes?.studyMeta);
}

function buildStudyDocument(metadata: AiruDocumentMetadata, fullDocument?: AiruDocument): AiruDocument {
  if (fullDocument) {
    return fullDocument;
  }

  return {
    id: metadata.id,
    folderId: metadata.folderId,
    ownerUserId: metadata.ownerUserId,
    type: metadata.type,
    name: metadata.name,
    content: '',
    canonicalContent: '',
    sharedContent: null,
    visibility: metadata.visibility,
    state: metadata.state,
    attributes: metadata.attributes || {},
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  };
}

function compareStudyDocuments(left: StudyLensDocument, right: StudyLensDocument): number {
  const leftOrder = left.studyMeta?.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.studyMeta?.order ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title);
}

function getAlphabetLabel(index: number): string {
  if (index >= 0 && index < 26) {
    return String.fromCharCode(65 + index);
  }

  return `${index + 1}`;
}

const noopAsync = async () => undefined;
const noop = () => undefined;

interface StudyLensAccordionItemProps {
  document: StudyLensDocument;
  isExpanded: boolean;
  isSelected: boolean;
  isDirectlyConnected: boolean;
  reorderEnabled: boolean;
  tags: string[];
  tabs: ConnectionTab[];
  hasRelatedDocuments: boolean;
  onDocumentClick: (documentId: string) => void;
  onTabSelect: (documentId: string) => void;
  onDragStart: (documentId: string) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (documentId: string) => void;
  onDragEnd: () => void;
}

function StudyLensAccordionItem({
  document,
  isExpanded,
  isSelected,
  isDirectlyConnected,
  reorderEnabled,
  tags,
  tabs,
  hasRelatedDocuments,
  onDocumentClick,
  onTabSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: StudyLensAccordionItemProps) {
  const { document: loadedDocument, isLoading, error } = useDocumentContent(isExpanded ? document.id : null);

  const containerClassName = isSelected
    ? 'overflow-hidden rounded-xl border border-blue-400 bg-blue-50/80 shadow-sm'
    : isDirectlyConnected
      ? 'overflow-hidden rounded-xl border border-amber-300 bg-amber-50/70 shadow-sm'
      : 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm';
  const rowClassName = isSelected
    ? 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors bg-blue-50 hover:bg-blue-100/60'
    : isDirectlyConnected
      ? 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors bg-amber-50 hover:bg-amber-100/60'
      : 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50';

  return (
    <div
      className={containerClassName}
      draggable={reorderEnabled}
      onDragStart={() => onDragStart(document.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(document.id)}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        onClick={() => onDocumentClick(document.id)}
        className={`${rowClassName} ${reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        <span
          className={`text-xs text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{document.title}</span>
        {document.studyMeta?.color ? (
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: document.studyMeta.color }}
            aria-hidden="true"
          />
        ) : null}
        {tags.length > 0 ? (
          <span className="hidden shrink-0 items-center gap-2 text-xs text-gray-500 sm:flex">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                #{tag}
              </span>
            ))}
          </span>
        ) : null}
      </button>

      {isExpanded ? (
        <div className="border-t border-gray-200 px-4 py-4">
          {tags.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {isSelected ? (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabSelect(tab.id)}
                    title={tab.title}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      tab.id === document.id
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {!hasRelatedDocuments ? (
                <div className="mt-3 text-xs text-gray-500">No related documents</div>
              ) : null}
            </div>
          ) : null}
          <InlineCanvasDocumentCard
            document={loadedDocument ?? null}
            isEditing={false}
            isLoading={isLoading}
            error={error}
            onSave={noopAsync}
            onCancel={noop}
            hideActionBar
          />
        </div>
      ) : null}
    </div>
  );
}

export function StudyLensRenderer({ folderId }: StudyLensRendererProps) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const {
    getDocumentsByFolder,
    getDocumentContentById,
    setDocumentContent,
  } = useAirunoteStore();
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [markTreeEnabled, setMarkTreeEnabled] = useState(false);
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [manualOrderIds, setManualOrderIds] = useState<string[]>([]);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [isBulkLoadingData, setIsBulkLoadingData] = useState(false);

  const folderDocuments = getDocumentsByFolder(folderId);

  const documents: StudyLensDocument[] = folderDocuments
    .map((metadata) => {
      const fullDocument = getDocumentContentById(metadata.id);
      const document = buildStudyDocument(metadata, fullDocument);

      return {
        id: metadata.id,
        title: document.name,
        content: document.content || '',
        document,
        studyMeta: getStudyMeta(fullDocument || metadata),
      };
    })
    .sort(compareStudyDocuments);

  const allDocumentDataLoaded = useMemo(() => {
    if (folderDocuments.length === 0) {
      return false;
    }

    return folderDocuments.every((document) => getDocumentContentById(document.id));
  }, [folderDocuments, getDocumentContentById]);

  const handleLoadAllData = useCallback(async () => {
    if (!orgId || !userId || folderDocuments.length === 0 || isBulkLoadingData) {
      return;
    }

    setIsBulkLoadingData(true);

    try {
      const response = await airunoteApi.getFolderDocuments(folderId, orgId, userId);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load document data');
      }

      response.data.documents.forEach((document) => {
        setDocumentContent(document);
      });

      toast(`Loaded ${response.data.documents.length} document ${response.data.documents.length === 1 ? 'card' : 'cards'} for search`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load document data', 'error');
    } finally {
      setIsBulkLoadingData(false);
    }
  }, [folderDocuments.length, folderId, isBulkLoadingData, orgId, setDocumentContent, userId]);

  const documentsById = useMemo(() => {
    return new Map(documents.map((document) => [document.id, document]));
  }, [documents]);

  useEffect(() => {
    setManualOrderIds((previous) => {
      const nextIds = documents.map((document) => document.id);

      if (previous.length === 0) {
        return nextIds;
      }

      const validPreviousIds = previous.filter((id) => documentsById.has(id));
      const missingIds = nextIds.filter((id) => !validPreviousIds.includes(id));
      const mergedIds = [...validPreviousIds, ...missingIds];

      if (mergedIds.length === previous.length && mergedIds.every((id, index) => id === previous[index])) {
        return previous;
      }

      return mergedIds;
    });
  }, [documents, documentsById]);

  const orderedDocuments = useMemo(() => {
    if (manualOrderIds.length === 0) {
      return documents;
    }

    const orderIndex = new Map(manualOrderIds.map((id, index) => [id, index]));

    return [...documents].sort((left, right) => {
      const leftIndex = orderIndex.get(left.id);
      const rightIndex = orderIndex.get(right.id);

      if (leftIndex === undefined && rightIndex === undefined) {
        return compareStudyDocuments(left, right);
      }

      if (leftIndex === undefined) {
        return 1;
      }

      if (rightIndex === undefined) {
        return -1;
      }

      return leftIndex - rightIndex;
    });
  }, [documents, manualOrderIds]);

  const getRelatedDocIds = (docId: string) => {
    const document = documentsById.get(docId);
    if (!document) {
      return [] as string[];
    }

    const relatedDocIds = document.studyMeta?.relatedDocIds || [];

    return relatedDocIds.filter((relatedDocId) => relatedDocId !== docId && documentsById.has(relatedDocId));
  };

  const getParentDocIds = (docId: string) => {
    return documents
      .filter((document) => (document.studyMeta?.relatedDocIds || []).includes(docId) && document.id !== docId)
      .map((document) => document.id);
  };

  const getNeighborDocIds = useCallback((docId: string) => {
    const neighborIds = new Set<string>();
    const document = documentsById.get(docId);

    if (document) {
      const relatedDocIds = document.studyMeta?.relatedDocIds || [];

      for (const relatedDocId of relatedDocIds) {
        if (relatedDocId !== docId && documentsById.has(relatedDocId)) {
          neighborIds.add(relatedDocId);
        }
      }
    }

    for (const parentDocId of documents
      .filter((document) => (document.studyMeta?.relatedDocIds || []).includes(docId) && document.id !== docId)
      .map((document) => document.id)) {
      neighborIds.add(parentDocId);
    }

    return Array.from(neighborIds);
  }, [documents, documentsById]);

  const getConnectedDocs = useCallback((docId: string): Set<string> => {
    const visited = new Set<string>([docId]);
    const connected = new Set<string>();
    const directNeighbors = getNeighborDocIds(docId);

    if (!markTreeEnabled) {
      for (const neighborId of directNeighbors) {
        connected.add(neighborId);
      }

      return connected;
    }

    const traverse = (currentDocId: string) => {
      const neighborIds = getNeighborDocIds(currentDocId);

      for (const neighborId of neighborIds) {
        if (visited.has(neighborId)) {
          continue;
        }

        visited.add(neighborId);
        connected.add(neighborId);
        traverse(neighborId);
      }
    };

    traverse(docId);

    return connected;
  }, [getNeighborDocIds, markTreeEnabled]);

  const directConnectedDocIds = useMemo(() => {
    if (!selectedDocId) {
      return new Set<string>();
    }

    return new Set(getNeighborDocIds(selectedDocId));
  }, [getNeighborDocIds, selectedDocId]);

  const connectedDocIds = useMemo(() => {
    if (!selectedDocId) {
      return new Set<string>();
    }

    return getConnectedDocs(selectedDocId);
  }, [getConnectedDocs, selectedDocId]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return orderedDocuments;
    }

    return orderedDocuments
      .map((document) => {
        const tags = document.studyMeta?.tags || [];
        const titleMatch = document.title.toLowerCase().includes(normalizedQuery);
        const tagMatch = tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
        const contentMatch = document.content.toLowerCase().includes(normalizedQuery);

        if (!titleMatch && !tagMatch && !contentMatch) {
          return null;
        }

        return {
          document,
          rank: titleMatch ? 0 : tagMatch ? 1 : 2,
        };
      })
      .filter((entry): entry is { document: StudyLensDocument; rank: number } => entry !== null)
      .sort((left, right) => {
        if (left.rank !== right.rank) {
          return left.rank - right.rank;
        }

        return compareStudyDocuments(left.document, right.document);
      })
      .map((entry) => entry.document);
  }, [orderedDocuments, searchQuery]);

  const reorderEnabled = searchQuery.trim() === '' && !connectedOnly;

  const visibleDocuments = useMemo(() => {
    if (!connectedOnly || !selectedDocId) {
      return filteredDocuments;
    }

    return filteredDocuments.filter(
      (document) => document.id === selectedDocId || connectedDocIds.has(document.id)
    );
  }, [connectedDocIds, connectedOnly, filteredDocuments, selectedDocId]);

  const toggleExpanded = (documentId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);

      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }

      return next;
    });
  };

  const handleDocumentClick = (documentId: string) => {
    setSelectedDocId(documentId);
    toggleExpanded(documentId);
  };

  const handleTabSelect = (documentId: string) => {
    setSelectedDocId(documentId);
    setExpandedIds((previous) => {
      const next = new Set(previous);
      next.add(documentId);
      return next;
    });
  };

  const handleDragStart = (documentId: string) => {
    if (!reorderEnabled) {
      return;
    }

    setDraggedDocId(documentId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!reorderEnabled || !draggedDocId) {
      return;
    }

    event.preventDefault();
  };

  const handleDrop = (targetDocId: string) => {
    if (!reorderEnabled || !draggedDocId || draggedDocId === targetDocId) {
      setDraggedDocId(null);
      return;
    }

    setManualOrderIds((previous) => {
      const next = [...previous];
      const sourceIndex = next.indexOf(draggedDocId);
      const targetIndex = next.indexOf(targetDocId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return previous;
      }

      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, draggedDocId);
      return next;
    });
    setDraggedDocId(null);
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-10 rounded-xl border border-gray-200 bg-white/95 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLoadAllData()}
              disabled={isBulkLoadingData || !orgId || !userId || folderDocuments.length === 0 || allDocumentDataLoaded}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                allDocumentDataLoaded
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
              }`}
            >
              {isBulkLoadingData ? 'Loading...' : allDocumentDataLoaded ? 'Data Loaded' : 'Load Data'}
            </button>
            <button
              type="button"
              onClick={() => setMarkTreeEnabled((previous) => !previous)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                markTreeEnabled
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Mark Tree
            </button>
            <button
              type="button"
              onClick={() => setConnectedOnly((previous) => !previous)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                connectedOnly
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Connected Only
            </button>
          </div>
        </div>
      </div>

      {visibleDocuments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          No matching documents
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleDocuments.map((document) => {
            const isExpanded = expandedIds.has(document.id);
            const isSelected = selectedDocId === document.id;
            const isDirectlyConnected = directConnectedDocIds.has(document.id) && !isSelected;
            const tags = document.studyMeta?.tags || [];
            const parentDocuments = getParentDocIds(document.id)
              .map((parentDocId) => documentsById.get(parentDocId))
              .filter((relatedDocument): relatedDocument is StudyLensDocument => relatedDocument !== undefined);
            const childDocuments = getRelatedDocIds(document.id)
              .map((childDocId) => documentsById.get(childDocId))
              .filter((relatedDocument): relatedDocument is StudyLensDocument => relatedDocument !== undefined);
            const tabIds = new Set<string>();
            const tabs: ConnectionTab[] = [];

            parentDocuments.forEach((parentDocument, index) => {
              if (tabIds.has(parentDocument.id)) {
                return;
              }

              tabIds.add(parentDocument.id);
              tabs.push({
                id: parentDocument.id,
                label: index === 0 ? 'Parent' : `Parent ${index + 1}`,
                title: parentDocument.title,
              });
            });

            if (!tabIds.has(document.id)) {
              tabIds.add(document.id);
              tabs.push({
                id: document.id,
                label: 'Current',
                title: document.title,
              });
            }

            childDocuments.forEach((childDocument, index) => {
              if (tabIds.has(childDocument.id)) {
                return;
              }

              tabIds.add(childDocument.id);
              tabs.push({
                id: childDocument.id,
                label: `Child ${getAlphabetLabel(index)}`,
                title: childDocument.title,
              });
            });
            const hasRelatedDocuments = parentDocuments.length > 0 || childDocuments.length > 0;

            return (
              <StudyLensAccordionItem
                key={document.id}
                document={document}
                isExpanded={isExpanded}
                isSelected={isSelected}
                isDirectlyConnected={isDirectlyConnected}
                reorderEnabled={reorderEnabled}
                tags={tags}
                tabs={tabs}
                hasRelatedDocuments={hasRelatedDocuments}
                onDocumentClick={handleDocumentClick}
                onTabSelect={handleTabSelect}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}