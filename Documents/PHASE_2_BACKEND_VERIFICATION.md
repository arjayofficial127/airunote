# PHASE 2 — Backend Verification Report
## Production Route Existence Check

**Date:** 2025-01-27  
**Scope:** Verify production routes exist for all internal endpoints

---

## Summary

- **Total Endpoints Needing Verification:** 10
- **Production Routes Exist:** 0
- **Production Routes Missing:** 10
- **Routes Need Creation:** 10

---

## Category B: Not Migrated (Production Route Verification)

### 1. Update Folder Lens
- **Internal Route:** `PATCH /internal/airunote/folders/:folderId/lenses/:lensId`
- **Frontend Call:** `airunoteApi.ts:360`
- **Production Route Check:** ❌ **NOT FOUND**
- **Current Production Routes:**
  - `GET /orgs/:orgId/airunote/lenses/folders/:folderId/lenses` ✅ (exists)
  - `POST /orgs/:orgId/airunote/lenses/folders/:folderId/lenses` ✅ (exists)
  - `PATCH /orgs/:orgId/airunote/lenses/folders/:folderId/lenses/:lensId` ❌ (missing)

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/folders/:folderId/lenses/:lensId
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `folderId` from `req.params`
- Extract `lensId` from `req.params`
- Body: `{ name?: string; type?: string; metadata?: Record<string, unknown>; query?: Record<string, unknown> | null }`
- Validate orgId, folderId, lensId (UUID format)
- Validate folder belongs to org
- Validate user has write access to folder
- Call `domainService.updateFolderLens()` or repository method
- Return: `{ success: true, data: { lens } }`

---

## Category C: No Production Equivalent (Route Proposals)

### 2. Provision Root
- **Internal Route:** `POST /internal/airunote/provision`
- **Frontend Call:** `airunoteApi.ts:32`
- **Usage:** `CreateDocumentModal.tsx:61` (critical - first document creation)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
POST /orgs/:orgId/airunote/provision
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Body: `{ orgOwnerUserId?: string }` (optional, defaults to userId)
- Validate orgId (UUID format)
- Validate user is member of org
- Call `domainService.ensureUserRootExists(orgId, userId, orgOwnerUserId || userId)`
- Return: `{ success: true, data: { rootFolder } }`

**Notes:**
- Idempotent operation (safe to call multiple times)
- Creates root folder if it doesn't exist
- Used when creating first document in org

---

### 3. Get Full Metadata
- **Internal Route:** `GET /internal/airunote/full-metadata`
- **Frontend Call:** `airunoteApi.ts:100`
- **Usage:** 
  - `AirunoteDataProvider.tsx:99` (initial data load)
  - `useLoadMetadata.ts:83` (metadata refresh)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
GET /orgs/:orgId/airunote/metadata
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Query params: `parentFolderId?: string` (optional)
- Validate orgId (UUID format)
- Validate user is member of org
- Call `domainService.getFullMetadata(orgId, userId, parentFolderId)`
- Return: `{ success: true, data: { folders: [], documents: [] } }`

**Notes:**
- Returns all folders and documents metadata (no content)
- Used for initial app load and refresh
- Critical for app functionality

---

### 4. Delete Vault
- **Internal Route:** `POST /internal/airunote/vault/delete`
- **Frontend Call:** `airunoteApi.ts:173`
- **Usage:** 0 (not currently used in frontend)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
DELETE /orgs/:orgId/airunote/vault
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Body: `{ confirmation: 'DELETE_VAULT_PERMANENTLY' }` (required)
- Validate orgId (UUID format)
- Validate confirmation string matches
- Validate user is member of org
- Call `domainService.deleteUserVault(orgId, userId)`
- Return: `{ success: true, data: { deletedFolders, deletedDocuments, deletedShares, deletedLinks } }`

**Notes:**
- Hard delete operation (destructive)
- Requires explicit confirmation
- Low priority (not currently used)

---

### 5. Get Folder
- **Internal Route:** `GET /internal/airunote/folder/:id`
- **Frontend Call:** `airunoteApi.ts:198`
- **Usage:** `useFolderLens.ts:29` (load folder with lens projection)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
GET /orgs/:orgId/airunote/folders/:id
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `id` from `req.params` (folderId)
- Validate orgId, id (UUID format)
- Validate folder exists and belongs to org
- Validate user has read access
- Call `repository.findFolderById(id)` or `domainService.getFolder(id, orgId, userId)`
- Return: `{ success: true, data: { folder } }`

**Notes:**
- Returns folder with lens projection
- Used for folder detail views
- Critical for folder navigation

---

### 6. Update Canvas Positions
- **Internal Route:** `PATCH /internal/airunote/lenses/:lensId/canvas-positions`
- **Frontend Call:** `airunoteApi.ts:225`
- **Usage:** `useCanvasPositions.ts:99` (canvas drag-and-drop)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/:lensId/canvas-positions
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `lensId` from `req.params`
- Body: `{ positions: Record<string, { x: number; y: number }> }`
- Validate orgId, lensId (UUID format)
- Validate lens exists and user has write access
- Call `repository.updateCanvasPositions(lensId, positions)` or use batch items endpoint
- Return: `{ success: true, data: { lens } }`

**Alternative:** Use existing `PATCH /orgs/:orgId/airunote/lenses/:lensId/items` endpoint with canvas position data.

**Notes:**
- Used for canvas view drag-and-drop
- Critical for canvas functionality
- Could potentially use batch items endpoint

---

### 7. Update Board Card
- **Internal Route:** `PATCH /internal/airunote/lenses/:lensId/board-card`
- **Frontend Call:** `airunoteApi.ts:237`
- **Usage:** `useBoardState.ts:101` (board card reordering)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/:lensId/board-card
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `lensId` from `req.params`
- Body: `{ entityId: string; columnId?: string; order?: number }`
- Validate orgId, lensId, entityId (UUID format)
- Validate lens exists and user has write access
- Call `repository.updateBoardCardPosition(lensId, entityId, columnId, order)` or use batch items endpoint
- Return: `{ success: true, data: { lens } }`

**Alternative:** Use existing `PATCH /orgs/:orgId/airunote/lenses/:lensId/items` endpoint with board position data.

**Notes:**
- Used for board view card reordering
- Critical for board functionality
- Could potentially use batch items endpoint

---

### 8. Update Board Lanes
- **Internal Route:** `PATCH /internal/airunote/lenses/:lensId/board-lanes`
- **Frontend Call:** `airunoteApi.ts:249`
- **Usage:** `useBoardState.ts:144` (board lane management)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/:lensId/board-lanes
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `lensId` from `req.params`
- Body: `{ lanes: Array<{ id: string; title: string; description?: string; order: number }> }`
- Validate orgId, lensId (UUID format)
- Validate lens exists and user has write access
- Validate lanes array structure
- Call `repository.updateBoardLanes(lensId, lanes)` or update lens metadata
- Return: `{ success: true, data: { lens } }`

**Notes:**
- Used for board view lane management
- Critical for board functionality
- Updates lens metadata with new lane structure

---

### 9. Update Batch Layout
- **Internal Route:** `PATCH /internal/airunote/lenses/:lensId/batch-layout`
- **Frontend Call:** `airunoteApi.ts:262`
- **Usage:** 
  - `useCanvasPositions.ts:99` (batch canvas updates)
  - `useBoardState.ts:101` (batch board updates)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/:lensId/batch-layout
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `lensId` from `req.params`
- Body: `{ canvasPositions?: Record<string, { x: number; y: number }>; boardPositions?: Record<string, { laneId: string; order: number }> }`
- Validate orgId, lensId (UUID format)
- Validate lens exists and user has write access
- If canvasPositions: update canvas positions
- If boardPositions: update board positions
- Call appropriate repository methods or use batch items endpoint
- Return: `{ success: true, data: { lens } }`

**Alternative:** Use existing `PATCH /orgs/:orgId/airunote/lenses/:lensId/items` endpoint with combined position data.

**Notes:**
- Used for batch updates (canvas + board)
- Critical for performance (reduces API calls)
- Could potentially use batch items endpoint

---

### 10. Create Desktop Lens
- **Internal Route:** `POST /internal/airunote/lenses`
- **Frontend Call:** `airunoteApi.ts:278`
- **Usage:** 
  - `CreateDesktopLensModal.tsx:56` (create desktop view)
  - `CreateSavedViewModal.tsx:98` (create saved view)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
POST /orgs/:orgId/airunote/lenses
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Body: `{ name: string; type: 'desktop' | 'saved'; query?: Record<string, unknown> | null; metadata?: Record<string, unknown> }`
- Validate orgId (UUID format)
- Validate name (non-empty string)
- Validate type (desktop or saved)
- Validate user is member of org
- Call `domainService.createDesktopLens(orgId, userId, { name, type, query, metadata })`
- Return: `{ success: true, data: { lens } }`

**Notes:**
- Creates desktop or saved lens (no folderId)
- Used for global views
- Critical for desktop/saved view functionality

---

### 11. Update Desktop Lens
- **Internal Route:** `PATCH /internal/airunote/lenses/:lensId`
- **Frontend Call:** `airunoteApi.ts:313`
- **Usage:** `EditSavedViewModal.tsx:194` (update saved view)
- **Production Route:** ❌ **MISSING**

**Proposed Production Route:**
```
PATCH /orgs/:orgId/airunote/lenses/:lensId
```

**Route Signature:**
- Extract `orgId` from `req.params`
- Extract `userId` from `req.user`
- Extract `lensId` from `req.params`
- Body: `{ name?: string; query?: Record<string, unknown> | null; metadata?: Record<string, unknown> }`
- Validate orgId, lensId (UUID format)
- Validate lens exists and belongs to org (or user owns it)
- Validate user has write access
- Call `domainService.updateDesktopLens(lensId, orgId, userId, { name, query, metadata })`
- Return: `{ success: true, data: { lens } }`

**Notes:**
- Updates desktop or saved lens (no folderId)
- Used for editing saved views
- Critical for saved view functionality

---

## Route Implementation Priority

### High Priority (Critical Functionality)
1. **Provision Root** - Required for first document creation
2. **Get Full Metadata** - Required for initial app load
3. **Get Folder** - Required for folder navigation
4. **Create Desktop Lens** - Required for desktop/saved views
5. **Update Desktop Lens** - Required for editing saved views

### Medium Priority (Feature Functionality)
6. **Update Folder Lens** - Required for folder lens editing
7. **Update Canvas Positions** - Required for canvas drag-and-drop
8. **Update Board Card** - Required for board card reordering
9. **Update Board Lanes** - Required for board lane management
10. **Update Batch Layout** - Performance optimization

### Low Priority (Not Currently Used)
11. **Delete Vault** - Not currently used in frontend

---

## Implementation Notes

### Route Registration
All routes should be registered in:
- `airunote.routes.ts` for folder/document operations
- `airunote.lenses.routes.ts` for lens operations

### Middleware Chain
All routes must use:
```typescript
router.use(authMiddleware);
router.use(requireOrgMembership);
```

### Validation Requirements
- All UUIDs must be validated using `isUuidLike()`
- All orgId must match `req.params.orgId`
- All userId must come from `req.user.userId`
- No orgId or userId in request body

### Response Format
All routes must return:
```typescript
{
  success: true,
  data: { ... }
}
```

### Error Handling
All routes must handle:
- 400: Validation errors
- 401: Authentication required
- 403: Access denied
- 404: Resource not found
- 500: Internal server error

---

## Next Steps

1. **Phase 3:** Implement all 10 missing production routes
2. **Phase 4:** Update frontend to use production routes
3. **Phase 5:** Test all endpoints in production
4. **Phase 6:** Remove internal routes
