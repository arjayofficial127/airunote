'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { toast } from '@/lib/toast';
import { InlineCanvasDocumentCard } from '../components/InlineCanvasDocumentCard';
import { useDocumentContent } from '../hooks/useDocumentContent';
import { useUpdateDocument } from '../hooks/useUpdateDocument';
import { airunoteApi } from '../services/airunoteApi';
import { useAirunoteStore } from '../stores/airunoteStore';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';
import type { AiruDocument, AiruDocumentMetadata, AiruFolder } from '../types';

interface StudyLensRendererProps {
  folderId: string;
}

interface StudyMeta {
  order?: number;
  tags?: string[];
  relatedDocIds?: string[];
  parentId?: string | null;
  color?: string;
}

interface StudyLensDocument {
  id: string;
  title: string;
  content: string;
  document: AiruDocument;
  studyMeta?: StudyMeta;
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
    parentId: typeof value.parentId === 'string' ? value.parentId : value.parentId === null ? null : undefined,
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

function normalizeTags(tags: string[]): string[] {
  const uniqueTags = new Set<string>();

  tags.forEach((tag) => {
    const normalizedTag = tag.trim().replace(/^#/, '');
    if (normalizedTag) {
      uniqueTags.add(normalizedTag);
    }
  });

  return Array.from(uniqueTags);
}

function parseTagsInput(value: string): string[] {
  return normalizeTags(value.split(',').flatMap((part) => part.split(' ')));
}

function getToolbarButtonClass(isActive: boolean, tone: 'neutral' | 'success' = 'neutral'): string {
  if (tone === 'success') {
    return isActive
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';
  }

  return isActive
    ? 'border-slate-900 bg-slate-900 text-white'
    : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';
}

interface NoteRowProps {
  document: StudyLensDocument;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isArrangeMode: boolean;
  parentDocument: StudyLensDocument | null;
  childCount: number;
  activeTag: string | null;
  onSelect: (documentId: string) => void;
  onToggleExpand: (documentId: string) => void;
  onTagClick: (tag: string) => void;
  onTitleSave: (documentId: string, nextTitle: string) => Promise<void>;
  onTagsSave: (documentId: string, nextTags: string[]) => Promise<void>;
  onParentClear: (documentId: string) => Promise<void>;
  onContentSave: (documentId: string, content: string) => Promise<void>;
  onDragStart: (documentId: string) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (targetDocId: string) => void;
  onDragEnd: () => void;
  children: ReactNode;
}

function NoteRow({
  document,
  level,
  isExpanded,
  isSelected,
  isArrangeMode,
  parentDocument,
  childCount,
  activeTag,
  onSelect,
  onToggleExpand,
  onTagClick,
  onTitleSave,
  onTagsSave,
  onParentClear,
  onContentSave,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: NoteRowProps) {
  const { document: loadedDocument, isLoading, error } = useDocumentContent(isExpanded ? document.id : null);
  const tags = useMemo(() => document.studyMeta?.tags ?? [], [document.studyMeta?.tags]);
  const [draftTitle, setDraftTitle] = useState(document.title);
  const [tagsInput, setTagsInput] = useState(tags.join(', '));
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  useEffect(() => {
    setDraftTitle(document.title);
  }, [document.title]);

  useEffect(() => {
    setTagsInput(tags.join(', '));
  }, [tags]);

  const handleTitleCommit = useCallback(async () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      setDraftTitle(document.title);
      return;
    }
    if (nextTitle === document.title || isSavingTitle) {
      return;
    }

    setIsSavingTitle(true);
    try {
      await onTitleSave(document.id, nextTitle);
    } finally {
      setIsSavingTitle(false);
    }
  }, [document.id, document.title, draftTitle, isSavingTitle, onTitleSave]);

  const handleTagsCommit = useCallback(async () => {
    if (isSavingTags) {
      return;
    }

    const nextTags = parseTagsInput(tagsInput);
    if (nextTags.join('|') === tags.join('|')) {
      return;
    }

    setIsSavingTags(true);
    try {
      await onTagsSave(document.id, nextTags);
    } finally {
      setIsSavingTags(false);
    }
  }, [document.id, isSavingTags, onTagsSave, tags, tagsInput]);

  const handleContentSave = useCallback(async (content: string) => {
    setIsSavingContent(true);
    try {
      await onContentSave(document.id, content);
    } finally {
      setIsSavingContent(false);
    }
  }, [document.id, onContentSave]);

  const indentStyle = { paddingLeft: `${level * 18}px` };
  const hasChildren = childCount > 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded-xl border ${isSelected ? 'border-slate-300 bg-slate-50' : 'border-slate-200/70 bg-white'}`}
        draggable={isArrangeMode}
        onDragStart={() => onDragStart(document.id)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(document.id)}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start gap-3 px-3 py-3" style={indentStyle}>
          <button
            type="button"
            onClick={() => onToggleExpand(document.id)}
            className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title={hasChildren ? (isExpanded ? 'Collapse children' : 'Expand children') : 'Open note'}
          >
            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true">
              ▶
            </span>
          </button>

          <button
            type="button"
            onMouseDown={() => onSelect(document.id)}
            className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-slate-400 ${
              isArrangeMode ? 'cursor-grab active:cursor-grabbing hover:border-slate-200 hover:bg-slate-50' : 'cursor-default'
            }`}
            title={isArrangeMode ? 'Drag to reorder or assign parent' : 'Select note'}
          >
            ≡
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={draftTitle}
                onFocus={() => onSelect(document.id)}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => void handleTitleCommit()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleTitleCommit();
                  }
                  if (event.key === 'Escape') {
                    setDraftTitle(document.title);
                    event.currentTarget.blur();
                  }
                }}
                className="min-w-[12rem] flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Untitled note"
              />
              {isSavingTitle ? <span className="text-[11px] text-slate-400">Saving</span> : null}
              {parentDocument ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                  <span>Child of {parentDocument.title}</span>
                  <button
                    type="button"
                    onClick={() => void onParentClear(document.id)}
                    className="text-slate-400 transition-colors hover:text-slate-700"
                    title="Remove parent"
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {tags.map((tag) => {
                const isActive = activeTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagClick(tag)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
              <input
                value={tagsInput}
                onFocus={() => onSelect(document.id)}
                onChange={(event) => setTagsInput(event.target.value)}
                onBlur={() => void handleTagsCommit()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleTagsCommit();
                  }
                }}
                placeholder="Add tags"
                className="min-w-[8rem] flex-1 border-0 bg-transparent px-0 text-xs text-slate-500 outline-none placeholder:text-slate-400"
              />
              {isSavingTags ? <span className="text-[11px] text-slate-400">Saving</span> : null}
            </div>
          </div>
        </div>

        {isExpanded ? (
          <div className="border-t border-slate-200/70 px-3 pb-3 pt-3" style={indentStyle}>
            <div className="ml-9 overflow-hidden rounded-lg border border-slate-200/70 bg-white">
              <InlineCanvasDocumentCard
                document={loadedDocument ?? document.document}
                isEditing
                isLoading={isLoading}
                error={error}
                isSaving={isSavingContent}
                onSave={handleContentSave}
                onCancel={() => undefined}
              />
            </div>
          </div>
        ) : null}
      </div>

      {isExpanded ? children : null}
    </div>
  );
}

export function StudyLensRenderer({ folderId }: StudyLensRendererProps) {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const { getDocumentsByFolder, getDocumentContentById, getFoldersByParent, setDocumentContent } = useAirunoteStore();
  const updateDocument = useUpdateDocument();
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [manualOrderIds, setManualOrderIds] = useState<string[]>([]);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [isBulkLoadingData, setIsBulkLoadingData] = useState(false);

  const folderDocuments = getDocumentsByFolder(folderId);
  const folderChildren = getFoldersByParent(folderId) as AiruFolder[];

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

  const documentsById = useMemo(() => new Map(documents.map((document) => [document.id, document])), [documents]);

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

  const getParentId = useCallback((document: StudyLensDocument): string | null => {
    const explicitParentId = document.studyMeta?.parentId;
    if (explicitParentId && documentsById.has(explicitParentId)) {
      return explicitParentId;
    }

    const derivedParent = documents.find(
      (candidate) => candidate.id !== document.id && (candidate.studyMeta?.relatedDocIds || []).includes(document.id)
    );

    return derivedParent?.id ?? null;
  }, [documents, documentsById]);

  const childIdsByParent = useMemo(() => {
    const childMap = new Map<string | null, string[]>();

    orderedDocuments.forEach((document) => {
      const parentId = getParentId(document);
      const key = parentId && documentsById.has(parentId) ? parentId : null;
      if (!childMap.has(key)) {
        childMap.set(key, []);
      }
      childMap.get(key)?.push(document.id);
    });

    return childMap;
  }, [documentsById, getParentId, orderedDocuments]);

  const getChildIds = useCallback((documentId: string) => childIdsByParent.get(documentId) || [], [childIdsByParent]);

  const getConnectedDocs = useCallback((documentId: string): Set<string> => {
    const connected = new Set<string>();
    const queue = [documentId];
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        continue;
      }

      const currentDocument = documentsById.get(currentId);
      const parentId = currentDocument ? getParentId(currentDocument) : null;
      const neighborIds = new Set<string>([
        ...(currentDocument?.studyMeta?.relatedDocIds || []),
        ...getChildIds(currentId),
        ...(parentId ? [parentId] : []),
      ]);

      neighborIds.forEach((neighborId) => {
        if (!documentsById.has(neighborId) || neighborId === documentId) {
          return;
        }

        connected.add(neighborId);
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    return connected;
  }, [documentsById, getChildIds, getParentId]);

  const connectedDocIds = useMemo(() => {
    if (!selectedDocId) {
      return new Set<string>();
    }

    return getConnectedDocs(selectedDocId);
  }, [getConnectedDocs, selectedDocId]);

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

      toast(`Loaded ${response.data.documents.length} note${response.data.documents.length === 1 ? '' : 's'}`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load document data', 'error');
    } finally {
      setIsBulkLoadingData(false);
    }
  }, [folderDocuments.length, folderId, isBulkLoadingData, orgId, setDocumentContent, userId]);

  const persistDocument = useCallback(async (
    documentId: string,
    updates: { name?: string; content?: string; studyMeta?: StudyMeta }
  ) => {
    const existing = documentsById.get(documentId);
    if (!existing || !orgId || !userId) {
      return;
    }

    const requestAttributes = updates.studyMeta
      ? {
          ...(existing.document.attributes || {}),
          studyMeta: updates.studyMeta,
        }
      : undefined;

    await updateDocument.mutateAsync({
      documentId,
      request: {
        orgId,
        userId,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.content !== undefined ? { content: updates.content } : {}),
        ...(requestAttributes ? { attributes: requestAttributes } : {}),
      },
    });
  }, [documentsById, orgId, updateDocument, userId]);

  const updateStudyMeta = useCallback(async (documentId: string, nextStudyMeta: StudyMeta) => {
    await persistDocument(documentId, { studyMeta: nextStudyMeta });
  }, [persistDocument]);

  const handleTitleSave = useCallback(async (documentId: string, nextTitle: string) => {
    await persistDocument(documentId, { name: nextTitle });
  }, [persistDocument]);

  const handleTagsSave = useCallback(async (documentId: string, nextTags: string[]) => {
    const document = documentsById.get(documentId);
    if (!document) {
      return;
    }

    await updateStudyMeta(documentId, {
      ...document.studyMeta,
      tags: nextTags,
      parentId: getParentId(document),
    });
  }, [documentsById, getParentId, updateStudyMeta]);

  const handleParentClear = useCallback(async (documentId: string) => {
    const document = documentsById.get(documentId);
    if (!document) {
      return;
    }

    const parentId = getParentId(document);
    await updateStudyMeta(documentId, {
      ...document.studyMeta,
      parentId: null,
      relatedDocIds: (document.studyMeta?.relatedDocIds || []).filter((relatedId) => relatedId !== parentId),
    });

    if (!parentId) {
      return;
    }

    const parentDocument = documentsById.get(parentId);
    if (!parentDocument) {
      return;
    }

    await updateStudyMeta(parentId, {
      ...parentDocument.studyMeta,
      relatedDocIds: (parentDocument.studyMeta?.relatedDocIds || []).filter((relatedId) => relatedId !== documentId),
      parentId: getParentId(parentDocument),
    });
  }, [documentsById, getParentId, updateStudyMeta]);

  const handleContentSave = useCallback(async (documentId: string, content: string) => {
    await persistDocument(documentId, { content });
  }, [persistDocument]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return orderedDocuments.filter((document) => {
      const tags = document.studyMeta?.tags || [];
      const matchesTagFilter = activeTag ? tags.includes(activeTag) : true;
      const matchesSearch = normalizedQuery.length === 0
        || document.title.toLowerCase().includes(normalizedQuery)
        || tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        || document.content.toLowerCase().includes(normalizedQuery);

      if (!matchesTagFilter || !matchesSearch) {
        return false;
      }

      if (!connectedOnly || !selectedDocId) {
        return true;
      }

      return document.id === selectedDocId || connectedDocIds.has(document.id);
    });
  }, [activeTag, connectedDocIds, connectedOnly, orderedDocuments, searchQuery, selectedDocId]);

  const filteredFolders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return folderChildren;
    }

    return folderChildren.filter((folder) => {
      const typeLabel = folder.type ? folder.type.toLowerCase() : '';
      return folder.humanId.toLowerCase().includes(normalizedQuery) || typeLabel.includes(normalizedQuery);
    });
  }, [folderChildren, searchQuery]);

  const visibleDocumentIds = useMemo(() => new Set(filteredDocuments.map((document) => document.id)), [filteredDocuments]);

  const rootDocuments = useMemo(() => {
    return filteredDocuments.filter((document) => {
      const parentId = getParentId(document);
      return !parentId || !visibleDocumentIds.has(parentId);
    });
  }, [filteredDocuments, getParentId, visibleDocumentIds]);

  const handleToggleExpand = useCallback((documentId: string) => {
    setSelectedDocId(documentId);
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((documentId: string) => {
    setSelectedDocId(documentId);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((previous) => (previous === tag ? null : tag));
  }, []);

  const handleDragStart = useCallback((documentId: string) => {
    setDraggedDocId(documentId);
    setSelectedDocId(documentId);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!draggedDocId) {
      return;
    }

    event.preventDefault();
  }, [draggedDocId]);

  const handleDrop = useCallback(async (targetDocId: string) => {
    if (!draggedDocId || draggedDocId === targetDocId) {
      setDraggedDocId(null);
      return;
    }

    if (!arrangeMode) {
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
      return;
    }

    const draggedDocument = documentsById.get(draggedDocId);
    const targetDocument = documentsById.get(targetDocId);
    if (!draggedDocument || !targetDocument) {
      setDraggedDocId(null);
      return;
    }

    const previousParentId = getParentId(draggedDocument);
    await updateStudyMeta(draggedDocId, {
      ...draggedDocument.studyMeta,
      parentId: targetDocId,
      relatedDocIds: Array.from(new Set([...(draggedDocument.studyMeta?.relatedDocIds || []), targetDocId])).filter(
        (relatedId) => relatedId !== previousParentId
      ),
    });

    await updateStudyMeta(targetDocId, {
      ...targetDocument.studyMeta,
      relatedDocIds: Array.from(new Set([...(targetDocument.studyMeta?.relatedDocIds || []), draggedDocId])),
      parentId: getParentId(targetDocument),
    });

    if (previousParentId && previousParentId !== targetDocId) {
      const previousParent = documentsById.get(previousParentId);
      if (previousParent) {
        await updateStudyMeta(previousParentId, {
          ...previousParent.studyMeta,
          relatedDocIds: (previousParent.studyMeta?.relatedDocIds || []).filter((relatedId) => relatedId !== draggedDocId),
          parentId: getParentId(previousParent),
        });
      }
    }

    setExpandedIds((previous) => new Set(previous).add(targetDocId));
    setDraggedDocId(null);
  }, [arrangeMode, documentsById, draggedDocId, getParentId, updateStudyMeta]);

  const renderDocument = useCallback((document: StudyLensDocument, level: number): ReactNode => {
    const parentId = getParentId(document);
    const parentDocument = parentId ? documentsById.get(parentId) || null : null;
    const childDocuments = getChildIds(document.id)
      .map((childId) => documentsById.get(childId))
      .filter((childDocument): childDocument is StudyLensDocument => Boolean(childDocument) && visibleDocumentIds.has(childDocument!.id));

    return (
      <NoteRow
        key={document.id}
        document={document}
        level={level}
        isExpanded={expandedIds.has(document.id)}
        isSelected={selectedDocId === document.id}
        isArrangeMode={arrangeMode}
        parentDocument={parentDocument}
        childCount={childDocuments.length}
        activeTag={activeTag}
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        onTagClick={handleTagClick}
        onTitleSave={handleTitleSave}
        onTagsSave={handleTagsSave}
        onParentClear={handleParentClear}
        onContentSave={handleContentSave}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={(targetDocId) => void handleDrop(targetDocId)}
        onDragEnd={() => setDraggedDocId(null)}
      >
        <div className="flex flex-col gap-2">
          {childDocuments.map((childDocument) => renderDocument(childDocument, level + 1))}
        </div>
      </NoteRow>
    );
  }, [activeTag, arrangeMode, documentsById, expandedIds, getChildIds, getParentId, handleContentSave, handleDragOver, handleDragStart, handleDrop, handleParentClear, handleSelect, handleTagClick, handleTagsSave, handleTitleSave, handleToggleExpand, selectedDocId, visibleDocumentIds]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-6 py-4 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xl">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search notes..."
            className="h-11 w-full rounded-xl bg-transparent pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleLoadAllData()}
            disabled={isBulkLoadingData || !orgId || !userId || folderDocuments.length === 0 || allDocumentDataLoaded}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${getToolbarButtonClass(allDocumentDataLoaded, 'success')}`}
            title="Load all notes for content search and inline editing"
          >
            {isBulkLoadingData ? 'Loading...' : allDocumentDataLoaded ? 'Loaded' : 'Load'}
          </button>
          <button
            type="button"
            onClick={() => setConnectedOnly((previous) => !previous)}
            aria-pressed={connectedOnly}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${getToolbarButtonClass(connectedOnly)}`}
            title="Show only notes related to the current selection"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => setArrangeMode((previous) => !previous)}
            aria-pressed={arrangeMode}
            className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${getToolbarButtonClass(arrangeMode)}`}
            title="Drag to reorder notes or drop one note on another to assign a parent"
          >
            Arrange
          </button>
        </div>
      </div>

      {activeTag ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Filtering by</span>
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] text-white"
          >
            #{activeTag} ×
          </button>
        </div>
      ) : null}

      {filteredFolders.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredFolders.map((folder) => (
            <a
              key={folder.id}
              href={`/orgs/${orgSession.activeOrgId}/airunote/folder/${folder.id}`}
              className="group rounded-xl border border-slate-200/70 bg-white px-4 py-3 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">{getFolderTypeIcon(folder.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{folder.humanId}</div>
                  <div className="mt-1 text-xs text-slate-500">{folder.type ? folder.type.charAt(0).toUpperCase() + folder.type.slice(1) : 'Folder'}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : null}

      {filteredDocuments.length === 0 ? (
        <div className="px-2 py-10 text-center text-sm text-slate-500">No notes match the current search or filter.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {rootDocuments.map((document) => renderDocument(document, 0))}
        </div>
      )}
    </div>
  );
}