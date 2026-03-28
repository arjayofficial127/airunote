# Frontend Internal API Usage Audit

**Date:** 2026-03-01  
**Scope:** All usage of `/api/internal/airunote` endpoints in frontend codebase

## Internal API Usage Table

| File Path | Line | Function Name | HTTP Method | Full Endpoint | Used in Production? | userId in Body? | orgId in Body? |
|-----------|------|---------------|-------------|---------------|-------------------|-----------------|----------------|
| `components/airunote/services/airunoteApi.ts` | 36 | `provision` | POST | `/internal/airunote/provision` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 50 | `createFolder` | POST | `/internal/airunote/folder` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 61 | `updateFolder` | PUT | `/internal/airunote/folder/:id` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 73 | `deleteFolder` | DELETE | `/internal/airunote/folder/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 91 | `getTree` | GET | `/internal/airunote/tree` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 102 | `getFullMetadata` | GET | `/internal/airunote/full-metadata` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 114 | `createDocument` | POST | `/internal/airunote/document` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 126 | `getDocument` | GET | `/internal/airunote/document/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 139 | `updateDocument` | PUT | `/internal/airunote/document/:id` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 151 | `deleteDocument` | DELETE | `/internal/airunote/document/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 165 | `getFolderDocuments` | GET | `/internal/airunote/folder/:id/documents` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 186 | `deleteVault` | POST | `/internal/airunote/vault/delete` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 203 | `getFolder` | GET | `/internal/airunote/folder/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 217 | `getFolderLenses` | GET | `/internal/airunote/folders/:id/lenses` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 230 | `updateCanvasPositions` | PATCH | `/internal/airunote/lenses/:id/canvas-positions` | Yes | No | No |
| `components/airunote/services/airunoteApi.ts` | 241 | `updateBoardCard` | PATCH | `/internal/airunote/lenses/:id/board-card` | Yes | No | No |
| `components/airunote/services/airunoteApi.ts` | 252 | `updateBoardLanes` | PATCH | `/internal/airunote/lenses/:id/board-lanes` | Yes | No | No |
| `components/airunote/services/airunoteApi.ts` | 267 | `updateBatchLayout` | PATCH | `/internal/airunote/lenses/:id/batch-layout` | Yes | No | No |
| `components/airunote/services/airunoteApi.ts` | 283 | `createDesktopLens` | POST | `/internal/airunote/lenses` | Yes | Yes | Yes |
| `components/airunote/services/airunoteApi.ts` | 302 | `getLens` | GET | `/internal/airunote/lenses/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 320 | `updateDesktopLens` | PATCH | `/internal/airunote/lenses/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 348 | `createFolderLens` | POST | `/internal/airunote/folders/:id/lenses` | Yes | No (query params) | No (query params) |
| `components/airunote/services/airunoteApi.ts` | 373 | `updateFolderLens` | PATCH | `/internal/airunote/folders/:id/lenses/:lensId` | Yes | No (query params) | No (query params) |
| `app/(dashboard)/orgs/[orgId]/airunote/page.tsx` | 69 | `useEffect` (anonymous) | POST | `/internal/airunote/provision` | Yes | Yes | Yes |
| `components/airunote/hooks/useCreateFolder.ts` | 22 | `mutationFn` (anonymous) | POST | `/internal/airunote/folder` | Yes | Yes | Yes |
| `components/airunote/hooks/useUpdateFolder.ts` | 43 | `mutationFn` (anonymous) | PUT | `/internal/airunote/folder/:id` | Yes | Yes | Yes |
| `components/airunote/hooks/useMoveFolder.ts` | 17 | `mutationFn` (anonymous) | PUT | `/internal/airunote/folder/:id` | Yes | Yes | Yes |
| `components/airunote/hooks/useDeleteFolder.ts` | 16 | `mutationFn` (anonymous) | DELETE | `/internal/airunote/folder/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/hooks/useCreateDocument.ts` | 17 | `mutationFn` (anonymous) | POST | `/internal/airunote/document` | Yes | Yes | Yes |
| `components/airunote/hooks/useUpdateDocument.ts` | 17 | `mutationFn` (anonymous) | PUT | `/internal/airunote/document/:id` | Yes | Yes | Yes |
| `components/airunote/hooks/useMoveDocument.ts` | 21 | `mutationFn` (anonymous) | PUT | `/internal/airunote/document/:id` | Yes | Yes | Yes |
| `components/airunote/hooks/useDeleteDocument.ts` | 16 | `mutationFn` (anonymous) | DELETE | `/internal/airunote/document/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/components/CreateDocumentModal.tsx` | 61 | `handleSubmit` (async) | POST | `/internal/airunote/provision` | Yes | Yes | Yes |
| `components/airunote/components/CreateFolderLensModal.tsx` | 63 | `handleSubmit` (async) | POST | `/internal/airunote/folders/:id/lenses` | Yes | No (query params) | No (query params) |
| `components/airunote/components/EditSavedViewModal.tsx` | 178 | `updateMutation.mutationFn` (async) | PATCH | `/internal/airunote/folders/:id/lenses/:lensId` | Yes | No (query params) | No (query params) |
| `components/airunote/components/EditSavedViewModal.tsx` | 194 | `updateMutation.mutationFn` (async) | PATCH | `/internal/airunote/lenses/:id` | Yes | No (query params) | No (query params) |
| `components/airunote/components/CreateDesktopLensModal.tsx` | 56 | `createMutation.mutationFn` (async) | POST | `/internal/airunote/lenses` | Yes | Yes | Yes |
| `components/airunote/components/CreateSavedViewModal.tsx` | 98 | `createMutation.mutationFn` (async) | POST | `/internal/airunote/lenses` | Yes | Yes | Yes |
| `components/airunote/providers/AirunoteDataProvider.tsx` | 99 | `loadMetadata` (async) | GET | `/internal/airunote/full-metadata` | Yes | No (query params) | No (query params) |

## Summary Statistics

- **Total Internal API Calls:** 36
- **Used in Production:** 36 (100%)
- **POST Requests with userId in Body:** 7
- **POST Requests with orgId in Body:** 7
- **PUT Requests with userId in Body:** 3
- **PUT Requests with orgId in Body:** 3
- **PATCH Requests with userId in Body:** 0
- **PATCH Requests with orgId in Body:** 0
- **GET Requests:** 8 (all use query params, not body)
- **DELETE Requests:** 2 (all use query params, not body)

## Critical Findings

### 1. All Internal Routes Used in Production

**Finding:** All 36 internal API calls are used in production code paths:
- Main Airunote pages (`/orgs/[orgId]/airunote/*`)
- Production components (modals, hooks, providers)
- No conditional compilation or dev-only guards

**Impact:** These calls will fail in production if backend production guards are enabled.

### 2. Body Parameter Usage

**POST Requests Sending userId/orgId in Body:**
- `provision` - sends `{ orgId, userId, orgOwnerUserId }`
- `createFolder` - sends `CreateFolderRequest { orgId, userId, ... }`
- `createDocument` - sends `CreateDocumentRequest { orgId, userId, ... }`
- `createDesktopLens` - sends `{ orgId, userId, ... }`
- `deleteVault` - sends `{ orgId, userId, confirmedByUserId, ... }`

**PUT Requests Sending userId/orgId in Body:**
- `updateFolder` - sends `UpdateFolderRequest { orgId, userId, ... }`
- `updateDocument` - sends `UpdateDocumentRequest { orgId, userId, ... }`

**PATCH Requests:**
- No PATCH requests send userId/orgId in body
- Lens update endpoints use query params for orgId/userId

**GET/DELETE Requests:**
- All use query params for orgId/userId (not body)

### 3. Request Body Structure

**CreateFolderRequest:**
```typescript
{
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}
```

**UpdateFolderRequest:**
```typescript
{
  orgId: string;
  userId: string;
  humanId?: string;
  parentFolderId?: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}
```

**CreateDocumentRequest:**
```typescript
{
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
  attributes?: Record<string, any>;
}
```

**UpdateDocumentRequest:**
```typescript
{
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string;
  attributes?: Record<string, any>;
}
```

## Production Risk Assessment

### High Risk

1. **All Internal Routes Used in Production**
   - Frontend makes 36 calls to `/api/internal/airunote/*`
   - All are in production code paths
   - Backend has production guards that return 403
   - **Result:** Production will be broken

2. **userId/orgId in Request Body**
   - 10 endpoints accept userId/orgId from body
   - No server-side validation of authenticated user
   - **Result:** Security vulnerability (user can impersonate others)

### Medium Risk

1. **No Authentication Headers**
   - Internal routes don't require auth middleware
   - Frontend sends Authorization header (via apiClient interceptor)
   - Backend ignores it for internal routes
   - **Result:** Token is sent but not validated

2. **Production Guard Inconsistency**
   - Some routes have guards removed (`/provision`, `/full-metadata`)
   - Others still have guards
   - **Result:** Inconsistent behavior

## Recommendations

1. **Immediate:** Remove production guards from all internal routes OR migrate frontend to use production routes
2. **Security:** Add authentication middleware to internal routes
3. **Architecture:** Extract userId from `req.user` instead of request body
4. **Architecture:** Extract orgId from `req.params` instead of request body
