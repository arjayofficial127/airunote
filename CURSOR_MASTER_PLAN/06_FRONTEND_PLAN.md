# 🎨 AIRUNOTE FRONTEND PLAN
## Implementation-Ready Guide Based on Backend Reality

**Status:** PLANNING  
**Mode:** QUESTION (Analysis Only)  
**Last Updated:** Phase 3 Complete

---

## A) BACKEND REALITY SUMMARY (AUTHORITATIVE)

### A.1 Database Schema

**Location:** `backend-node/src/infrastructure/db/drizzle/schema.ts`

#### Tables

1. **`airu_folders`**
   - `id`: uuid (PK)
   - `org_id`: uuid (FK → orgs.id, NOT NULL, ON DELETE CASCADE)
   - `owner_user_id`: uuid (FK → users.id, NOT NULL, ON DELETE CASCADE)
   - `parent_folder_id`: uuid (FK → airu_folders.id, NOT NULL, ON DELETE RESTRICT)
   - `human_id`: varchar(255) (NOT NULL)
   - `visibility`: enum('private', 'org', 'public') (NOT NULL, DEFAULT 'private')
   - `created_at`: timestamp (NOT NULL, DEFAULT now())
   - **Constraints:**
     - UNIQUE(org_id, owner_user_id, parent_folder_id, human_id)
     - Index: org_id
     - Index: parent_folder_id
     - Check: org root self-parent rule (human_id = '__org_root__' → parent_folder_id = id)

2. **`airu_documents`**
   - `id`: uuid (PK)
   - `folder_id`: uuid (FK → airu_folders.id, NOT NULL, ON DELETE CASCADE)
   - `owner_user_id`: uuid (FK → users.id, NOT NULL, ON DELETE CASCADE)
   - `type`: enum('TXT', 'MD', 'RTF') (NOT NULL)
   - `name`: varchar(255) (NOT NULL)
   - `content`: text (nullable, deprecated in favor of canonical_content)
   - `canonical_content`: text (NOT NULL, DEFAULT '')
   - `shared_content`: text (nullable, Phase 2)
   - `visibility`: enum('private', 'org', 'public') (NOT NULL, DEFAULT 'private')
   - `state`: enum('active', 'archived', 'trashed') (NOT NULL, DEFAULT 'active')
   - `created_at`: timestamp (NOT NULL, DEFAULT now())
   - `updated_at`: timestamp (NOT NULL, DEFAULT now())
   - **Constraints:**
     - UNIQUE(folder_id, name)
     - Index: folder_id
     - Index: owner_user_id
     - Index: state

3. **`airu_user_roots`**
   - `org_id`: uuid (FK → orgs.id, NOT NULL, ON DELETE CASCADE)
   - `user_id`: uuid (FK → users.id, NOT NULL, ON DELETE CASCADE)
   - `root_folder_id`: uuid (FK → airu_folders.id, NOT NULL, ON DELETE CASCADE)
   - `created_at`: timestamp (NOT NULL, DEFAULT now())
   - **Constraints:**
     - UNIQUE(org_id, user_id)
     - Partial unique index: one org root per org (WHERE human_id = '__org_root__')

4. **`airu_shortcuts`** (Not exposed in v1 routes)
   - `id`: uuid (PK)
   - `org_id`: uuid (FK → orgs.id, NOT NULL)
   - `owner_user_id`: uuid (FK → users.id, NOT NULL)
   - `name`: varchar(255) (NOT NULL)
   - `target_type`: enum('folder', 'document') (NOT NULL)
   - `target_id`: uuid (NOT NULL)
   - `created_at`: timestamp (NOT NULL, DEFAULT now())

5. **`airu_shares`** (Phase 2 - NOT USED IN V1)
6. **`airu_document_revisions`** (Phase 2 - NOT USED IN V1)
7. **`airu_audit_logs`** (Phase 3 - NOT USED IN V1)

#### Enums

- `airu_visibility`: 'private' | 'org' | 'public'
- `airu_document_type`: 'TXT' | 'MD' | 'RTF'
- `airu_document_state`: 'active' | 'archived' | 'trashed'
- `airu_shortcut_target_type`: 'folder' | 'document'
- `airu_share_type`: 'user' | 'org' | 'public' | 'link' (Phase 2)
- `airu_content_type`: 'canonical' | 'shared' (Phase 2)

### A.2 API Routes

**Location:** `backend-node/src/modules/airunote/airunote.internal.routes.ts`  
**Base Path:** `/internal/airunote`  
**Auth:** None (internal routes, production guard disabled in dev)

#### Endpoint Checklist

```
✅ POST   /internal/airunote/provision
✅ POST   /internal/airunote/folder
✅ PUT    /internal/airunote/folder/:id
✅ DELETE /internal/airunote/folder/:id
✅ GET    /internal/airunote/tree
✅ POST   /internal/airunote/document
✅ GET    /internal/airunote/document/:id
✅ PUT    /internal/airunote/document/:id
✅ DELETE /internal/airunote/document/:id
✅ GET    /internal/airunote/folder/:folderId/documents
✅ POST   /internal/airunote/vault/delete
```

#### Request/Response Shapes

**1. POST /provision**
- Request: `{ orgId: string, userId: string, orgOwnerUserId: string }`
- Response: `{ success: true, data: { rootFolder: AiruFolder } }`

**2. POST /folder**
- Request: `{ orgId: string, userId: string, parentFolderId: string, humanId: string }`
- Response: `{ success: true, data: { folder: AiruFolder } }`

**3. PUT /folder/:id**
- Request: `{ orgId: string, userId: string, humanId?: string, parentFolderId?: string }`
- Response: `{ success: true, data: { folder: AiruFolder } }`
- Note: Cannot rename and move in same request

**4. DELETE /folder/:id**
- Query: `?orgId=...&userId=...`
- Response: `{ success: true, data: {} }`

**5. GET /tree**
- Query: `?orgId=...&userId=...&parentFolderId=...` (optional)
- Response: `{ success: true, data: FolderTreeResponse }`

**6. POST /document**
- Request: `{ orgId: string, userId: string, folderId: string, name: string, content: string, type: 'TXT' | 'MD' | 'RTF' }`
- Response: `{ success: true, data: { document: AiruDocument } }`

**7. GET /document/:id**
- Query: `?orgId=...&userId=...`
- Response: `{ success: true, data: { document: AiruDocument } }`

**8. PUT /document/:id**
- Request: `{ orgId: string, userId: string, content?: string, name?: string, folderId?: string }`
- Response: `{ success: true, data: { document: AiruDocument } }`
- Note: Cannot update content, name, and move in same request

**9. DELETE /document/:id**
- Query: `?orgId=...&userId=...`
- Response: `{ success: true, data: {} }`

**10. GET /folder/:folderId/documents**
- Query: `?orgId=...&userId=...`
- Response: `{ success: true, data: { documents: AiruDocument[] } }`

**11. POST /vault/delete**
- Request: `{ orgId: string, userId: string, confirmedByUserId: string, confirmation: 'DELETE_VAULT_PERMANENTLY' }`
- Response: `{ success: true, data: { deletedFolders: number, deletedDocuments: number, deletedShares: number, deletedLinks: number } }`

### A.3 Domain Invariants (Constitution v1.0)

**Enforced by Backend:**

1. **Ownership:** Every folder/document has exactly one `owner_user_id`. No org-level ownership.
2. **Org Boundary:** All queries require `orgId`. No cross-org access.
3. **Admin Non-Access:** No admin bypass logic. Owner-only access.
4. **Root Integrity:** Org root has `human_id = '__org_root__'` and `parent_folder_id = id` (self-parent).
5. **Privacy Default:** All user vaults start `visibility = 'private'`.
6. **Save-Before-Edit:** Documents must be created before editing (no draft state in backend).
7. **Hard Delete:** Deletion is permanent (no soft delete for v1).
8. **Folder Hierarchy:** `parent_folder_id` is NOT NULL. No implicit root via NULL.
9. **Unique Names:** Folder names unique per `(orgId, ownerUserId, parentFolderId)`. Document names unique per `(folderId)`.

---

## B) REQUIRED FRONTEND PAGES / SURFACES (v1)

### B.1 Install Gate Screen

**Status:** ❌ NOT NEEDED  
**Reason:** Airunote is NOT an installable app. It's a core feature/module.  
**Route:** `/orgs/[orgId]/airunote` (direct access, no install check needed)

**Note:** If you want Airunote to be an installable app in the future, you would need to:
1. Integrate with app installation system
2. Add app metadata/registration
3. Add installation check endpoint
4. Move routes from `/internal/airunote` to `/api/orgs/:orgId/apps/airunote`

### B.1 Airunote Home

**Route:** `/orgs/[orgId]/airunote` (NOT `/apps/airunote` - it's a core feature)  
**Purpose:** Root view showing user's folder tree and documents  
**Components:**
- Folder tree sidebar (nested folders)
- Document list (documents in current folder)
- Breadcrumb navigation (folder path)
- Create folder button
- Create document button
- Paste Dock trigger button

**Data:**
- Fetch: `GET /internal/airunote/tree?orgId=...&userId=...`
- Display: `FolderTreeResponse` (folders + documents + children)

### B.2 Folder View

**Route:** `/orgs/[orgId]/airunote/folder/[folderId]`  
**Purpose:** View folder contents (children folders + documents)  
**Components:**
- Folder tree sidebar (highlight current folder)
- Document list (documents in folder)
- Child folders list
- Breadcrumb navigation
- Create folder button (creates in current folder)
- Create document button (creates in current folder)

**Data:**
- Fetch: `GET /internal/airunote/tree?orgId=...&userId=...&parentFolderId=[folderId]`
- Or: `GET /internal/airunote/folder/[folderId]/documents?orgId=...&userId=...` + separate folder children fetch

### B.3 Document View

**Route:** `/orgs/[orgId]/airunote/document/[documentId]`  
**Purpose:** View/edit document based on type  
**Components:**
- **TXT/MD:** Editor (monaco-editor or similar)
- **RTF:** Viewer-first (read-only by default, edit button if owner)
- Document name (editable)
- Save button
- Delete button
- Breadcrumb navigation

**Data:**
- Fetch: `GET /internal/airunote/document/[documentId]?orgId=...&userId=...`
- Update: `PUT /internal/airunote/document/[documentId]` (content or name)

**Constitution Compliance:**
- Save-before-edit: Document must exist before editing
- RTF viewer-first: Show read-only view initially

### B.4 Paste Dock Staging Surface

**Route:** `/orgs/[orgId]/airunote/paste` (or modal/overlay)  
**Purpose:** Staging area for pasted content before saving  
**Components:**
- Paste input area (textarea or rich text)
- Type detection (TXT/MD/RTF)
- Type selector (manual override)
- Name input
- Folder selector (where to save)
- Save button (creates document, then redirects to document view)
- Cancel button

**Flow:**
1. User pastes content
2. System detects type (or user selects)
3. User names document
4. User selects folder
5. User clicks Save
6. `POST /internal/airunote/document` (creates document)
7. Redirect to `/orgs/[orgId]/apps/airunote/document/[documentId]`

**Constitution Compliance:**
- Save-before-edit: Document created before opening editor

### B.5 Trash / Archive Views

**Status:** ❌ NOT SUPPORTED IN V1  
**Reason:** Backend has `state: 'trashed' | 'archived'` but no routes to filter by state  
**Gap:** Need `GET /internal/airunote/documents?orgId=...&userId=...&state=trashed`  
**Minimal Backend Addition:** Add query param `state` to `GET /folder/:folderId/documents` or create `GET /internal/airunote/documents?state=...`

---

## C) FRONTEND DATA CONTRACTS

### C.1 TypeScript Interfaces

**Location:** `frontend/apps/airunote/types/index.ts`

```typescript
// Derived from backend repository interfaces

export interface AiruFolder {
  id: string;
  orgId: string;
  ownerUserId: string;
  parentFolderId: string;
  humanId: string;
  visibility: 'private' | 'org' | 'public';
  createdAt: Date;
}

export interface AiruDocument {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  content: string; // Always use canonicalContent from backend
  canonicalContent?: string;
  sharedContent?: string | null;
  visibility: 'private' | 'org' | 'public';
  state: 'active' | 'archived' | 'trashed';
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderTreeResponse {
  folders: AiruFolder[];
  documents: AiruDocument[];
  children: FolderTreeResponse[];
}

// API Response Wrapper
export interface AirunoteApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code: string;
  };
}

// Request Types
export interface CreateFolderRequest {
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
}

export interface UpdateFolderRequest {
  orgId: string;
  userId: string;
  humanId?: string;
  parentFolderId?: string;
}

export interface CreateDocumentRequest {
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
}

export interface UpdateDocumentRequest {
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string;
}
```

### C.2 Error Handling

**Error Response Shape:**
```typescript
{
  success: false,
  error: {
    message: string;
    code: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
  }
}
```

**UI Error Handling:**
- `VALIDATION_ERROR` (400): Show inline validation message
- `FORBIDDEN` (403): Show "Access denied" message, redirect if needed
- `NOT_FOUND` (404): Show "Not found" message, redirect to home
- `INTERNAL_ERROR` (500): Show generic error, allow retry

**Network Errors:**
- Offline: Show offline indicator, queue for sync (if offline support added)
- Timeout: Show retry button
- Network error: Show "Connection failed" message

---

## D) FRONTEND STATE + ARCHITECTURE PLAN

### D.1 Folder Tree State Strategy

**Caching Keys:**
- `airunote:tree:${orgId}:${userId}:${parentFolderId || 'root'}`

**Optimistic Updates:**
- Create folder: Add to tree immediately, rollback on error
- Create document: Add to list immediately, rollback on error
- Delete folder/document: Remove immediately, rollback on error
- Rename: Update name immediately, rollback on error
- Move: Update parent immediately, rollback on error

**Invalidation Rules:**
- Create/update/delete folder: Invalidate tree cache for affected parent
- Create/update/delete document: Invalidate document list for affected folder
- Move folder: Invalidate both old and new parent trees
- Move document: Invalidate both old and new folder document lists

**State Management:**
- Use React Query (`@tanstack/react-query`) for server state
- Use React Context for UI state (sidebar open/closed, current folder selection)
- Use local state for form inputs (create folder/document modals)

### D.2 Service + Hooks Structure

**File Structure:**
```
frontend/
  apps/
    airunote/
      services/
        airunoteApi.ts          # API client functions
        airunoteCache.ts        # Cache key helpers
      hooks/
        useAirunoteTree.ts      # Fetch folder tree
        useAirunoteDocument.ts  # Fetch/update document
        useCreateFolder.ts      # Create folder mutation
        useCreateDocument.ts    # Create document mutation
        useUpdateDocument.ts    # Update document mutation
        useDeleteFolder.ts      # Delete folder mutation
        useDeleteDocument.ts    # Delete document mutation
        useMoveFolder.ts        # Move folder mutation
        useMoveDocument.ts      # Move document mutation
      components/
        AirunoteHome.tsx        # Home page component
        FolderTree.tsx           # Folder tree sidebar
        DocumentList.tsx         # Document list view
        DocumentEditor.tsx      # TXT/MD editor
        DocumentViewer.tsx      # RTF viewer
        PasteDock.tsx           # Paste staging modal
        CreateFolderModal.tsx   # Create folder modal
        CreateDocumentModal.tsx # Create document modal
      types/
        index.ts                # TypeScript interfaces
      page.tsx                  # Main app page (route handler)
      folder/
        [folderId]/
          page.tsx              # Folder view page
      document/
        [documentId]/
          page.tsx              # Document view page
      paste/
        page.tsx                # Paste dock page (or modal)
```

### D.3 Shared Platform Providers

**Consume:**
- `useOrgSession()` → Get `activeOrgId`, `orgs`, `activeOrg`
- `useAuthSession()` → Get `user` (for `userId`)
- `useMetadataIndex()` → NOT USED (Airunote has its own tree structure)
- `useHydratedContent()` → NOT USED (Airunote has its own document fetching)

**Integration:**
```typescript
// Example: AirunoteHome.tsx
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAirunoteTree } from '@/components/airunote/hooks/useAirunoteTree';

export function AirunoteHome() {
  const orgSession = useOrgSession();
  const authSession = useAuthSession();
  const orgId = orgSession.activeOrgId; // ✅ Single source of truth
  const userId = authSession.user?.id;
  
  const { data: tree, isLoading } = useAirunoteTree(orgId, userId);
  
  // ...
}
```

**Note:** Airunote is a **core feature**, not an installable app. Routes are:
- `/orgs/[orgId]/airunote` (NOT `/apps/airunote`)
- No install gate needed
- Direct access for all org members

**Constitution Compliance:**
- ✅ Use `orgSession.activeOrgId` (NOT `params.orgId`)
- ✅ Use `authSession.user?.id` for `userId`
- ✅ No direct API calls in pages (use hooks/services)

---

## E) UX FLOW SPECS (CONCRETE)

### E.1 Folder Navigation

**Flow:**
1. User clicks folder in tree sidebar
2. Navigate to `/orgs/[orgId]/apps/airunote/folder/[folderId]`
3. Fetch tree for that folder: `GET /internal/airunote/tree?parentFolderId=[folderId]`
4. Display child folders + documents
5. Update breadcrumb: `Home > Folder Name`

**Breadcrumb:**
- Clickable path: `Home > Parent > Current`
- Each segment links to folder view
- "Home" links to `/orgs/[orgId]/apps/airunote`

### E.2 Create Folder Flow

**Flow:**
1. User clicks "New Folder" button
2. Modal opens with:
   - Name input (required)
   - Parent folder selector (defaults to current folder)
3. User enters name, selects parent (optional)
4. User clicks "Create"
5. Optimistic update: Add folder to tree immediately
6. API call: `POST /internal/airunote/folder`
7. On success: Close modal, show success message
8. On error: Rollback optimistic update, show error message

**Validation:**
- Name required
- Name must be unique in parent folder (backend enforces)
- Show error if duplicate name

### E.3 Create Document Flow

**Flow:**
1. User clicks "New Document" button
2. Modal opens with:
   - Name input (required)
   - Type selector (TXT/MD/RTF, default TXT)
   - Folder selector (defaults to current folder)
   - Content textarea (optional, can be empty)
3. User enters name, selects type, optionally adds content
4. User clicks "Create"
5. Optimistic update: Add document to list immediately
6. API call: `POST /internal/airunote/document`
7. On success: Close modal, navigate to document view
8. On error: Rollback optimistic update, show error message

**Constitution Compliance:**
- Save-before-edit: Document created before opening editor
- Redirect to document view after creation

### E.4 Paste Dock Flow

**Flow:**
1. User clicks "Paste Dock" button (or keyboard shortcut)
2. Paste Dock modal/overlay opens
3. User pastes content (or types)
4. System detects type:
   - Plain text → TXT
   - Markdown syntax → MD
   - Rich text (HTML) → RTF
5. User can override type selection
6. User enters document name (required)
7. User selects folder (defaults to current folder or root)
8. User clicks "Save"
9. API call: `POST /internal/airunote/document`
10. On success: Close modal, navigate to document view
11. On error: Show error message, keep modal open

**Type Detection:**
- Simple heuristic: Check for markdown syntax (`#`, `*`, `[]`, etc.)
- Rich text: Detect HTML tags
- Default: TXT if ambiguous

### E.5 RTF Open Behavior

**Flow:**
1. User clicks RTF document in list
2. Navigate to `/orgs/[orgId]/apps/airunote/document/[documentId]`
3. Fetch document: `GET /internal/airunote/document/[documentId]`
4. Display read-only viewer (render RTF content)
5. Show "Edit" button (if user is owner)
6. User clicks "Edit"
7. Switch to editor mode (rich text editor)
8. User makes changes
9. User clicks "Save"
10. API call: `PUT /internal/airunote/document/[documentId]`
11. On success: Switch back to viewer mode
12. On error: Show error message, stay in editor mode

**Constitution Compliance:**
- Viewer-first: RTF documents open in read-only mode by default
- Edit requires explicit action

### E.6 Hard Delete Behaviors

**Folder Delete:**
1. User clicks delete button on folder
2. Confirmation modal: "Delete folder '[name]'? This will delete all contents permanently."
3. User confirms
4. Optimistic update: Remove folder from tree
5. API call: `DELETE /internal/airunote/folder/[folderId]?orgId=...&userId=...`
6. On success: Show success message, navigate to parent folder
7. On error: Rollback, show error message

**Document Delete:**
1. User clicks delete button on document
2. Confirmation modal: "Delete document '[name]'? This action cannot be undone."
3. User confirms
4. Optimistic update: Remove document from list
5. API call: `DELETE /internal/airunote/document/[documentId]?orgId=...&userId=...`
6. On success: Show success message, navigate to folder view
7. On error: Rollback, show error message

**Constitution Compliance:**
- Hard delete: No soft delete, no recovery
- Explicit confirmation required

### E.7 Loading/Empty/Error States

**Loading States:**
- Folder tree: Skeleton loader for tree items
- Document list: Skeleton loader for list items
- Document view: Skeleton loader for editor/viewer
- Create/update/delete: Loading spinner on button, disable form

**Empty States:**
- Empty folder: "This folder is empty. Create a folder or document to get started."
- No folders: "No folders yet. Create your first folder."
- No documents: "No documents yet. Create your first document."

**Error States:**
- Network error: "Connection failed. Please check your internet connection."
- Validation error: Inline error message below input
- Forbidden: "You don't have permission to access this resource."
- Not found: "This folder/document was not found or has been deleted."
- Generic error: "Something went wrong. Please try again."

---

## F) GAPS & MINIMAL BACKEND ADDITIONS

### F.1 App Installation Check

**Status:** ❌ NOT NEEDED  
**Reason:** Airunote is NOT an installable app. It's a core feature.  
**Action:** Remove install gate from frontend plan. Routes should be direct access: `/orgs/[orgId]/airunote`

### F.2 Filter Documents by State

**Gap:** No way to fetch trashed/archived documents.  
**Current State:** `state` column exists but no filter in routes.  
**Minimal Addition:**
- Add query param `state` to `GET /internal/airunote/folder/:folderId/documents?state=trashed`
- Or create: `GET /internal/airunote/documents?orgId=...&userId=...&state=trashed`

**File:** `backend-node/src/modules/airunote/airunote.internal.routes.ts`

### F.3 Public Routes (Future)

**Gap:** All routes are internal (no auth).  
**Current State:** Routes under `/internal/airunote`, production guard disabled in dev.  
**Future Addition:**
- Move routes to `/api/orgs/:orgId/airunote/...`
- Add auth middleware (`requireOrgMembership`)
- Add owner validation (ensure `userId` matches authenticated user)

**Files:**
- `backend-node/src/modules/airunote/airunote.routes.ts` (new public routes)
- `backend-node/src/modules/airunote/airunote.internal.routes.ts` (keep for testing)

---

## G) IMPLEMENTATION SEQUENCE (FRONTEND)

### Step 1: Foundation (Types + API Client)

**Files:**
- `frontend/apps/airunote/types/index.ts`
- `frontend/apps/airunote/services/airunoteApi.ts`

**Acceptance Criteria:**
- ✅ All TypeScript interfaces defined
- ✅ API client functions for all endpoints
- ✅ Error handling wrapper
- ✅ Type-safe request/response types

**Commit:** `feat(airunote): add types and API client`

### Step 2: React Query Hooks

**Files:**
- `frontend/apps/airunote/hooks/useAirunoteTree.ts`
- `frontend/apps/airunote/hooks/useAirunoteDocument.ts`
- `frontend/apps/airunote/hooks/useCreateFolder.ts`
- `frontend/apps/airunote/hooks/useCreateDocument.ts`
- `frontend/apps/airunote/hooks/useUpdateDocument.ts`
- `frontend/apps/airunote/hooks/useDeleteFolder.ts`
- `frontend/apps/airunote/hooks/useDeleteDocument.ts`

**Acceptance Criteria:**
- ✅ All hooks use React Query
- ✅ Optimistic updates implemented
- ✅ Error handling in hooks
- ✅ Cache invalidation on mutations

**Commit:** `feat(airunote): add React Query hooks`

### Step 3: Core Components (Tree + List)

**Files:**
- `frontend/apps/airunote/components/FolderTree.tsx`
- `frontend/apps/airunote/components/DocumentList.tsx`
- `frontend/apps/airunote/components/CreateFolderModal.tsx`
- `frontend/apps/airunote/components/CreateDocumentModal.tsx`

**Acceptance Criteria:**
- ✅ Folder tree renders nested folders
- ✅ Document list shows documents in folder
- ✅ Create folder modal works
- ✅ Create document modal works
- ✅ Loading/empty/error states handled

**Commit:** `feat(airunote): add folder tree and document list components`

### Step 4: Home Page

**Files:**
- `frontend/apps/airunote/page.tsx`
- `frontend/apps/airunote/components/AirunoteHome.tsx`

**Acceptance Criteria:**
- ✅ Home page displays root folder tree
- ✅ Home page displays root documents
- ✅ Breadcrumb navigation works
- ✅ Create folder/document buttons work
- ✅ Folder navigation works

**Commit:** `feat(airunote): add home page`

### Step 5: Folder View Page

**Files:**
- `frontend/apps/airunote/folder/[folderId]/page.tsx`

**Acceptance Criteria:**
- ✅ Folder view displays child folders
- ✅ Folder view displays documents in folder
- ✅ Breadcrumb shows folder path
- ✅ Create folder/document in current folder works
- ✅ Navigate to child folders works

**Commit:** `feat(airunote): add folder view page`

### Step 6: Document View Page

**Files:**
- `frontend/apps/airunote/document/[documentId]/page.tsx`
- `frontend/apps/airunote/components/DocumentEditor.tsx`
- `frontend/apps/airunote/components/DocumentViewer.tsx`

**Acceptance Criteria:**
- ✅ TXT/MD documents open in editor
- ✅ RTF documents open in viewer (read-only)
- ✅ Edit button for RTF works
- ✅ Save button updates document
- ✅ Rename document works
- ✅ Delete document works

**Commit:** `feat(airunote): add document view page`

### Step 7: Paste Dock

**Files:**
- `frontend/apps/airunote/components/PasteDock.tsx`
- `frontend/apps/airunote/paste/page.tsx` (or modal)

**Acceptance Criteria:**
- ✅ Paste Dock opens on button click
- ✅ Type detection works (TXT/MD/RTF)
- ✅ Manual type override works
- ✅ Save creates document and navigates to view
- ✅ Cancel closes modal

**Commit:** `feat(airunote): add paste dock`

### Step 8: Move Operations

**Files:**
- `frontend/apps/airunote/hooks/useMoveFolder.ts`
- `frontend/apps/airunote/hooks/useMoveDocument.ts`
- Update components to support move

**Acceptance Criteria:**
- ✅ Move folder works (drag-drop or menu)
- ✅ Move document works (drag-drop or menu)
- ✅ Cache invalidation on move
- ✅ Breadcrumb updates after move

**Commit:** `feat(airunote): add move folder and document`

### Step 9: ~~Install Gate~~ (SKIP - Not an installable app)

**Status:** ❌ SKIPPED  
**Reason:** Airunote is a core feature, not an installable app. No install gate needed.

### Step 10: Polish & Error Handling

**Files:**
- Update all components with proper error handling
- Add loading skeletons
- Add empty states
- Add confirmation modals for delete

**Acceptance Criteria:**
- ✅ All error states handled
- ✅ All loading states handled
- ✅ All empty states handled
- ✅ Delete confirmations work
- ✅ Success messages shown

**Commit:** `feat(airunote): add error handling and polish`

---

## H) MINIMUM SHIPPABLE UI v1 CHECKLIST

### Core Features
- [ ] ~~Install gate screen~~ (NOT NEEDED - Airunote is core feature, not installable app)
- [ ] Home page (root folder tree + documents)
- [ ] Folder view (child folders + documents)
- [ ] Document view (TXT/MD editor, RTF viewer)
- [ ] Create folder
- [ ] Create document
- [ ] Edit document (TXT/MD)
- [ ] View document (RTF)
- [ ] Delete folder (with confirmation)
- [ ] Delete document (with confirmation)
- [ ] Rename folder
- [ ] Rename document
- [ ] Move folder
- [ ] Move document
- [ ] Paste Dock (type detect → save → open)

### UX Requirements
- [ ] Breadcrumb navigation
- [ ] Folder tree sidebar
- [ ] Loading states (skeletons)
- [ ] Empty states (helpful messages)
- [ ] Error states (user-friendly messages)
- [ ] Success messages (toast notifications)
- [ ] Delete confirmations
- [ ] Optimistic updates (with rollback)

### Constitution Compliance
- [ ] Owner-only access (no sharing UI in v1)
- [ ] Org boundary enforced (use `orgSession.activeOrgId`)
- [ ] Privacy default (all folders/documents private)
- [ ] Save-before-edit (no draft state)
- [ ] RTF viewer-first (read-only by default)
- [ ] Hard delete (no recovery)

### Technical Requirements
- [ ] TypeScript strict mode
- [ ] React Query for server state
- [ ] React Context for UI state
- [ ] Error handling (network, validation, forbidden)
- [ ] Cache invalidation on mutations
- [ ] Optimistic updates with rollback
- [ ] Responsive design (mobile + desktop)

---

## I) FILE/FOLDER STRUCTURE PROPOSAL

```
frontend/
  app/
    (dashboard)/
      orgs/
        [orgId]/
          airunote/              # Core feature route (NOT /apps/airunote)
            page.tsx              # /orgs/[orgId]/airunote
            folder/
              [folderId]/
                page.tsx          # /orgs/[orgId]/airunote/folder/[folderId]
            document/
              [documentId]/
                page.tsx          # /orgs/[orgId]/airunote/document/[documentId]
            paste/
              page.tsx            # /orgs/[orgId]/airunote/paste (or modal)
  components/
    airunote/                     # Shared Airunote components
      services/
        airunoteApi.ts
        airunoteCache.ts
      hooks/
        useAirunoteTree.ts
        useAirunoteDocument.ts
        useCreateFolder.ts
        useCreateDocument.ts
        useUpdateDocument.ts
        useDeleteFolder.ts
        useDeleteDocument.ts
        useMoveFolder.ts
        useMoveDocument.ts
      components/
        AirunoteHome.tsx
        FolderTree.tsx
        DocumentList.tsx
        DocumentEditor.tsx
        DocumentViewer.tsx
        PasteDock.tsx
        CreateFolderModal.tsx
        CreateDocumentModal.tsx
      types/
        index.ts
```

---

## J) ENDPOINT CHECKLIST (COPY/PASTE READY)

```
✅ POST   /internal/airunote/provision
✅ POST   /internal/airunote/folder
✅ PUT    /internal/airunote/folder/:id
✅ DELETE /internal/airunote/folder/:id
✅ GET    /internal/airunote/tree
✅ POST   /internal/airunote/document
✅ GET    /internal/airunote/document/:id
✅ PUT    /internal/airunote/document/:id
✅ DELETE /internal/airunote/document/:id
✅ GET    /internal/airunote/folder/:folderId/documents
✅ POST   /internal/airunote/vault/delete
```

---

**END OF FRONTEND PLAN**
