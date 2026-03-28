# PHASE 4 — Frontend Migration Summary
## Internal Route to Production Route Migration

**Date:** 2025-01-27  
**Status:** ✅ Complete - Build Passes

---

## Summary

- **Total Endpoints Migrated:** 11
- **Files Modified:** 5
- **Build Status:** ✅ Passes (`npm run build`)
- **Internal Routes Remaining:** 0 (all Phase 3 endpoints migrated)

---

## Files Modified

1. **`frontend/components/airunote/services/airunoteApi.ts`**
   - Migrated 11 endpoints from internal to production routes
   - Removed orgId/userId from request bodies
   - Injected orgId into URLs only

2. **`frontend/components/airunote/hooks/useCanvasPositions.ts`**
   - Added `orgId` parameter to hook options
   - Updated `updateBatchLayout` call to include orgId

3. **`frontend/components/airunote/hooks/useBoardState.ts`**
   - Added `orgId` parameter to hook options
   - Updated `updateBatchLayout` and `updateBoardLanes` calls to include orgId

4. **`frontend/components/airunote/components/CanvasView.tsx`**
   - Updated `useCanvasPositions` hook call to pass `orgId`

5. **`frontend/components/airunote/components/BoardView.tsx`**
   - Updated `useBoardState` hook call to pass `orgId`

---

## Migration Details by Endpoint

### 1. GET /metadata (getFullMetadata)
**Before:**
```typescript
GET /internal/airunote/full-metadata?orgId=...&userId=...
```

**After:**
```typescript
GET /orgs/${orgId}/airunote/metadata
```

**Changes:**
- Removed orgId/userId from query params
- Injected orgId into URL path
- Function signature unchanged

---

### 2. POST /provision (provision)
**Before:**
```typescript
POST /internal/airunote/provision
Body: { orgId, userId, orgOwnerUserId }
```

**After:**
```typescript
POST /orgs/${orgId}/airunote/provision
Body: { orgOwnerUserId }
```

**Changes:**
- Removed orgId and userId from body
- Injected orgId into URL path
- Kept orgOwnerUserId in body (optional, defaults to userId on backend)
- Function signature unchanged

---

### 3. GET /folders/:id (getFolder)
**Before:**
```typescript
GET /internal/airunote/folder/${folderId}?orgId=...&userId=...
```

**After:**
```typescript
GET /orgs/${orgId}/airunote/folders/${folderId}
```

**Changes:**
- Removed orgId/userId from query params
- Injected orgId into URL path
- Changed route from `/folder/` to `/folders/` (plural)
- Function signature unchanged

---

### 4. POST /lenses (createDesktopLens)
**Before:**
```typescript
POST /internal/airunote/lenses
Body: { orgId, userId, name, type, query, metadata }
```

**After:**
```typescript
POST /orgs/${orgId}/airunote/lenses
Body: { name, type, query, metadata }
```

**Changes:**
- Removed orgId and userId from body
- Injected orgId into URL path
- Function signature unchanged

---

### 5. PATCH /lenses/:lensId (updateDesktopLens)
**Before:**
```typescript
PATCH /internal/airunote/lenses/${lensId}?orgId=...&userId=...
Body: { name, query, metadata }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/${lensId}
Body: { name, query, metadata }
```

**Changes:**
- Removed orgId/userId from query params
- Injected orgId into URL path
- Function signature unchanged

---

### 6. PATCH /lenses/:lensId/canvas-positions (updateCanvasPositions)
**Before:**
```typescript
PATCH /internal/airunote/lenses/${lensId}/canvas-positions
Body: { positions }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/${lensId}/canvas-positions
Body: { positions }
```

**Changes:**
- Added orgId as function parameter (required for URL)
- Injected orgId into URL path
- Function signature changed: `(lensId, orgId, request)` instead of `(lensId, request)`
- Updated `useCanvasPositions` hook to accept and pass orgId

---

### 7. PATCH /lenses/:lensId/board-card (updateBoardCard)
**Before:**
```typescript
PATCH /internal/airunote/lenses/${lensId}/board-card
Body: { documentId, laneId, fractionalOrder }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/${lensId}/board-card
Body: { entityId, columnId, order }
```

**Changes:**
- Added orgId as function parameter (required for URL)
- Injected orgId into URL path
- Function signature changed: `(lensId, orgId, request)` instead of `(lensId, request)`
- Note: Body shape matches backend expectation (entityId, columnId, order)

---

### 8. PATCH /lenses/:lensId/board-lanes (updateBoardLanes)
**Before:**
```typescript
PATCH /internal/airunote/lenses/${lensId}/board-lanes
Body: { lanes }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/${lensId}/board-lanes
Body: { lanes }
```

**Changes:**
- Added orgId as function parameter (required for URL)
- Injected orgId into URL path
- Function signature changed: `(lensId, orgId, request)` instead of `(lensId, request)`
- Updated `useBoardState` hook to accept and pass orgId

---

### 9. PATCH /lenses/:lensId/batch-layout (updateBatchLayout)
**Before:**
```typescript
PATCH /internal/airunote/lenses/${lensId}/batch-layout
Body: { canvasPositions?, boardPositions? }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/${lensId}/batch-layout
Body: { canvasPositions?, boardPositions? }
```

**Changes:**
- Added orgId as function parameter (required for URL)
- Injected orgId into URL path
- Function signature changed: `(lensId, orgId, request)` instead of `(lensId, request)`
- Updated `useCanvasPositions` and `useBoardState` hooks to accept and pass orgId

---

### 10. PATCH /folders/:folderId/lenses/:lensId (updateFolderLens)
**Before:**
```typescript
PATCH /internal/airunote/folders/${folderId}/lenses/${lensId}?orgId=...&userId=...
Body: { name?, type?, metadata?, query? }
```

**After:**
```typescript
PATCH /orgs/${orgId}/airunote/lenses/folders/${folderId}/lenses/${lensId}
Body: { name?, type?, metadata?, query? }
```

**Changes:**
- Removed orgId/userId from query params
- Injected orgId into URL path
- Function signature unchanged

---

### 11. DELETE /vault (deleteVault)
**Before:**
```typescript
POST /internal/airunote/vault/delete
Body: { orgId, userId, confirmedByUserId, confirmation }
```

**After:**
```typescript
DELETE /orgs/${orgId}/airunote/vault
Body: { confirmation }
```

**Changes:**
- Changed HTTP method from POST to DELETE
- Removed orgId, userId, confirmedByUserId from body
- Injected orgId into URL path
- Kept confirmation in body (required by backend)
- Function signature unchanged

---

## Function Signature Changes

### Functions with Changed Signatures

The following functions had their signatures updated to include `orgId` as a parameter:

1. **`updateCanvasPositions`**
   - **Before:** `(lensId: string, request: UpdateCanvasPositionsRequest)`
   - **After:** `(lensId: string, orgId: string, request: UpdateCanvasPositionsRequest)`

2. **`updateBoardCard`**
   - **Before:** `(lensId: string, request: UpdateBoardCardRequest)`
   - **After:** `(lensId: string, orgId: string, request: UpdateBoardCardRequest)`

3. **`updateBoardLanes`**
   - **Before:** `(lensId: string, request: UpdateBoardLanesRequest)`
   - **After:** `(lensId: string, orgId: string, request: UpdateBoardLanesRequest)`

4. **`updateBatchLayout`**
   - **Before:** `(lensId: string, request: { canvasPositions?, boardPositions? })`
   - **After:** `(lensId: string, orgId: string, request: { canvasPositions?, boardPositions? })`

**Note:** These signature changes were necessary because orgId is required in the URL path for production routes. The hooks that call these functions were updated to accept and pass orgId.

### Functions with Unchanged Signatures

All other functions maintained their original signatures:
- `provision`
- `getFullMetadata`
- `getFolder`
- `createDesktopLens`
- `updateDesktopLens`
- `updateFolderLens`
- `deleteVault`

---

## Hook Updates

### useCanvasPositions
- **Added:** `orgId: string` to `UseCanvasPositionsOptions`
- **Updated:** `updateBatchLayout` call to include orgId parameter
- **Updated:** Component (`CanvasView`) to pass orgId to hook

### useBoardState
- **Added:** `orgId: string` to `UseBoardStateOptions`
- **Updated:** `updateBatchLayout` and `updateBoardLanes` calls to include orgId parameter
- **Updated:** Component (`BoardView`) to pass orgId to hook

---

## Build Verification

```bash
cd frontend
npm run build
```

**Result:** ✅ **PASSES**
- TypeScript compilation successful
- No type errors
- No linting errors (only pre-existing warnings about restricted imports)
- All pages generated successfully

---

## Internal Route Verification

**Search for remaining internal routes:**
```bash
grep -r "/internal/airunote" frontend/
```

**Result:** ✅ **NO MATCHES FOUND**

All Phase 3 endpoints have been successfully migrated. No internal route calls remain for migrated endpoints.

---

## Endpoints Still Using Internal Routes

**None** - All endpoints implemented in Phase 3 have been migrated to production routes.

---

## Next Steps

### Phase 5: Production Verification
- Test all migrated endpoints in production environment
- Verify metadata loads correctly
- Verify provision works
- Verify canvas/board operations
- Verify folder/document CRUD
- Verify lens operations

### Phase 6: Remove Internal Routes
- Delete internal route file (`airunote.internal.routes.ts`)
- Remove internal route registration from `server.ts`
- Final cleanup and verification

---

## Notes

- All function signatures maintained where possible
- Only 4 functions required signature changes (to add orgId parameter)
- Hooks updated to accept and pass orgId from component props
- No breaking changes to component interfaces
- Build passes successfully
- All internal route calls removed for Phase 3 endpoints
