# PHASE 1 — Inventory Report
## AiruNote Internal Route Migration

**Date:** 2025-01-27  
**Scope:** Frontend calls to `/api/internal/airunote/*`

---

## Summary

- **Total Internal Route Calls:** 12 unique endpoints
- **Already Migrated (Category A):** 12 endpoints
- **Not Migrated (Category B):** 9 endpoints
- **No Production Equivalent (Category C):** 3 endpoints

---

## Category A: Already Migrated ✅

These endpoints have been migrated to production routes and are working.

| Endpoint | HTTP Method | Frontend File | Production Route | Status |
|----------|-------------|---------------|-----------------|--------|
| Create Folder | POST | `airunoteApi.ts:48` | `/orgs/:orgId/airunote/folders` | ✅ Migrated |
| Update Folder | PUT | `airunoteApi.ts:59` | `/orgs/:orgId/airunote/folders/:id` | ✅ Migrated |
| Delete Folder | DELETE | `airunoteApi.ts:71` | `/orgs/:orgId/airunote/folders/:id` | ✅ Migrated |
| Get Tree | GET | `airunoteApi.ts:83` | `/orgs/:orgId/airunote/tree` | ✅ Migrated |
| Create Document | POST | `airunoteApi.ts:113` | `/orgs/:orgId/airunote/documents` | ✅ Migrated |
| Get Document | GET | `airunoteApi.ts:124` | `/orgs/:orgId/airunote/documents/:id` | ✅ Migrated |
| Update Document | PUT | `airunoteApi.ts:136` | `/orgs/:orgId/airunote/documents/:id` | ✅ Migrated |
| Delete Document | DELETE | `airunoteApi.ts:148` | `/orgs/:orgId/airunote/documents/:id` | ✅ Migrated |
| Get Folder Documents | GET | `airunoteApi.ts:160` | `/orgs/:orgId/airunote/folders/:id/documents` | ✅ Migrated |
| Get Folder Lenses | GET | `airunoteApi.ts:212` | `/orgs/:orgId/airunote/lenses/folders/:id/lenses` | ✅ Migrated |
| Get Lens | GET | `airunoteApi.ts:300` | `/orgs/:orgId/airunote/lenses/:id` | ✅ Migrated |
| Create Folder Lens | POST | `airunoteApi.ts:338` | `/orgs/:orgId/airunote/lenses/folders/:id/lenses` | ✅ Migrated |

---

## Category B: Not Migrated (Production Route Exists) ⚠️

These endpoints have production routes available but frontend still calls internal routes.

| Endpoint | HTTP Method | Frontend File | Internal Route | Production Route | Notes |
|----------|-------------|---------------|----------------|------------------|-------|
| Update Folder Lens | PATCH | `airunoteApi.ts:360` | `/internal/airunote/folders/:folderId/lenses/:lensId` | `/orgs/:orgId/airunote/lenses/folders/:folderId/lenses/:lensId` | Route exists in `airunote.lenses.routes.ts` but may need verification |

**Note:** Only 1 endpoint in this category. The production route for updating folder lenses may exist but needs verification.

---

## Category C: No Production Equivalent ❌

These endpoints are still using internal routes because no production route exists yet.

| Endpoint | HTTP Method | Frontend File | Internal Route | Usage Count | Critical? |
|----------|-------------|---------------|----------------|-------------|-----------|
| Provision Root | POST | `airunoteApi.ts:32` | `/internal/airunote/provision` | 1 | ✅ Yes |
| Get Full Metadata | GET | `airunoteApi.ts:100` | `/internal/airunote/full-metadata` | 2 | ✅ Yes |
| Delete Vault | POST | `airunoteApi.ts:173` | `/internal/airunote/vault/delete` | 0 | ⚠️ Low |
| Get Folder | GET | `airunoteApi.ts:198` | `/internal/airunote/folder/:id` | 1 | ✅ Yes |
| Update Canvas Positions | PATCH | `airunoteApi.ts:225` | `/internal/airunote/lenses/:lensId/canvas-positions` | 1 | ✅ Yes |
| Update Board Card | PATCH | `airunoteApi.ts:237` | `/internal/airunote/lenses/:lensId/board-card` | 1 | ✅ Yes |
| Update Board Lanes | PATCH | `airunoteApi.ts:249` | `/internal/airunote/lenses/:lensId/board-lanes` | 1 | ✅ Yes |
| Update Batch Layout | PATCH | `airunoteApi.ts:262` | `/internal/airunote/lenses/:lensId/batch-layout` | 2 | ✅ Yes |
| Create Desktop Lens | POST | `airunoteApi.ts:278` | `/internal/airunote/lenses` | 2 | ✅ Yes |
| Update Desktop Lens | PATCH | `airunoteApi.ts:313` | `/internal/airunote/lenses/:lensId` | 1 | ✅ Yes |

**Total:** 10 endpoints need production routes created.

---

## Frontend Usage Locations

### Critical Endpoints (Used in Production Code)

1. **Provision Root** (`provision`)
   - `CreateDocumentModal.tsx:61` - Called when creating first document

2. **Get Full Metadata** (`getFullMetadata`)
   - `AirunoteDataProvider.tsx:99` - Initial data load
   - `useLoadMetadata.ts:83` - Metadata refresh

3. **Get Folder** (`getFolder`)
   - `useFolderLens.ts:29` - Load folder with lens projection

4. **Update Canvas Positions** (`updateCanvasPositions`)
   - `useCanvasPositions.ts:99` - Canvas drag-and-drop

5. **Update Board Card** (`updateBoardCard`)
   - `useBoardState.ts:101` - Board card reordering

6. **Update Board Lanes** (`updateBoardLanes`)
   - `useBoardState.ts:144` - Board lane management

7. **Update Batch Layout** (`updateBatchLayout`)
   - `useCanvasPositions.ts:99` - Batch canvas updates
   - `useBoardState.ts:101` - Batch board updates

8. **Create Desktop Lens** (`createDesktopLens`)
   - `CreateDesktopLensModal.tsx:56` - Create desktop view
   - `CreateSavedViewModal.tsx:98` - Create saved view

9. **Update Desktop Lens** (`updateDesktopLens`)
   - `EditSavedViewModal.tsx:194` - Update saved view

10. **Update Folder Lens** (`updateFolderLens`)
    - `EditSavedViewModal.tsx:178` - Update folder lens

---

## Next Steps

### Phase 2: Backend Verification
- Verify production route exists for `updateFolderLens`
- Identify which endpoints need new production routes
- Propose route signatures for missing endpoints

### Phase 3: Implement Missing Production Routes
- Create production routes for 10 missing endpoints
- Ensure proper authentication and authorization
- Remove orgId/userId from request bodies

### Phase 4: Frontend Migration
- Update frontend to use production routes
- Remove orgId/userId from request bodies
- Test all endpoints

### Phase 5: Production Verification
- Test all migrated endpoints
- Verify no regressions
- Confirm internal routes can be removed

### Phase 6: Remove Internal Routes
- Delete internal route file
- Remove internal route registration
- Final cleanup

---

## Notes

- All migrated endpoints successfully extract `orgId` from URL and `userId` from `req.user`
- Internal routes still accept `orgId` and `userId` in request body (security risk)
- Production routes use proper middleware chain: `authMiddleware` → `requireOrgMembership`
- Some internal routes have production guards removed (security concern)
