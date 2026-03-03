/**
 * Resolve Document View Mode
 * Single source of truth for view mode resolution
 * 
 * Resolution hierarchy:
 * 1. LensItemOverride (lensItem.viewMode)
 * 2. LensDefaultView (lens.presentation?.defaultView)
 * 3. GlobalDefaultView (from UI store)
 */

import type { ViewMode } from '@/lib/api/airunoteLensesApi';

export function resolveDocumentViewMode({
  lensItemViewMode,
  lensDefaultView,
  globalDefaultView,
}: {
  lensItemViewMode?: ViewMode | null;
  lensDefaultView?: ViewMode | null;
  globalDefaultView: ViewMode;
}): ViewMode {
  return (
    lensItemViewMode ??
    lensDefaultView ??
    globalDefaultView
  );
}
