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

function getToolbarButtonClass(isActive: boolean, tone: 'neutral' | 'success' = 'neutral'): string {
  if (tone === 'success') {
    return isActive
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
      : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';
  }

  return isActive
    ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
    : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';
}

interface StudyLensAccordionItemProps {
  document: StudyLensDocument;
  position: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDirectlyConnected: boolean;
  reorderEnabled: boolean;
  tags: string[];
  tabs: ConnectionTab[];
  hasRelatedDocuments: boolean;
  relatedCount: number;
  onDocumentClick: (documentId: string) => void;
  onTabSelect: (documentId: string) => void;
  onDragStart: (documentId: string) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (documentId: string) => void;
  onDragEnd: () => void;
}

function StudyLensAccordionItem({
  document,
  position,
  isExpanded,
  isSelected,
  isDirectlyConnected,
  reorderEnabled,
  tags,
  tabs,
  hasRelatedDocuments,
  relatedCount,
  onDocumentClick,
  onTabSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: StudyLensAccordionItemProps) {
  const { document: loadedDocument, isLoading, error } = useDocumentContent(isExpanded ? document.id : null);
  const hasLoadedContent = Boolean((loadedDocument ?? document.document).content?.trim());

  const containerClassName = isSelected
    ? 'group overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-sky-100/80 transition-all duration-200'
    : isDirectlyConnected
      ? 'group overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-amber-100/80 transition-all duration-200'
      : 'group overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]';
  const rowClassName = isSelected
    ? 'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors bg-sky-50/60 hover:bg-sky-50/80 sm:px-5'
    : isDirectlyConnected
      ? 'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors bg-amber-50/60 hover:bg-amber-50/80 sm:px-5'
      : 'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/80 sm:px-5';
  const relationToneClassName = isSelected
    ? 'border-sky-200 bg-sky-100/80 text-sky-700'
    : isDirectlyConnected
      ? 'border-amber-200 bg-amber-100/80 text-amber-700'
      : 'border-slate-200/80 bg-slate-100 text-slate-600';

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
        <div className="flex flex-col items-center gap-2 pt-0.5">
          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold tracking-[0.14em] ${relationToneClassName}`}>
            {getAlphabetLabel(position)}
          </span>
          <span
            className={`text-xs text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            ▶
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900">{document.title}</div>
            {relatedCount > 0 ? (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${relationToneClassName}`}>
                {relatedCount} link{relatedCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>{relatedCount > 0 ? 'Connected note' : 'Standalone note'}</span>
            <span>{hasLoadedContent ? 'Content loaded' : 'Metadata only'}</span>
            {reorderEnabled ? <span>Drag enabled</span> : null}
          </div>
        </div>
        {document.studyMeta?.color ? (
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
            style={{ backgroundColor: document.studyMeta.color }}
            aria-hidden="true"
          />
        ) : null}
        {tags.length > 0 ? (
          <span className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-slate-600">
                #{tag}
              </span>
            ))}
            {tags.length > 2 ? <span className="text-[11px] text-slate-400">+{tags.length - 2}</span> : null}
          </span>
        ) : null}
      </button>

      {isExpanded ? (
        <div className="border-t border-slate-200/80 bg-slate-50/40 px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 font-medium text-slate-600">
              {hasRelatedDocuments ? `${relatedCount} connected note${relatedCount === 1 ? '' : 's'}` : 'No connected notes'}
            </span>
            <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 font-medium text-slate-600">
              {hasLoadedContent ? 'Ready for content search' : 'Load full data for content search'}
            </span>
          </div>
          {tags.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {isSelected ? (
            <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabSelect(tab.id)}
                    title={tab.title}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      tab.id === document.id
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {!hasRelatedDocuments ? (
                <div className="mt-3 text-xs text-slate-500">No related documents</div>
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

  const loadedDocumentCount = useMemo(() => {
    return folderDocuments.filter((document) => Boolean(getDocumentContentById(document.id))).length;
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

  const selectedDocument = useMemo(() => {
    if (!selectedDocId) {
      return null;
    }

    return documentsById.get(selectedDocId) || null;
  }, [documentsById, selectedDocId]);

  const selectedParentCount = useMemo(() => {
    if (!selectedDocId) {
      return 0;
    }

    return documents.filter(
      (document) => (document.studyMeta?.relatedDocIds || []).includes(selectedDocId) && document.id !== selectedDocId
    ).length;
  }, [documents, selectedDocId]);

  const selectedChildCount = useMemo(() => {
    if (!selectedDocument) {
      return 0;
    }

    return (selectedDocument.studyMeta?.relatedDocIds || []).filter(
      (relatedDocId) => relatedDocId !== selectedDocument.id && documentsById.has(relatedDocId)
    ).length;
  }, [documentsById, selectedDocument]);

  const selectedTagCount = selectedDocument?.studyMeta?.tags?.length || 0;
  const connectionModeLabel = markTreeEnabled ? 'Recursive tree' : 'Direct neighbors';
  const searchModeLabel = allDocumentDataLoaded ? 'Full content search' : 'Metadata-first search';

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
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_30%)]" />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-6 lg:px-8">
      <div className="sticky top-0 z-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Study View</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.02em] text-slate-900">Focus on connections, not just document lists</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{visibleDocuments.length}</span>
                  <span>{visibleDocuments.length === 1 ? 'document visible' : 'documents visible'}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" aria-hidden="true" />
                  <span>{loadedDocumentCount}/{folderDocuments.length} loaded</span>
                  {reorderEnabled ? (
                    <>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" aria-hidden="true" />
                      <span>Drag to reorder</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLoadAllData()}
                  disabled={isBulkLoadingData || !orgId || !userId || folderDocuments.length === 0 || allDocumentDataLoaded}
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${getToolbarButtonClass(allDocumentDataLoaded, 'success')}`}
                >
                  {isBulkLoadingData ? 'Loading...' : allDocumentDataLoaded ? 'Data Loaded' : 'Load Data'}
                </button>
                <button
                  type="button"
                  onClick={() => setMarkTreeEnabled((previous) => !previous)}
                  aria-pressed={markTreeEnabled}
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${getToolbarButtonClass(markTreeEnabled)}`}
                >
                  Mark Tree
                </button>
                <button
                  type="button"
                  onClick={() => setConnectedOnly((previous) => !previous)}
                  aria-pressed={connectedOnly}
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200 ${getToolbarButtonClass(connectedOnly)}`}
                >
                  Connected Only
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Search Mode</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{searchModeLabel}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {allDocumentDataLoaded ? 'Titles, tags, and full note content are searchable.' : 'Titles and tags are always searchable; content search improves after loading data.'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Connection Scope</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{connectionModeLabel}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {markTreeEnabled ? 'Selection traces through the entire connected branch.' : 'Selection highlights only immediate parents and children.'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ordering</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{reorderEnabled ? 'Manual drag order' : 'Filtered order locked'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {reorderEnabled ? 'Drag cards to shape the study path.' : 'Clear search and Connected Only to reorder the sequence.'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Selection</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{selectedDocument ? selectedDocument.title : 'No note selected'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedDocument ? `${selectedParentCount} parent, ${selectedChildCount} child, ${selectedTagCount} tag${selectedTagCount === 1 ? '' : 's'}` : 'Expand a note to inspect its local study graph.'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-2xl">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search titles, tags, and loaded content"
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70"
                />
              </div>
              <div className="text-xs text-slate-500">
                Load all data to include full document content in search results.
              </div>
            </div>

            {selectedDocument ? (
              <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.98))] px-4 py-3.5 shadow-[0_12px_28px_rgba(14,165,233,0.08)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">Current Focus</div>
                    <div className="mt-1 truncate text-base font-semibold tracking-[-0.01em] text-slate-900">{selectedDocument.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="rounded-full border border-sky-200 bg-white/80 px-2.5 py-1">{selectedParentCount} parent{selectedParentCount === 1 ? '' : 's'}</span>
                      <span className="rounded-full border border-sky-200 bg-white/80 px-2.5 py-1">{selectedChildCount} child{selectedChildCount === 1 ? '' : 'ren'}</span>
                      <span className="rounded-full border border-sky-200 bg-white/80 px-2.5 py-1">{selectedTagCount} tag{selectedTagCount === 1 ? '' : 's'}</span>
                      <span className="rounded-full border border-sky-200 bg-white/80 px-2.5 py-1">{connectedDocIds.size} connected in scope</span>
                    </div>
                  </div>
                  <div className="max-w-xl text-sm leading-6 text-slate-600">
                    {connectedOnly
                      ? 'Connected Only is active, so the list is narrowed to this note and its visible graph.'
                      : 'Select another note to change the focus, or enable Connected Only to narrow the study path around this selection.'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {visibleDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="text-sm font-medium text-slate-700">No matching documents</div>
          <div className="mt-1 text-sm text-slate-500">Try a broader search or load document data for content-aware results.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Study Sequence</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">Accordion path with relationship-aware context</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1">{visibleDocuments.length} visible</span>
              <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1">{expandedIds.size} expanded</span>
              <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1">{connectedOnly ? 'Connection filter on' : 'All notes shown'}</span>
            </div>
          </div>
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
            const relatedCount = parentDocuments.length + childDocuments.length;

            return (
              <StudyLensAccordionItem
                key={document.id}
                document={document}
                position={manualOrderIds.length > 0 ? manualOrderIds.indexOf(document.id) : orderedDocuments.indexOf(document)}
                isExpanded={isExpanded}
                isSelected={isSelected}
                isDirectlyConnected={isDirectlyConnected}
                reorderEnabled={reorderEnabled}
                tags={tags}
                tabs={tabs}
                hasRelatedDocuments={hasRelatedDocuments}
                relatedCount={relatedCount}
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
    </div>
  );
}