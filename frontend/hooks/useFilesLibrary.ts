import { useState, useEffect, useCallback, useMemo } from 'react';
import { filesApi, type OrgFile, type ListFilesFilters, type UpdateVisibilityRequest } from '@/lib/api/files';
import { useMetadataIndex, type FileMetadata } from '@/providers/MetadataIndexProvider';

interface UseFilesLibraryOptions {
  orgId: string;
  autoLoad?: boolean;
  initialFilters?: ListFilesFilters;
}

export function useFilesLibrary({ orgId, autoLoad = true, initialFilters }: UseFilesLibraryOptions) {
  const metadataIndex = useMetadataIndex();
  const [files, setFiles] = useState<OrgFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListFilesFilters>(initialFilters || {});

  // Get files from metadata index and apply filters client-side
  const filteredFiles = useMemo(() => {
    const metadataFiles = metadataIndex.index.files;
    if (!filters || Object.keys(filters).length === 0) {
      return metadataFiles;
    }
    // Apply filters client-side (visibility, search, etc.)
    return metadataFiles.filter((file: FileMetadata) => {
      if (filters.visibility && file.visibility !== filters.visibility) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!file.fileName.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [metadataIndex.index.files, filters]);

  const loadFiles = useCallback(async (customFilters?: ListFilesFilters) => {
    if (!orgId) return;
    
    setLoading(true);
    setError(null);
    try {
      // Refresh files metadata if needed
      if (metadataIndex.status !== 'ready') {
        await metadataIndex.refreshKey('files');
      }
      // Apply filters to metadata
      setFilters(customFilters || filters);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, filters, metadataIndex]);

  // Sync files from metadata index
  useEffect(() => {
    if (metadataIndex.status === 'ready') {
      // Convert FileMetadata to OrgFile format for compatibility
      const orgFiles = filteredFiles.map((meta: FileMetadata) => ({
        id: meta.id,
        orgId: meta.orgId,
        ownerUserId: meta.ownerUserId,
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        visibility: meta.visibility,
        updatedAt: meta.updatedAt,
        createdAt: meta.createdAt,
      })) as OrgFile[];
      setFiles(orgFiles);
      setLoading(false);
    } else if (metadataIndex.status === 'loading') {
      setLoading(true);
    } else if (metadataIndex.status === 'error') {
      setError(metadataIndex.error || 'Failed to load files');
      setLoading(false);
    }
  }, [metadataIndex.status, metadataIndex.error, filteredFiles]);

  useEffect(() => {
    if (autoLoad && metadataIndex.status === 'idle' && orgId) {
      metadataIndex.refreshKey('files');
    }
  }, [autoLoad, orgId, metadataIndex]);

  const uploadFile = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<OrgFile> => {
    setLoading(true);
    setError(null);
    try {
      const uploaded = await filesApi.upload(orgId, file, onProgress);
      // Refresh metadata after upload
      await metadataIndex.refreshKey('files');
      return uploaded;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to upload file';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orgId, metadataIndex]);

  const updateVisibility = useCallback(async (fileId: string, data: UpdateVisibilityRequest): Promise<OrgFile> => {
    setError(null);
    try {
      const updated = await filesApi.updateVisibility(orgId, fileId, data);
      // Refresh metadata after update
      await metadataIndex.refreshKey('files');
      return updated;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update visibility';
      setError(errorMessage);
      throw err;
    }
  }, [orgId, metadataIndex]);

  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    setError(null);
    try {
      await filesApi.delete(orgId, fileId);
      // Refresh metadata after delete
      await metadataIndex.refreshKey('files');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete file';
      setError(errorMessage);
      throw err;
    }
  }, [orgId, metadataIndex]);

  const applyFilters = useCallback((newFilters: ListFilesFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    files,
    loading: loading || metadataIndex.status === 'loading',
    error: error || metadataIndex.error,
    filters,
    loadFiles,
    uploadFile,
    updateVisibility,
    deleteFile,
    applyFilters,
  };
}
