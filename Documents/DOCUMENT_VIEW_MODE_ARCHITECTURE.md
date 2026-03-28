# Document View Mode Architecture Plan

## Overview
Implement a flexible document view mode system that works across all lens types (box, board, canvas, book) with 4 view modes: List, Icon, Preview, and Full.

## Requirements

### View Modes
1. **List** (current) - Grid cards with metadata
2. **Icon** - Icon-only compact view
3. **Preview** - Shows document preview (first N characters)
4. **Full** - Shows full document content inline

### Constraints
- Must work regardless of lens type
- No tech debt
- Clean architecture
- One source of truth
- Performance optimized

## Architecture Design

### 1. State Management Layer

#### View Mode Preference Storage
```typescript
// Location: frontend/components/airunote/stores/documentViewStore.ts
// OR: Add to existing airunoteStore.ts

interface DocumentViewPreferences {
  viewMode: 'list' | 'icon' | 'preview' | 'full';
  // Optional: per-folder preferences
  folderPreferences?: Record<string, 'list' | 'icon' | 'preview' | 'full'>;
}

// Storage Strategy:
// - localStorage key: 'airunote_documentViewMode'
// - Default: 'list'
// - Scope: Global (can be extended to per-folder later)
```

#### Zustand Store Addition
```typescript
// Add to airunoteStore.ts or create documentViewStore.ts
interface DocumentViewState {
  viewMode: 'list' | 'icon' | 'preview' | 'full';
  setViewMode: (mode: 'list' | 'icon' | 'preview' | 'full') => void;
  // Optional: per-folder mode
  getFolderViewMode: (folderId: string) => 'list' | 'icon' | 'preview' | 'full';
  setFolderViewMode: (folderId: string, mode: 'list' | 'icon' | 'preview' | 'full') => void;
}
```

### 2. Component Architecture

#### Unified Document Display Component
```typescript
// Location: frontend/components/airunote/components/DocumentDisplay.tsx
// Replaces: DocumentList.tsx (refactor, don't duplicate)

interface DocumentDisplayProps {
  documents: AiruDocumentMetadata[];
  viewMode: 'list' | 'icon' | 'preview' | 'full';
  orgId: string;
  onMove?: (doc: AiruDocumentMetadata) => void;
  onDelete?: (doc: AiruDocumentMetadata) => void;
  // Optional: for preview/full modes
  onDocumentLoad?: (docId: string) => Promise<AiruDocument>;
}

// Component Structure:
// - DocumentDisplay (main container)
//   - DocumentListView (current grid/list)
//   - DocumentIconView (icon-only grid)
//   - DocumentPreviewView (preview cards)
//   - DocumentFullView (full content cards)
```

#### View Mode Switcher Component
```typescript
// Location: frontend/components/airunote/components/DocumentViewSwitcher.tsx
// Similar to ViewSwitcher but for documents

interface DocumentViewSwitcherProps {
  viewMode: 'list' | 'icon' | 'preview' | 'full';
  onViewChange: (mode: 'list' | 'icon' | 'preview' | 'full') => void;
}

// UI: Dropdown with 4 options
// - List (current)
// - Icon
// - Preview
// - Full
```

### 3. Data Fetching Strategy

#### Lazy Loading for Preview/Full
```typescript
// Location: frontend/components/airunote/hooks/useDocumentContent.ts

interface UseDocumentContentOptions {
  documentId: string;
  orgId: string;
  userId: string;
  enabled: boolean; // Only fetch when preview/full mode active
  preview?: boolean; // If true, fetch preview only (first 500 chars)
}

// Strategy:
// 1. Metadata is already loaded (from getFullMetadata)
// 2. Preview mode: Fetch first 500 chars (new endpoint or existing)
// 3. Full mode: Fetch full document (existing getDocument)
// 4. Cache in airunoteStore.documentContentById
```

#### Backend API Considerations
```typescript
// Option 1: Extend existing GET /documents/:id
// Add query param: ?preview=true (returns first 500 chars)

// Option 2: New endpoint (if needed)
// GET /documents/:id/preview
// Returns: { preview: string, fullLength: number }

// Recommendation: Option 1 (extend existing)
```

### 4. Integration Points

#### FolderViewLayout Integration
```typescript
// Location: frontend/components/airunote/components/FolderViewLayout.tsx

// Changes:
// 1. Add DocumentViewSwitcher to Documents section header
// 2. Replace DocumentList with DocumentDisplay
// 3. Pass viewMode from store

// Example:
<DocumentsSection>
  <div className="flex items-center justify-between mb-4">
    <h2>Documents</h2>
    <DocumentViewSwitcher 
      viewMode={documentViewMode}
      onViewChange={setDocumentViewMode}
    />
  </div>
  <DocumentDisplay
    documents={documents}
    viewMode={documentViewMode}
    orgId={orgId}
    onMove={onMoveDocument}
    onDelete={onDeleteDocument}
  />
</DocumentsSection>
```

### 5. View Mode Implementations

#### List View (Current)
- Keep existing grid layout
- No changes needed
- Reuse DocumentList component logic

#### Icon View
```typescript
// Location: frontend/components/airunote/components/DocumentIconView.tsx

// Layout: Compact grid (more columns)
// Display: Icon + name only
// Hover: Show metadata tooltip
// Click: Navigate to document
```

#### Preview View
```typescript
// Location: frontend/components/airunote/components/DocumentPreviewView.tsx

// Layout: Grid (same as list)
// Display: 
//   - Icon + name
//   - Preview text (first 200-300 chars, truncated)
//   - "Read more" link
// Data: Lazy load preview on mount
```

#### Full View
```typescript
// Location: frontend/components/airunote/components/DocumentFullView.tsx

// Layout: Single column or grid
// Display:
//   - Icon + name
//   - Full content (rendered based on type: MD, TXT, RTF)
//   - Edit button (inline editing?)
// Data: Lazy load full content on mount
```

### 6. Performance Optimizations

#### Lazy Loading Strategy
```typescript
// Only fetch content when:
// 1. View mode is 'preview' or 'full'
// 2. Document is visible (viewport intersection)
// 3. Use React Query for caching

// Implementation:
// - useDocumentContent hook with React Query
// - Intersection Observer for viewport detection
// - Stale time: 5 minutes
// - Cache time: 10 minutes
```

#### Caching Strategy
```typescript
// Store in airunoteStore.documentContentById
// - Key: documentId
// - Value: { content: string, preview?: string, loadedAt: Date }
// - Clear on document update/delete
```

### 7. Lens Compatibility

#### Lens-Agnostic Design
```typescript
// All lenses use the same DocumentDisplay component
// Lens-specific rendering (board, canvas) can override if needed
// But default behavior works for all

// Example:
// - Box lens: Uses DocumentDisplay with viewMode
// - Board lens: Uses DocumentDisplay with viewMode (cards can show preview)
// - Canvas lens: Uses DocumentDisplay with viewMode (nodes can show preview)
// - Book lens: Uses DocumentDisplay with viewMode
```

### 8. Implementation Phases

#### Phase 1: Foundation
1. Create DocumentViewStore (or add to airunoteStore)
2. Create DocumentViewSwitcher component
3. Refactor DocumentList → DocumentDisplay
4. Implement List and Icon views

#### Phase 2: Preview Mode
1. Add preview endpoint (or extend existing)
2. Create useDocumentContent hook
3. Implement DocumentPreviewView
4. Add lazy loading

#### Phase 3: Full Mode
1. Implement DocumentFullView
2. Add content rendering (MD, TXT, RTF)
3. Add inline editing (optional)
4. Performance optimization

#### Phase 4: Polish
1. Add viewport-based lazy loading
2. Add animations/transitions
3. Add keyboard shortcuts
4. Add per-folder preferences (optional)

## File Structure

```
frontend/components/airunote/
├── components/
│   ├── DocumentDisplay.tsx          # Main component (replaces DocumentList)
│   ├── DocumentViewSwitcher.tsx     # View mode switcher
│   ├── DocumentListView.tsx         # List view (extracted from DocumentList)
│   ├── DocumentIconView.tsx         # Icon view
│   ├── DocumentPreviewView.tsx      # Preview view
│   └── DocumentFullView.tsx         # Full view
├── hooks/
│   └── useDocumentContent.ts        # Lazy loading hook
└── stores/
    └── documentViewStore.ts         # View mode state (or add to airunoteStore)
```

## Benefits

1. **One Source of Truth**: Single DocumentDisplay component
2. **Lens-Agnostic**: Works with all lens types
3. **Performance**: Lazy loading, caching, viewport detection
4. **Extensible**: Easy to add new view modes
5. **No Tech Debt**: Clean architecture, proper separation of concerns
6. **User Experience**: Flexible viewing options

## Migration Path

1. Keep DocumentList.tsx as-is initially
2. Create DocumentDisplay.tsx alongside
3. Gradually migrate usage
4. Remove DocumentList.tsx once fully migrated

## Open Questions

1. Should preview/full be per-document or all documents?
   - **Recommendation**: All documents in current view (lazy load)
2. Should view mode be per-folder or global?
   - **Recommendation**: Global initially, per-folder later if needed
3. Should full view support inline editing?
   - **Recommendation**: Phase 2 feature, not MVP
4. Preview length?
   - **Recommendation**: 200-300 chars for preview, configurable
