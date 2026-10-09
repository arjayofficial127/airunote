// Content and mutation operations for the native library. File lists remain
// owned by MetadataIndexProvider through useFilesLibrary.
import { nativeFilesApi, filesApi } from "@/lib/api/files";
export const fileLibrary = {
  ...nativeFilesApi,
  updateVisibility: filesApi.updateVisibility,
  delete: filesApi.delete,
};
