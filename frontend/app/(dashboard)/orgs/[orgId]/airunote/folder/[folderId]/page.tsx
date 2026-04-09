/**
 * Folder View Page
 * Displays contents of a specific folder (child folders + documents)
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { airunoteApi } from '@/components/airunote/services/airunoteApi';
import { FolderViewLayout } from '@/components/airunote/components/FolderViewLayout';
import { CreateFolderModal } from '@/components/airunote/components/CreateFolderModal';
import { CreateDocumentModal } from '@/components/airunote/components/CreateDocumentModal';
import { CreateFolderLensModal } from '@/components/airunote/components/CreateFolderLensModal';
import { EditLensModal } from '@/components/airunote/components/EditLensModal';
import { MoveFolderModal } from '@/components/airunote/components/MoveFolderModal';
import { MoveDocumentModal } from '@/components/airunote/components/MoveDocumentModal';
import { PasteDock } from '@/components/airunote/components/PasteDock';
import { DeleteConfirmationModal } from '@/components/airunote/components/DeleteConfirmationModal';
import { DocumentListSkeleton } from '@/components/airunote/components/LoadingSkeleton';
import { ErrorState } from '@/components/airunote/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteFolder } from '@/components/airunote/hooks/useDeleteFolder';
import { useDeleteDocument } from '@/components/airunote/hooks/useDeleteDocument';
import { useFolderLenses, useLens, useUpdateLensItems, useUpdateFolderLens, useDeleteLens, useSetFolderDefaultLens } from '@/hooks/useAirunoteLenses';
import { buildLensProjection } from '@/components/airunote/utils/lensProjection';
import { BoardLens } from '@/components/airunote/lenses/BoardLens';
import {
  CanvasLens,
  type CanvasArrangementRequest,
  type CanvasContentInset,
  type CanvasNavigationRequest,
  type CanvasNavigatorPanelItem,
  type CanvasNavigatorPanelMode,
  type CanvasNavigatorState,
  type CanvasNotesRequest,
  type CanvasPendingChangesState,
} from '@/components/airunote/lenses/CanvasLens';
import { StudyLensRenderer } from '@/components/airunote/lenses/StudyLensRenderer';
import { CreateEntryActions } from '@/components/airunote/components/CreateEntryActions';
import { LensToolbar } from '@/components/airunote/components/LensToolbar';
import { FolderCanvasTopOverlay } from './_components/FolderCanvasTopOverlay';
import {
  type CanvasArrangePreset,
} from '@/components/airunote/utils/canvasArrange';
import {
  buildLensCanvasThemeFromPreset,
  buildLensMetadataWithCanvasTheme,
  getDefaultCanvasThemeCustomColor,
  readLensCanvasTheme,
  type CanvasThemeMode,
  type LensAppearancePresetId,
  type LensCanvasTheme,
} from '@/components/airunote/utils/canvasTheme';
import type { FolderCanvasPdfExportItem } from '@/components/airunote/utils/exportFolderCanvasPdf';
import Link from 'next/link';
import type { AiruFolder, AiruDocument } from '@/components/airunote/types';
import type { AiruLens } from '@/lib/api/airunoteLensesApi';
import type { LensItemInput } from '@/lib/api/airunoteLensesApi';

export default function FolderViewPage() {
  const params = useParams();
  const router = useRouter();
  const folderId: string | null = typeof params.folderId === 'string' ? params.folderId : null;
  const orgIdFromParams = params.orgId as string;

  const orgSession = useOrgSession();
  const authSession = useAuthSession();

  // ✅ Use activeOrgId from session (single source of truth)
  const orgId = orgSession.activeOrgId;
  const userId = authSession.user?.id;

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [isCreateLensModalOpen, setIsCreateLensModalOpen] = useState(false);
  const [isEditLensModalOpen, setIsEditLensModalOpen] = useState(false);
  const [editingLens, setEditingLens] = useState<AiruLens | null>(null);
  const [deleteLensModal, setDeleteLensModal] = useState<AiruLens | null>(null);
  const [isPasteDockOpen, setIsPasteDockOpen] = useState(false);
  const [moveFolderModal, setMoveFolderModal] = useState<AiruFolder | null>(null);
  const [moveDocumentModal, setMoveDocumentModal] = useState<AiruDocument | null>(null);
  const [deleteFolderModal, setDeleteFolderModal] = useState<AiruFolder | null>(null);
  const [deleteDocumentModal, setDeleteDocumentModal] = useState<AiruDocument | null>(null);
  const [canvasPendingChanges, setCanvasPendingChanges] = useState<CanvasPendingChangesState>({
    hasPendingChanges: false,
    changedCount: 0,
    stagedItems: [],
  });
  const [canvasCommitKey, setCanvasCommitKey] = useState(0);
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const [isSavingCanvasChanges, setIsSavingCanvasChanges] = useState(false);
  const [canvasArrangementRequest, setCanvasArrangementRequest] = useState<CanvasArrangementRequest | null>(null);
  const [canvasNavigationRequest, setCanvasNavigationRequest] = useState<CanvasNavigationRequest | null>(null);
  const [isCanvasNavigatorOpen, setIsCanvasNavigatorOpen] = useState(false);
  const [canvasNavigatorPresentation, setCanvasNavigatorPresentation] = useState<'overlay' | 'panel'>('overlay');
  const [canvasNavigatorPanelMode, setCanvasNavigatorPanelMode] = useState<CanvasNavigatorPanelMode>('preview');
  const [canvasNavigatorQuery, setCanvasNavigatorQuery] = useState('');
  const [canvasNavigatorState, setCanvasNavigatorState] = useState<CanvasNavigatorState>({
    activeItemId: null,
    focusedItemId: null,
    editingItemId: null,
    editingItemIds: [],
    dirtyItemIds: [],
    inlineDiffByItemId: {},
  });
  const [canvasNotesRequest, setCanvasNotesRequest] = useState<CanvasNotesRequest | null>(null);
  const [isSavingCanvasNotes, setIsSavingCanvasNotes] = useState(false);
  const [isSavingCanvasTheme, setIsSavingCanvasTheme] = useState(false);
  const [canvasThemeOverride, setCanvasThemeOverride] = useState<LensCanvasTheme | null>(null);
  const [canvasNotesFeedback, setCanvasNotesFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [canvasThemeFeedback, setCanvasThemeFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [canvasThemeColorDraft, setCanvasThemeColorDraft] = useState(getDefaultCanvasThemeCustomColor());
  const [isExportingCanvasPdf, setIsExportingCanvasPdf] = useState(false);
  const [canvasContentInset, setCanvasContentInset] = useState<CanvasContentInset>({
    top: 168,
    right: 272,
    bottom: 32,
    left: 32,
  });
  const [canvasSaveFeedback, setCanvasSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const topLeftOverlayRef = useRef<HTMLDivElement | null>(null);
  const topRightToolbarRef = useRef<HTMLDivElement | null>(null);

  const deleteFolder = useDeleteFolder();
  const deleteDocument = useDeleteDocument();

  // Get data from store (metadata loaded by AirunoteDataProvider)
  const {
    getFolderById,
    getDocumentContentById,
    getFilteredFolders,
    getFilteredDocuments,
    getFoldersByParent,
    getDocumentsByFolder,
    isLoading,
    error,
  } = useAirunoteStore();

  // Get current folder
  const currentFolder = folderId ? getFolderById(folderId) : null;

  // Fetch folder lenses
  const { data: folderLenses = [], isLoading: isLoadingLenses, refetch: refetchFolderLenses } = useFolderLenses(
    orgId || undefined,
    folderId || undefined
  );

  // Determine active lens
  const activeLensId = useMemo(() => {
    if (!currentFolder || !folderLenses.length) return null;
    
    // Priority 1: folder.defaultLensId (if it exists in folder metadata or type)
    const folderWithDefaultLens = currentFolder as AiruFolder & { defaultLensId?: string | null };
    if (folderWithDefaultLens.defaultLensId) {
      const defaultLens = folderLenses.find((l) => l.id === folderWithDefaultLens.defaultLensId);
      if (defaultLens) return defaultLens.id;
    }
    
    // Priority 2: first default lens in list
    const defaultLens = folderLenses.find((l) => l.isDefault);
    if (defaultLens) return defaultLens.id;
    
    // Priority 3: first lens in list
    if (folderLenses.length > 0) {
      return folderLenses[0].id;
    }
    
    return null;
  }, [currentFolder, folderLenses]);

  // Local state for lens switching
  const [selectedLensId, setSelectedLensId] = useState<string | null>(activeLensId);
  const [desiredViewMode, setDesiredViewMode] = useState<'grid' | 'tree' | null>(null);

  // Update selected lens when active lens changes
  useEffect(() => {
    if (desiredViewMode === null && activeLensId !== null && selectedLensId === null) {
      setSelectedLensId(activeLensId);
    }
  }, [activeLensId, desiredViewMode, selectedLensId]);

  // Fetch active lens data
  const { data: lensData, isLoading: isLoadingLens } = useLens(
    orgId || undefined,
    selectedLensId || undefined
  );

  // Hook for updating lens items
  const updateLensItems = useUpdateLensItems(orgId || undefined, selectedLensId || undefined);
  
  // Hook for updating folder lens
  const updateFolderLens = useUpdateFolderLens(orgId || undefined, folderId || undefined);
  
  // Hook for deleting lens
  const deleteLens = useDeleteLens(orgId || undefined, folderId || undefined);

  // Hook for setting default lens for this folder
  const setFolderDefaultLens = useSetFolderDefaultLens(orgId || undefined, folderId || undefined);

  // Build lens projection when lens data is available
  const lensProjection = useMemo(() => {
    if (!lensData || !selectedLensId) return null;

    const children = {
      folders: getFilteredFolders(folderId || ''),
      documents: getFilteredDocuments(folderId || ''),
    };

    const projection = buildLensProjection(children, lensData.items, lensData.lens.type as 'board' | 'canvas' | 'book');

    return projection;
  }, [lensData, selectedLensId, folderId, getFilteredFolders, getFilteredDocuments]);

  // Prepare children for BoardLens and CanvasLens
  // Use direct store methods to avoid stale closure issues
  const boardChildren = useMemo(() => {
    if (!folderId) return [];
    
    // Use direct store methods instead of filtered versions to ensure we get all items
    // Filtered versions might be affected by search query or other state
    const folders = getFoldersByParent(folderId);
    const documents = getDocumentsByFolder(folderId);

    return [
      ...folders.map((f) => ({
        id: f.id,
        type: 'folder' as const,
        title: f.humanId,
        humanId: f.humanId,
      })),
      ...documents.map((d) => ({
        id: d.id,
        type: 'document' as const,
        title: d.name,
        name: d.name,
      })),
    ];
  }, [folderId, getFoldersByParent, getDocumentsByFolder]);

  // Handle persist for board lens
  const handleBoardPersist = useCallback(async (items: LensItemInput[]) => {
    if (!updateLensItems.mutateAsync) return;
    await updateLensItems.mutateAsync({ items });
  }, [updateLensItems]);

  const handleCanvasPendingChangesChange = useCallback((state: CanvasPendingChangesState) => {
    setCanvasPendingChanges(state);
  }, []);

  const persistedCanvasTheme = useMemo(
    () => readLensCanvasTheme(lensData?.lens.metadata),
    [lensData?.lens.metadata]
  );
  const currentCanvasTheme = canvasThemeOverride ?? persistedCanvasTheme;

  useEffect(() => {
    setCanvasThemeOverride(null);
  }, [lensData?.lens.id]);

  useEffect(() => {
    if (!canvasThemeOverride) {
      return;
    }

    if (
      canvasThemeOverride.mode === persistedCanvasTheme.mode &&
      canvasThemeOverride.customColor === persistedCanvasTheme.customColor &&
      canvasThemeOverride.presetId === persistedCanvasTheme.presetId
    ) {
      setCanvasThemeOverride(null);
    }
  }, [canvasThemeOverride, persistedCanvasTheme.customColor, persistedCanvasTheme.mode, persistedCanvasTheme.presetId]);

  useEffect(() => {
    setCanvasThemeColorDraft(currentCanvasTheme.customColor ?? getDefaultCanvasThemeCustomColor());
  }, [currentCanvasTheme.customColor]);

  useEffect(() => {
    if (!canvasSaveFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCanvasSaveFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [canvasSaveFeedback]);

  useEffect(() => {
    if (!canvasNotesFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCanvasNotesFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [canvasNotesFeedback]);

  useEffect(() => {
    if (!canvasThemeFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCanvasThemeFeedback(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [canvasThemeFeedback]);

  useEffect(() => {
    if (!isCanvasNavigatorOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsCanvasNavigatorOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCanvasNavigatorOpen]);

  const handleSaveAllCanvasChanges = useCallback(async () => {
    if (!canvasPendingChanges.hasPendingChanges || canvasPendingChanges.stagedItems.length === 0) {
      return;
    }

    setIsSavingCanvasChanges(true);
    setCanvasSaveFeedback(null);

    try {
      await handleBoardPersist(canvasPendingChanges.stagedItems);
      setCanvasCommitKey((prev) => prev + 1);
      setCanvasSaveFeedback({
        type: 'success',
        message: `Saved ${canvasPendingChanges.changedCount} change${canvasPendingChanges.changedCount === 1 ? '' : 's'}`,
      });
    } catch (error) {
      console.error('Failed to save all canvas changes:', error);
      setCanvasSaveFeedback({
        type: 'error',
        message: 'Failed to save canvas changes',
      });
    } finally {
      setIsSavingCanvasChanges(false);
    }
  }, [canvasPendingChanges, handleBoardPersist]);

  const handleDiscardCanvasChanges = useCallback(() => {
    if (!canvasPendingChanges.hasPendingChanges || isSavingCanvasChanges) {
      return;
    }

    setCanvasSaveFeedback(null);
    setCanvasResetKey((prev) => prev + 1);
  }, [canvasPendingChanges.hasPendingChanges, isSavingCanvasChanges]);

  const handleArrangeCanvas = useCallback((preset: CanvasArrangePreset) => {
    setCanvasSaveFeedback(null);
    setCanvasArrangementRequest({
      preset,
      key: Date.now(),
    });
  }, []);

  const handleCanvasNavigatorJump = useCallback((itemId: string) => {
    setCanvasNavigationRequest({
      itemId,
      key: Date.now(),
    });
  }, []);

  const handleEditAllCanvasNotes = useCallback(() => {
    setCanvasNotesFeedback(null);
    setCanvasNotesRequest({
      action: 'edit-all',
      key: Date.now(),
    });
  }, []);

  const handleSaveCanvasNotes = useCallback(() => {
    setCanvasNotesFeedback(null);
    setIsSavingCanvasNotes(true);
    setCanvasNotesRequest({
      action: 'save',
      key: Date.now(),
    });
  }, []);

  const handleCancelCanvasNotes = useCallback(() => {
    setCanvasNotesFeedback(null);
    setCanvasNotesRequest({
      action: 'cancel',
      key: Date.now(),
    });
  }, []);

  const handleCanvasNotesActionComplete = useCallback(
    (result: {
      action: CanvasNotesRequest['action'];
      editedCount?: number;
      savedCount?: number;
      failedCount?: number;
      canceledCount?: number;
    }) => {
      if (result.action === 'edit-all') {
        setCanvasNotesFeedback({
          type: 'success',
          message:
            (result.editedCount ?? 0) > 0
              ? `Editing ${result.editedCount} note${result.editedCount === 1 ? '' : 's'}`
              : 'No editable notes on this canvas',
        });
        return;
      }

      if (result.action === 'save') {
        setIsSavingCanvasNotes(false);

        if ((result.failedCount ?? 0) > 0) {
          setCanvasNotesFeedback({
            type: 'error',
            message: `Saved ${result.savedCount ?? 0}, failed ${result.failedCount}`,
          });
          return;
        }

        setCanvasNotesFeedback({
          type: 'success',
          message:
            (result.savedCount ?? 0) > 0
              ? `Saved ${result.savedCount} note${result.savedCount === 1 ? '' : 's'}`
              : 'No unsaved notes',
        });
        return;
      }

      setCanvasNotesFeedback({
        type: 'success',
        message:
          (result.canceledCount ?? 0) > 0
            ? `Canceled ${result.canceledCount} note${result.canceledCount === 1 ? '' : 's'}`
            : 'No active note editors',
      });
    },
    []
  );

  const persistCanvasTheme = useCallback(
    async (nextTheme: LensCanvasTheme) => {
      if (!lensData || !folderId) {
        return;
      }

      const previousTheme = currentCanvasTheme;
      setCanvasThemeOverride(nextTheme);
      setIsSavingCanvasTheme(true);
      setCanvasThemeFeedback(null);

      try {
        await updateFolderLens.mutateAsync({
          lensId: lensData.lens.id,
          data: {
            metadata: buildLensMetadataWithCanvasTheme(lensData.lens.metadata, nextTheme),
          },
        });
        setCanvasThemeFeedback({
          type: 'success',
          message: 'Canvas theme saved',
        });
      } catch (error) {
        setCanvasThemeOverride(previousTheme);
        console.error('Failed to save canvas theme:', error);
        setCanvasThemeFeedback({
          type: 'error',
          message: 'Failed to save canvas theme',
        });
      } finally {
        setIsSavingCanvasTheme(false);
      }
    },
    [currentCanvasTheme, folderId, lensData, updateFolderLens]
  );

  const handleCanvasThemeModeChange = useCallback(
    (mode: CanvasThemeMode) => {
      void persistCanvasTheme({
        mode,
        customColor: mode === 'custom-color' ? canvasThemeColorDraft : null,
        presetId: null,
      });
    },
    [canvasThemeColorDraft, persistCanvasTheme]
  );

  const handleCanvasPresetChange = useCallback(
    (presetId: LensAppearancePresetId | null) => {
      if (!presetId) {
        void persistCanvasTheme({
          mode: currentCanvasTheme.mode,
          customColor: currentCanvasTheme.customColor ?? null,
          presetId: null,
        });
        return;
      }

      void persistCanvasTheme(buildLensCanvasThemeFromPreset(presetId));
    },
    [currentCanvasTheme.customColor, currentCanvasTheme.mode, persistCanvasTheme]
  );

  const handleApplyCanvasThemeColor = useCallback(() => {
    if (currentCanvasTheme.mode !== 'custom-color') {
      return;
    }

    void persistCanvasTheme({
      mode: 'custom-color',
      customColor: canvasThemeColorDraft,
      presetId: null,
    });
  }, [canvasThemeColorDraft, currentCanvasTheme.mode, persistCanvasTheme]);

  const handleExportCanvasPdf = useCallback(async () => {
    if (!orgId || !userId || !currentFolder || boardChildren.length === 0) {
      return;
    }

    setIsExportingCanvasPdf(true);
    setCanvasSaveFeedback(null);

    try {
      const exportItems = await Promise.all(
        boardChildren.map(async (item): Promise<FolderCanvasPdfExportItem> => {
          if (item.type === 'folder') {
            return {
              id: item.id,
              type: 'folder',
              title: item.title,
            };
          }

          const cachedDocument = getDocumentContentById(item.id);
          const hasUnsavedLocalChanges = canvasNavigatorState.dirtyItemIds.includes(item.id);

          if (cachedDocument) {
            return {
              id: item.id,
              type: 'document',
              title: cachedDocument.name || item.title,
              documentType: cachedDocument.type,
              content: cachedDocument.content,
              hasUnsavedLocalChanges,
            };
          }

          try {
            const response = await airunoteApi.getDocument(item.id, orgId, userId);
            const document = response.data.document;

            return {
              id: item.id,
              type: 'document',
              title: document.name || item.title,
              documentType: document.type,
              content: document.content,
              hasUnsavedLocalChanges,
            };
          } catch (error) {
            console.error('Failed to load document content for PDF export:', error);
            return {
              id: item.id,
              type: 'document',
              title: item.title,
              documentType: 'TXT',
              content: '',
              hasUnsavedLocalChanges,
              exportWarning: 'Document content could not be loaded and was omitted from the export.',
            };
          }
        })
      );

      const { exportFolderCanvasPdf } = await import('@/components/airunote/utils/exportFolderCanvasPdf');
      await exportFolderCanvasPdf({
        folderTitle: currentFolder.humanId,
        lensName: lensData?.lens.name,
        items: exportItems,
      });

      setCanvasSaveFeedback({
        type: 'success',
        message: 'PDF export started',
      });
    } catch (error) {
      console.error('Failed to export folder canvas PDF:', error);
      setCanvasSaveFeedback({
        type: 'error',
        message: 'Failed to export PDF',
      });
    } finally {
      setIsExportingCanvasPdf(false);
    }
  }, [boardChildren, canvasNavigatorState.dirtyItemIds, currentFolder, getDocumentContentById, lensData?.lens.name, orgId, userId]);

  const normalizedCanvasNavigatorQuery = canvasNavigatorQuery.trim().toLowerCase();
  const filteredCanvasNavigatorItems = useMemo(() => {
    if (!normalizedCanvasNavigatorQuery) {
      return boardChildren;
    }

    return boardChildren.filter((item) => item.title.toLowerCase().includes(normalizedCanvasNavigatorQuery));
  }, [boardChildren, normalizedCanvasNavigatorQuery]);

  const canvasNavigatorFolders = useMemo(
    () => filteredCanvasNavigatorItems.filter((item) => item.type === 'folder'),
    [filteredCanvasNavigatorItems]
  );

  const canvasNavigatorDocuments = useMemo(
    () => filteredCanvasNavigatorItems.filter((item) => item.type === 'document'),
    [filteredCanvasNavigatorItems]
  );
  const canvasNavigatorPanelItems = useMemo<CanvasNavigatorPanelItem[]>(
    () =>
      filteredCanvasNavigatorItems.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        isActive: canvasNavigatorState.activeItemId === item.id,
        isFocused: canvasNavigatorState.focusedItemId === item.id,
        isEditing: canvasNavigatorState.editingItemIds.includes(item.id),
        isDirty: canvasNavigatorState.dirtyItemIds.includes(item.id),
      })),
    [
      canvasNavigatorState.activeItemId,
      canvasNavigatorState.dirtyItemIds,
      canvasNavigatorState.editingItemIds,
      canvasNavigatorState.focusedItemId,
      filteredCanvasNavigatorItems,
    ]
  );
  const eligibleCanvasNoteCount = useMemo(
    () => boardChildren.filter((item) => item.type === 'document').length,
    [boardChildren]
  );
  const activeCanvasNoteEditCount = canvasNavigatorState.editingItemIds.length;
  const dirtyCanvasNoteCount = canvasNavigatorState.dirtyItemIds.length;
  const dirtyCanvasNoteChangedLineCount = useMemo(
    () =>
      canvasNavigatorState.dirtyItemIds.reduce(
        (total, itemId) => total + (canvasNavigatorState.inlineDiffByItemId[itemId]?.changedLineCount ?? 0),
        0
      ),
    [canvasNavigatorState.dirtyItemIds, canvasNavigatorState.inlineDiffByItemId]
  );
  const isCanvasThemeColorDirty =
    currentCanvasTheme.mode !== 'custom-color' ||
    (currentCanvasTheme.customColor ?? getDefaultCanvasThemeCustomColor()) !== canvasThemeColorDraft;

  const layoutChangeUrgency = useMemo(() => {
    const changedCount = canvasPendingChanges.changedCount;

    if (changedCount >= 8) {
      return {
        level: 'high' as const,
        statusTone: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300',
        saveTone:
          'border-rose-600 bg-rose-600 text-white shadow-[0_0_0_1px_rgba(225,29,72,0.18),0_0_24px_rgba(225,29,72,0.28)] hover:bg-rose-700 hover:shadow-[0_0_0_1px_rgba(225,29,72,0.22),0_0_32px_rgba(225,29,72,0.34)]',
        nudge: 'You have a lot of unsaved layout movement. Save the canvas to lock in the current arrangement.',
      };
    }

    if (changedCount >= 4) {
      return {
        level: 'medium' as const,
        statusTone: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
        saveTone:
          'border-amber-500 bg-amber-500 text-white shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_0_18px_rgba(245,158,11,0.2)] hover:bg-amber-600 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2),0_0_24px_rgba(245,158,11,0.26)]',
        nudge: 'Several layout changes are still staged. Save when this arrangement looks right.',
      };
    }

    if (changedCount > 0) {
      return {
        level: 'low' as const,
        statusTone: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
        saveTone:
          'border-blue-600 bg-blue-600 text-white shadow-[0_0_0_1px_rgba(37,99,235,0.12),0_0_14px_rgba(37,99,235,0.18)] hover:bg-blue-700 hover:shadow-[0_0_0_1px_rgba(37,99,235,0.16),0_0_20px_rgba(37,99,235,0.22)]',
        nudge: null,
      };
    }

    return {
      level: 'idle' as const,
      statusTone: 'border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
      saveTone: 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500',
      nudge: null,
    };
  }, [canvasPendingChanges.changedCount]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateCanvasContentInset = () => {
      const topLeftHeight = topLeftOverlayRef.current?.offsetHeight ?? 0;
      const topRightRect = topRightToolbarRef.current?.getBoundingClientRect();
      const topRightWidth = Math.ceil(topRightRect?.width ?? 0);
      const topRightHeight = Math.ceil(topRightRect?.height ?? 0);
      const verticalChromeHeight = Math.max(topLeftHeight, topRightHeight);

      setCanvasContentInset({
        top: verticalChromeHeight > 0 ? verticalChromeHeight + 40 : 168,
        right: topRightWidth > 0 ? topRightWidth + 32 : 272,
        bottom: 32,
        left: 32,
      });
    };

    updateCanvasContentInset();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasContentInset();
    });

    if (topLeftOverlayRef.current) {
      resizeObserver.observe(topLeftOverlayRef.current);
    }

    if (topRightToolbarRef.current) {
      resizeObserver.observe(topRightToolbarRef.current);
    }

    window.addEventListener('resize', updateCanvasContentInset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasContentInset);
    };
  }, [
    activeCanvasNoteEditCount,
    canvasNotesFeedback,
    canvasPendingChanges.changedCount,
    canvasSaveFeedback,
    canvasThemeFeedback,
    dirtyCanvasNoteCount,
    isCanvasNavigatorOpen,
    isSavingCanvasNotes,
    isSavingCanvasTheme,
    layoutChangeUrgency.nudge,
  ]);

  // availableLenses removed - now handled by ViewSwitcher in FolderViewLayout

  // Build breadcrumb path from store (for clickable navigation)
  const breadcrumbPath: Array<{ id: string; name: string }> = [];
  if (folderId && currentFolder) {
    let folder: AiruFolder | null = currentFolder;
    const pathFolders: AiruFolder[] = [];

    // Build path upward from current to root
    while (folder) {
      const currentFolderItem: AiruFolder = folder;
      
      // Stop conditions: root folders or parent not found
      if (
        !currentFolderItem.parentFolderId ||
        currentFolderItem.parentFolderId === '' ||
        currentFolderItem.humanId === '__user_root__' ||
        currentFolderItem.humanId === '__org_root__'
      ) {
        // Don't add root folders to path
        break;
      }

      pathFolders.unshift(currentFolderItem);

      const parent = getFolderById(currentFolderItem.parentFolderId);
      if (!parent) {
        // Parent not found, stop
        break;
      }

      folder = parent;
    }

    // Build breadcrumb path (filter out root folders)
    for (const pathFolder of pathFolders) {
      // Skip root folders
      if (
        pathFolder.humanId === '__user_root__' ||
        pathFolder.humanId === '__org_root__' ||
        !pathFolder.parentFolderId ||
        pathFolder.parentFolderId === ''
      ) {
        continue;
      }

      breadcrumbPath.push({
        id: pathFolder.id,
        name: pathFolder.humanId,
      });
    }
  }

  const handleCreateFolderSuccess = (folder: AiruFolder) => {
    // Folder is automatically added to store by the modal
    // No need to refetch - store is updated
  };

  if (!orgId || !userId || !folderId) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <DocumentListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load folder"
          message={error.message || 'An error occurred while loading this folder.'}
          onRetry={() => window.location.reload()}
          backUrl={`/orgs/${orgIdFromParams}/airunote`}
          backLabel="Back to Home"
        />
      </div>
    );
  }

  if (!currentFolder) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Folder not found</div>
        <Link
          href={`/orgs/${orgIdFromParams}/airunote`}
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  // Build breadcrumb with Home first
  const fullBreadcrumbPath = [
    { id: '', name: 'Home' },
    ...breadcrumbPath,
  ];

  // Render board lens if active
  const shouldRenderBoardLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'board' &&
    !isLoadingLens;

  // Render canvas lens if active
  const shouldRenderCanvasLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'canvas' &&
    !isLoadingLens;

  const shouldRenderStudyLens =
    selectedLensId &&
    lensData &&
    lensData.lens.type === 'study' &&
    !isLoadingLens;
  const pageShellClassName = 'mx-auto w-full max-w-[1400px] px-6 lg:px-8';
  const lensHeaderActions = (
    <CreateEntryActions
      onCreateFolder={() => setIsCreateFolderModalOpen(true)}
      onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
      onPasteDock={() => setIsPasteDockOpen(true)}
      className="justify-end"
    />
  );

  // Determine current view mode based on selected lens
  const currentViewMode: 'grid' | 'tree' | 'lens' = 
    (selectedLensId && (shouldRenderBoardLens || shouldRenderCanvasLens || shouldRenderStudyLens)) ? 'lens' : 'grid';

  // Handle view change from LensToolbar
  const handleViewChangeFromToolbar = (view: 'grid' | 'tree' | 'lens', lensId?: string | null) => {
    if (view === 'grid' || view === 'tree') {
      // Clear lens selection and set desired view mode
      setSelectedLensId(null);
      setDesiredViewMode(view);
    } else if (view === 'lens') {
      const targetLensId = lensId || null;
      // Update local selection
      setSelectedLensId(targetLensId);
      setDesiredViewMode(null);

      // If a lens is specified, persist it as the default for this folder
      if (targetLensId && setFolderDefaultLens.mutateAsync) {
        // Fire and forget; errors are surfaced via the hook's own handling (e.g., toasts)
        void setFolderDefaultLens.mutateAsync({ lensId: targetLensId });
      }
    }
  };

  const handleEditLensRequest = (lens: AiruLens) => {
    setEditingLens(lens);
    setIsEditLensModalOpen(true);
  };

  const handleDeleteLensRequest = (lens: AiruLens) => {
    setDeleteLensModal(lens);
  };

  return (
    <>
      {/* Render Board Lens if active */}
      {selectedLensId && isLoadingLens ? (
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading lens...</div>
          </div>
        </div>
      ) : shouldRenderBoardLens && lensData ? (
        <div className="h-screen overflow-hidden relative">
          <div className={`${pageShellClassName} pb-0 pt-8`}>
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <LensToolbar
                  viewMode="lens"
                  selectedLensId={selectedLensId}
                  currentLens={lensData.lens}
                  lenses={folderLenses}
                  folderId={folderId}
                  orgId={orgId || orgIdFromParams}
                  placement="inline"
                  onViewChange={handleViewChangeFromToolbar}
                  onCreateLens={() => setIsCreateLensModalOpen(true)}
                  onEditLens={handleEditLensRequest}
                  onDeleteLens={handleDeleteLensRequest}
                />
              </div>
              <div className="shrink-0">{lensHeaderActions}</div>
            </div>
          </div>
          <div className={`${pageShellClassName} pt-6`}>
            <BoardLens
              orgId={orgId || orgIdFromParams}
              lens={lensData.lens}
              items={boardChildren}
              lensItems={lensData.items}
              onPersist={handleBoardPersist}
            />
          </div>
        </div>
      ) : shouldRenderCanvasLens && lensData ? (
        <div className="relative h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 sm:pt-6">
            <FolderCanvasTopOverlay
              overlayRef={topLeftOverlayRef}
              itemCount={boardChildren.length}
              isNavigatorOpen={isCanvasNavigatorOpen}
              onToggleNavigator={() => setIsCanvasNavigatorOpen((prev) => !prev)}
              onExportPdf={() => void handleExportCanvasPdf()}
              isExportingPdf={isExportingCanvasPdf}
              currentCanvasPresetId={currentCanvasTheme.presetId ?? null}
              onCanvasPresetChange={handleCanvasPresetChange}
              currentCanvasThemeMode={currentCanvasTheme.mode}
              currentCanvasThemeColorDraft={canvasThemeColorDraft}
              onCanvasThemeModeChange={handleCanvasThemeModeChange}
              onCanvasThemeColorDraftChange={setCanvasThemeColorDraft}
              onApplyCanvasThemeColor={handleApplyCanvasThemeColor}
              isSavingCanvasTheme={isSavingCanvasTheme}
              isCanvasThemeColorDirty={isCanvasThemeColorDirty}
              canvasThemeFeedback={canvasThemeFeedback}
              activeCanvasNoteEditCount={activeCanvasNoteEditCount}
              eligibleCanvasNoteCount={eligibleCanvasNoteCount}
              dirtyCanvasNoteCount={dirtyCanvasNoteCount}
              dirtyCanvasNoteChangedLineCount={dirtyCanvasNoteChangedLineCount}
              onEditAllCanvasNotes={handleEditAllCanvasNotes}
              onSaveCanvasNotes={handleSaveCanvasNotes}
              onCancelCanvasNotes={handleCancelCanvasNotes}
              isSavingCanvasNotes={isSavingCanvasNotes}
              canvasNotesFeedback={canvasNotesFeedback}
              hasPendingLayoutChanges={canvasPendingChanges.hasPendingChanges}
              layoutChangedCount={canvasPendingChanges.changedCount}
              isSavingCanvasChanges={isSavingCanvasChanges}
              onArrangeCanvas={handleArrangeCanvas}
              onSaveAllCanvasChanges={() => void handleSaveAllCanvasChanges()}
              onDiscardCanvasChanges={handleDiscardCanvasChanges}
              canvasSaveFeedback={canvasSaveFeedback}
              layoutChangeUrgency={layoutChangeUrgency}
            />
          </div>
          <div className="pointer-events-none absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
            <div
              ref={topRightToolbarRef}
              className="pointer-events-auto flex max-w-[min(32rem,calc(100vw-2rem))] flex-col gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"
            >
              <LensToolbar
                viewMode="lens"
                selectedLensId={selectedLensId}
                currentLens={lensData.lens}
                lenses={folderLenses}
                folderId={folderId}
                orgId={orgId || orgIdFromParams}
                placement="inline"
                onViewChange={handleViewChangeFromToolbar}
                onCreateLens={() => setIsCreateLensModalOpen(true)}
                onEditLens={handleEditLensRequest}
                onDeleteLens={handleDeleteLensRequest}
              />
              {lensHeaderActions}
            </div>
          </div>
          {isCanvasNavigatorOpen && canvasNavigatorPresentation === 'overlay' && (
            <div className="pointer-events-none absolute left-4 top-20 z-40 w-[min(22rem,calc(100vw-2rem))] sm:left-6 sm:top-24">
              <div className="pointer-events-auto overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Navigator</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Jump through folders and documents in this canvas.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCanvasNavigatorPresentation('panel')}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/30"
                    >
                      Dock To Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCanvasNavigatorOpen(false)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      aria-label="Close navigator"
                      title="Close navigator"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" d="M5 5l10 10" />
                        <path strokeLinecap="round" d="M15 5L5 15" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3">
                    <input
                      type="search"
                      value={canvasNavigatorQuery}
                      onChange={(event) => setCanvasNavigatorQuery(event.target.value)}
                      placeholder="Search items"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-sky-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-sky-400"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {filteredCanvasNavigatorItems.length} shown
                    </span>
                    {canvasNavigatorState.activeItemId && (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300">
                        Active
                      </span>
                    )}
                    {canvasNavigatorState.focusedItemId && (
                      <span className="rounded-full border border-gray-300 bg-gray-900 px-2 py-1 text-white dark:border-gray-600 dark:bg-gray-100 dark:text-gray-900">
                        Focused
                      </span>
                    )}
                    {canvasNavigatorState.editingItemIds.length > 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                        {canvasNavigatorState.editingItemIds.length} editing
                      </span>
                    )}
                    {canvasNavigatorState.dirtyItemIds.length > 0 && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                        {canvasNavigatorState.dirtyItemIds.length} unsaved
                      </span>
                    )}
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      Esc closes
                    </span>
                  </div>
                </div>
                <div className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto p-2">
                  {filteredCanvasNavigatorItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No matching items.
                    </div>
                  ) : (
                    <>
                      {canvasNavigatorFolders.length > 0 && (
                        <div className="mb-3">
                          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                            Folders
                          </div>
                          {canvasNavigatorFolders.map((item) => {
                            const isActive = canvasNavigatorState.activeItemId === item.id;
                            const isFocused = canvasNavigatorState.focusedItemId === item.id;
                            const isEditing = canvasNavigatorState.editingItemIds.includes(item.id);
                            const isDirty = canvasNavigatorState.dirtyItemIds.includes(item.id);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleCanvasNavigatorJump(item.id)}
                                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                                  isActive
                                    ? 'bg-sky-50 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60'
                                }`}
                              >
                                <div className="min-w-0 pr-3">
                                  <div className="truncate text-sm font-medium">{item.title}</div>
                                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Folder</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                  {isFocused && (
                                    <span className="rounded-full bg-gray-900 px-2 py-1 text-white dark:bg-gray-100 dark:text-gray-900">Focus</span>
                                  )}
                                  {isEditing && (
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Edit</span>
                                  )}
                                  {isDirty && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Unsaved</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {canvasNavigatorDocuments.length > 0 && (
                        <div>
                          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                            Documents
                          </div>
                          {canvasNavigatorDocuments.map((item) => {
                            const isActive = canvasNavigatorState.activeItemId === item.id;
                            const isFocused = canvasNavigatorState.focusedItemId === item.id;
                            const isEditing = canvasNavigatorState.editingItemIds.includes(item.id);
                            const isDirty = canvasNavigatorState.dirtyItemIds.includes(item.id);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleCanvasNavigatorJump(item.id)}
                                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                                  isActive
                                    ? 'bg-sky-50 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60'
                                }`}
                              >
                                <div className="min-w-0 pr-3">
                                  <div className="truncate text-sm font-medium">{item.title}</div>
                                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Document</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                  {isFocused && (
                                    <span className="rounded-full bg-gray-900 px-2 py-1 text-white dark:bg-gray-100 dark:text-gray-900">Focus</span>
                                  )}
                                  {isEditing && (
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Edit</span>
                                  )}
                                  {isDirty && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Unsaved</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <CanvasLens
            orgId={orgId || orgIdFromParams}
            lens={lensData.lens}
            canvasTheme={currentCanvasTheme}
            items={boardChildren}
            lensItems={lensData.items || []}
            onPersist={handleBoardPersist}
            persistenceMode="manual"
            onPendingChangesChange={handleCanvasPendingChangesChange}
            persistedCommitKey={canvasCommitKey}
            stagedResetKey={canvasResetKey}
            arrangementRequest={canvasArrangementRequest}
            navigationRequest={canvasNavigationRequest}
            notesRequest={canvasNotesRequest}
            navigatorPanel={
              isCanvasNavigatorOpen && canvasNavigatorPresentation === 'panel'
                ? {
                    isOpen: true,
                    mode: canvasNavigatorPanelMode,
                    query: canvasNavigatorQuery,
                    items: canvasNavigatorPanelItems,
                    onQueryChange: setCanvasNavigatorQuery,
                    onJump: handleCanvasNavigatorJump,
                    onClose: () => setIsCanvasNavigatorOpen(false),
                    onModeChange: setCanvasNavigatorPanelMode,
                    onRequestOverlay: () => setCanvasNavigatorPresentation('overlay'),
                  }
                : null
            }
            contentInset={canvasContentInset}
            onNavigatorStateChange={setCanvasNavigatorState}
            onNotesActionComplete={handleCanvasNotesActionComplete}
            enableInlineDocumentEditing
            enableInlineDocumentFocusMode
            enableInlineDocumentKeyboardShortcuts
            enableNoteColorOverrides
          />
        </div>
      ) : shouldRenderStudyLens && folderId ? (
        <div className="min-h-screen bg-gray-50">
          <div className={`${pageShellClassName} pb-0 pt-8`}>
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <LensToolbar
                  viewMode="lens"
                  selectedLensId={selectedLensId}
                  currentLens={lensData?.lens || null}
                  lenses={folderLenses}
                  folderId={folderId}
                  orgId={orgId || orgIdFromParams}
                  placement="inline"
                  onViewChange={handleViewChangeFromToolbar}
                  onCreateLens={() => setIsCreateLensModalOpen(true)}
                  onEditLens={handleEditLensRequest}
                  onDeleteLens={handleDeleteLensRequest}
                />
              </div>
              <div className="shrink-0">{lensHeaderActions}</div>
            </div>
          </div>
          <StudyLensRenderer folderId={folderId} />
        </div>
      ) : (
        <FolderViewLayout
        folderId={folderId}
        folderName={currentFolder?.humanId || 'Folder'}
        breadcrumbPath={fullBreadcrumbPath}
        orgId={orgId || orgIdFromParams}
        userId={userId || ''}
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onCreateDocument={() => setIsCreateDocumentModalOpen(true)}
        onPasteDock={() => setIsPasteDockOpen(true)}
        onMoveFolder={(folder) => setMoveFolderModal(folder)}
        onDeleteFolder={(folder) => setDeleteFolderModal(folder)}
        onMoveDocument={(doc) => setMoveDocumentModal(doc as AiruDocument)}
        onDeleteDocument={(doc) => setDeleteDocumentModal(doc as AiruDocument)}
        onLensCreated={async (lens) => {
          // Refetch folder lenses to get the new lens
          await refetchFolderLenses();
          // Auto-select the new lens
          setSelectedLensId(lens.id);
        }}
        selectedLensId={selectedLensId}
        onLensSelected={(lensId: string | null) => {
          setSelectedLensId(lensId);
        }}
        defaultViewMode={desiredViewMode || undefined}
        />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        orgId={orgId}
        userId={userId}
        parentFolderId={folderId}
        onSuccess={handleCreateFolderSuccess}
      />

      <CreateDocumentModal
        isOpen={isCreateDocumentModalOpen}
        onClose={() => setIsCreateDocumentModalOpen(false)}
        orgId={orgId}
        userId={userId}
        folderId={folderId}
        folderType={currentFolder?.type}
      />

      <PasteDock
        isOpen={isPasteDockOpen}
        onClose={() => setIsPasteDockOpen(false)}
        orgId={orgId}
        userId={userId}
        defaultFolderId={folderId}
      />

      {moveFolderModal && (
        <MoveFolderModal
          isOpen={!!moveFolderModal}
          onClose={() => setMoveFolderModal(null)}
          folder={moveFolderModal}
          orgId={orgId}
          userId={userId}
          onSuccess={() => setMoveFolderModal(null)}
        />
      )}

      {moveDocumentModal && (
        <MoveDocumentModal
          isOpen={!!moveDocumentModal}
          onClose={() => setMoveDocumentModal(null)}
          document={moveDocumentModal}
          orgId={orgId}
          userId={userId}
          onSuccess={() => setMoveDocumentModal(null)}
        />
      )}

      {deleteFolderModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteFolderModal}
          onClose={() => setDeleteFolderModal(null)}
          onConfirm={async () => {
            if (!orgId || !userId) return;
            await deleteFolder.mutateAsync({
              folderId: deleteFolderModal.id,
              orgId,
              userId,
            });
            router.push(`/orgs/${orgIdFromParams}/airunote`);
          }}
          title="Delete Folder"
          message="Are you sure you want to delete this folder? This will delete all contents permanently."
          itemName={deleteFolderModal.humanId}
          isDeleting={deleteFolder.isPending}
        />
      )}

      {deleteDocumentModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteDocumentModal}
          onClose={() => setDeleteDocumentModal(null)}
          onConfirm={async () => {
            if (!orgId || !userId) return;
            await deleteDocument.mutateAsync({
              documentId: deleteDocumentModal.id,
              orgId,
              userId,
              folderId: deleteDocumentModal.folderId,
            });
          }}
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone."
          itemName={deleteDocumentModal.name}
          isDeleting={deleteDocument.isPending}
        />
      )}

      {/* Create Lens Modal - Always available */}
      {folderId && (
        <CreateFolderLensModal
          isOpen={isCreateLensModalOpen}
          onClose={() => setIsCreateLensModalOpen(false)}
          onSuccess={async (lens) => {
            // Refetch folder lenses to get the new lens
            await refetchFolderLenses();
            // Auto-select the new lens
            setSelectedLensId(lens.id);
            setIsCreateLensModalOpen(false);
          }}
          folderId={folderId}
          orgId={orgId || orgIdFromParams}
          userId={userId || ''}
        />
      )}

      {/* Edit Lens Modal */}
      {editingLens && (
        <EditLensModal
          isOpen={isEditLensModalOpen}
          onClose={() => {
            setIsEditLensModalOpen(false);
            setEditingLens(null);
          }}
          onSuccess={async (updatedLens) => {
            // Refetch folder lenses to get the updated lens
            await refetchFolderLenses();
            setIsEditLensModalOpen(false);
            setEditingLens(null);
          }}
          lens={editingLens}
          orgId={orgId || orgIdFromParams}
          folderId={folderId}
        />
      )}

      {/* Delete Lens Modal */}
      {deleteLensModal && (
        <DeleteConfirmationModal
          isOpen={!!deleteLensModal}
          onClose={() => setDeleteLensModal(null)}
          onConfirm={async () => {
            if (!orgId) return;
            await deleteLens.mutateAsync({ lensId: deleteLensModal.id });
            // If deleted lens was selected, switch to first available lens or null
            if (selectedLensId === deleteLensModal.id) {
              const remainingLenses = folderLenses.filter((l) => l.id !== deleteLensModal.id);
              if (remainingLenses.length > 0) {
                setSelectedLensId(remainingLenses[0].id);
              } else {
                setSelectedLensId(null);
              }
            }
            setDeleteLensModal(null);
          }}
          title="Delete Lens"
          message="Are you sure you want to delete this lens? This action cannot be undone."
          itemName={deleteLensModal.name}
          isDeleting={deleteLens.isPending}
        />
      )}
    </>
  );
}
