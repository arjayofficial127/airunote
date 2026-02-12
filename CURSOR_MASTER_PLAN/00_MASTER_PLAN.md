# 🎯 AIRUNOTE MASTER PLAN v1.0
## Complete Implementation Roadmap

**Last Updated:** 2024  
**Status:** Phase 0 Complete | Phase 1-7 Pending  
**Constitution:** v1.0 (Locked)

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Constitution Principles](#constitution-principles)
3. [Current State Assessment](#current-state-assessment)
4. [Phase Breakdown](#phase-breakdown)
5. [Technical Architecture](#technical-architecture)
6. [Implementation Checklists](#implementation-checklists)
7. [Dependencies & Risks](#dependencies--risks)
8. [Success Criteria](#success-criteria)
9. [Execution Order](#execution-order)

---

## 🎯 EXECUTIVE SUMMARY

### Project Vision
**Airunote** is a privacy-first collaborative knowledge workspace with strict vault isolation, following a Notion-style private-first model.

### Core Philosophy
- **One owner per document** - immutable ownership model
- **Org as boundary** - security perimeter, not content owner
- **Admin ≠ access** - no automatic read privileges
- **Sharing = access only** - never ownership transfer
- **Hard delete on removal** - security > convenience

### Current Maturity
- **Foundation Integrity:** 8.7/10 ✅
- **Permission System:** 2/10 🚧
- **Collaboration:** 0/10 ⏳
- **UX Lifecycle:** 1/10 ⏳
- **Data Durability:** 6/10 🚧
- **Overall:** ~4.5/10 (stable foundation)

### Phase Status
- ✅ **Phase 0:** COMPLETE - Root provisioning, schema, domain skeleton
- 🚧 **Phase 1:** PENDING - Folder & Document CRUD
- ⏳ **Phase 2:** PENDING - Sharing Engine
- ⏳ **Phase 3:** PENDING - Permission Engine
- ⏳ **Phase 4:** PENDING - Sharing Tables
- ⏳ **Phase 5:** PENDING - Canonical/Shared Split
- ⏳ **Phase 6:** PENDING - Membership Lifecycle
- ⏳ **Phase 7:** PENDING - History/Revision

---

## 📜 CONSTITUTION PRINCIPLES

### I. Fundamental Identity Model
1. Every document has exactly **one owner**
2. Ownership scope: `(org_id, owner_user_id)`
3. Ownership cannot be implicitly transferred
4. Sharing never changes ownership
5. All access decisions resolve against immutable `user_id`

### II. Org as Boundary (Not Owner)
1. Org is a **security perimeter**, not a content owner
2. Admins manage: membership, billing, governance
3. **Admins do NOT automatically gain read access to private files**
4. Org owner ≠ data owner
5. Multiple admins may exist; none inherit private vault access

### III. Vault Structure
```
[ORG ROOT] (structural only)
    └── [USER ROOT] (user's vault)
            └── user folders
                    └── documents
```

### IV. Privacy Default
1. All files are **private by default**
2. Visibility must be explicitly expanded
3. No implicit org visibility
4. No implicit admin override

### V. Sharing Model (Access-Only)
- Share to specific users
- Share to org-wide
- Share publicly
- Share via link (optional password)
- Share by view list / edit list

**Rules:**
- Sharing does not duplicate content
- Sharing does not change ownership
- If owner leaves → all shared access dies
- Links resolve to resource existence
- Recipients may manually copy content

### VI. Canonical / Shared Split
Each document maintains:
- `canonical_content` (owner-controlled)
- `shared_content` (collaborator-edited)

**Rules:**
- Owner controls canonical
- Editors modify shared
- Owner can accept shared → canonical
- Owner can revert shared to canonical
- Delete privilege remains owner-only
- Editors cannot hard-delete

### VII. Removal & Deletion Lifecycle
**When user leaves org:**
1. User vault becomes immediately inaccessible
2. All owned documents are deleted
3. All shared links collapse
4. All access references become invalid
5. Re-adding same person creates new vault (new user_id)

**Identity Integrity Rule:**
Re-adding user does not restore old data.

### XI. Invariants (Never Break)
1. One document = one owner
2. Sharing ≠ ownership
3. Org ≠ owner of personal vaults
4. Admin ≠ reader of private files
5. Removal = destruction of owned vault
6. Copy = explicit duplication
7. Links die with resource

---

## 📊 CURRENT STATE ASSESSMENT

### ✅ Phase 0: COMPLETE

#### Database Schema
- ✅ `airu_folders` table with constraints
- ✅ `airu_documents` table with constraints
- ✅ `airu_shortcuts` table
- ✅ `airu_user_roots` table
- ✅ All enums defined (visibility, document_type, document_state, shortcut_target_type)
- ✅ Foreign keys with correct ON DELETE behavior
- ✅ Partial unique index: one org root per org
- ✅ Check constraint: org root self-parent rule
- ✅ Unique constraint: user root per org/user

#### Domain Layer
- ✅ `AirunoteRepository` - Pure DB access
- ✅ `AirunoteDomainService` - Business logic
- ✅ `ensureOrgRootExists()` - Idempotent, transaction-aware, race-safe
- ✅ `ensureUserRootExists()` - Idempotent, org boundary enforced
- ✅ Root integrity detection (self-parent pattern)
- ✅ Org boundary enforcement in queries
- ✅ No admin bypass logic
- ✅ No nested transactions

#### Infrastructure
- ✅ Internal test route: `POST /internal/airunote/provision`
- ✅ Production guard on internal routes
- ✅ Migration files: 0000, 0001, 0002, 0003
- ✅ Constitution compliance comments throughout

#### Scaffolding
- ✅ `airunote.permissions.ts` - PermissionResolver interface (empty)
- ✅ TODO markers for Phase 2+ features

### ❌ What's NOT Built Yet

#### Folder CRUD
- ❌ Create folder endpoint
- ❌ Move folder logic
- ❌ Rename folder
- ❌ Delete folder (hard/soft)
- ❌ Depth guard
- ❌ Cycle prevention logic
- ❌ Breadcrumb resolver

#### Document CRUD
- ❌ Create document
- ❌ Read document
- ❌ Update document
- ❌ Delete document
- ❌ Archive/Trash flow
- ❌ Document tree listing

#### Permission Engine
- ❌ PermissionResolver implementation
- ❌ Access resolution logic
- ❌ Sharing checks

#### Sharing Tables
- ❌ `airu_shares` table
- ❌ Share to users
- ❌ Share to org
- ❌ Public link table
- ❌ Password link table
- ❌ View/edit list tables

#### Canonical/Shared Split
- ❌ `canonical_content` column
- ❌ `shared_content` column
- ❌ Revision table
- ❌ Accept/revert flow

#### Lifecycle Management
- ❌ User vault deletion on org removal
- ❌ Share collapse on deletion
- ❌ Link invalidation
- ❌ Soft delete vs hard delete enforcement

---

## 🗺️ PHASE BREAKDOWN

### 🟦 PHASE 1: Folder & Document Core (Single-Owner Engine)

**Goal:** Make Airunote usable for a single user vault inside org boundary.

**Status:** PENDING  
**Priority:** HIGH  
**Estimated Complexity:** Medium

#### Objectives
1. Enable folder tree CRUD (owner-only)
2. Enable document CRUD (owner-only)
3. Enforce org boundary everywhere
4. Prevent circular references
5. Integrate PermissionResolver stub

#### Technical Requirements

##### Repository Extensions (`airunote.repository.ts`)

**New Methods:**
```typescript
// Folder operations
findChildFolders(orgId: string, parentFolderId: string, ownerUserId: string, tx?: Transaction): Promise<AiruFolder[]>
createFolder(orgId: string, ownerUserId: string, parentFolderId: string, humanId: string, tx?: Transaction): Promise<AiruFolder>
updateFolderName(folderId: string, orgId: string, ownerUserId: string, newHumanId: string, tx?: Transaction): Promise<AiruFolder>
moveFolder(folderId: string, orgId: string, ownerUserId: string, newParentFolderId: string, tx?: Transaction): Promise<AiruFolder>
deleteFolder(folderId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<void>
findFolderTree(orgId: string, ownerUserId: string, rootFolderId: string, tx?: Transaction): Promise<AiruFolder[]>
validateParentChain(folderId: string, newParentId: string, orgId: string, tx?: Transaction): Promise<boolean>

// Document operations
createDocument(folderId: string, orgId: string, ownerUserId: string, name: string, content: string, type: 'TXT' | 'MD' | 'RTF', tx?: Transaction): Promise<AiruDocument>
findDocument(documentId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<AiruDocument | null>
findDocumentsInFolder(folderId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<AiruDocument[]>
updateDocumentContent(documentId: string, orgId: string, ownerUserId: string, content: string, tx?: Transaction): Promise<AiruDocument>
updateDocumentName(documentId: string, orgId: string, ownerUserId: string, newName: string, tx?: Transaction): Promise<AiruDocument>
moveDocument(documentId: string, orgId: string, ownerUserId: string, newFolderId: string, tx?: Transaction): Promise<AiruDocument>
deleteDocument(documentId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<void>
```

**Constraints:**
- All queries MUST include `orgId` validation
- All operations MUST verify `ownerUserId` matches
- No loose `findById` without org/owner context
- Prevent touching org root (`humanId = '__org_root__'`)
- Prevent touching user root (`humanId = '__user_root__'`)

##### Domain Service Extensions (`airunote.domainService.ts`)

**New Methods:**
```typescript
// Folder operations
createFolderInUserVault(orgId: string, userId: string, parentFolderId: string, humanId: string): Promise<AiruFolder>
renameFolder(orgId: string, userId: string, folderId: string, newHumanId: string): Promise<AiruFolder>
moveFolder(orgId: string, userId: string, folderId: string, newParentFolderId: string): Promise<AiruFolder>
deleteFolder(orgId: string, userId: string, folderId: string): Promise<void>
listUserFolderTree(orgId: string, userId: string, parentFolderId?: string): Promise<FolderTreeResponse>

// Document operations
createUserDocument(orgId: string, userId: string, folderId: string, name: string, content: string, type: 'TXT' | 'MD' | 'RTF'): Promise<AiruDocument>
getUserDocument(orgId: string, userId: string, documentId: string): Promise<AiruDocument>
listUserDocuments(orgId: string, userId: string, folderId: string): Promise<AiruDocument[]>
updateUserDocument(orgId: string, userId: string, documentId: string, content: string): Promise<AiruDocument>
renameUserDocument(orgId: string, userId: string, documentId: string, newName: string): Promise<AiruDocument>
moveUserDocument(orgId: string, userId: string, documentId: string, newFolderId: string): Promise<AiruDocument>
deleteUserDocument(orgId: string, userId: string, documentId: string): Promise<void>
```

**Business Rules:**
- All operations wrapped in transactions
- Verify parent belongs to user before create
- Prevent moving folder into its descendant (cycle check)
- Prevent cross-org moves
- Enforce depth limit (e.g., max 20 levels)
- Owner-only delete (hard delete)
- Org boundary validation before returning any data

##### Internal Routes (`airunote.internal.routes.ts`)

**New Endpoints:**
```
POST   /internal/airunote/folder
PUT    /internal/airunote/folder/:id
DELETE /internal/airunote/folder/:id
GET    /internal/airunote/tree
POST   /internal/airunote/document
GET    /internal/airunote/document/:id
PUT    /internal/airunote/document/:id
DELETE /internal/airunote/document/:id
GET    /internal/airunote/folder/:folderId/documents
```

**All routes:**
- Production guard (403 in production)
- Basic validation
- Service resolution via container
- Error handling via `next()`

#### Success Criteria
- ✅ User can create folders in their vault
- ✅ User can create documents in folders
- ✅ User can read/update/delete their own content
- ✅ No cross-org data leakage possible
- ✅ No admin bypass possible
- ✅ Circular moves prevented
- ✅ Root folders protected from modification
- ✅ All operations respect org boundary

#### Dependencies
- Phase 0 (COMPLETE)
- PermissionResolver stub (already scaffolded)

#### Risks
- Cycle detection performance on deep trees
- Transaction deadlocks on concurrent moves
- Race conditions on folder creation

---

### 🟨 PHASE 2: Sharing Engine (Access Expansion Only)

**Goal:** Access expands. Ownership never changes.

**Status:** PENDING  
**Priority:** HIGH  
**Estimated Complexity:** High  
**Dependencies:** Phase 1

#### Objectives
1. Implement sharing tables
2. Implement PermissionResolver
3. Add canonical/shared content split
4. Enable share-to-user, share-to-org, public, link sharing
5. Implement accept/revert flow

#### Technical Requirements

##### Schema Changes

**New Table: `airu_shares`**
```sql
CREATE TABLE "airu_shares" (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  target_type enum('folder', 'document') NOT NULL,
  target_id uuid NOT NULL,
  share_type enum('user', 'org', 'public', 'link') NOT NULL,
  granted_to_user_id uuid, -- nullable (for org/public/link)
  link_code varchar(50), -- nullable (for link shares)
  link_password_hash varchar(255), -- nullable
  view_only boolean DEFAULT true,
  created_by_user_id uuid NOT NULL,
  created_at timestamp NOT NULL,
  expires_at timestamp, -- nullable
  UNIQUE(org_id, target_type, target_id, share_type, granted_to_user_id, link_code)
);
```

**Schema Updates: `airu_documents`**
```sql
ALTER TABLE "airu_documents"
ADD COLUMN canonical_content text NOT NULL DEFAULT '',
ADD COLUMN shared_content text; -- nullable

-- Migrate existing content to canonical_content
UPDATE "airu_documents"
SET canonical_content = content;
```

**New Table: `airu_document_revisions`**
```sql
CREATE TABLE "airu_document_revisions" (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL,
  content_type enum('canonical', 'shared') NOT NULL,
  content text NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamp NOT NULL,
  FOREIGN KEY (document_id) REFERENCES airu_documents(id) ON DELETE CASCADE
);
```

##### Repository Extensions

**New Methods:**
```typescript
// Sharing operations
grantShare(share: ShareInput, tx?: Transaction): Promise<AiruShare>
revokeShare(shareId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<void>
findSharesForTarget(targetType: 'folder' | 'document', targetId: string, orgId: string, tx?: Transaction): Promise<AiruShare[]>
checkUserAccess(targetType: 'folder' | 'document', targetId: string, userId: string, orgId: string, tx?: Transaction): Promise<AccessResult>

// Canonical/Shared content
updateCanonicalContent(documentId: string, orgId: string, ownerUserId: string, content: string, tx?: Transaction): Promise<AiruDocument>
updateSharedContent(documentId: string, orgId: string, userId: string, content: string, tx?: Transaction): Promise<AiruDocument>
acceptSharedIntoCanonical(documentId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<AiruDocument>
revertSharedToCanonical(documentId: string, orgId: string, ownerUserId: string, tx?: Transaction): Promise<AiruDocument>
createRevision(documentId: string, contentType: 'canonical' | 'shared', content: string, userId: string, tx?: Transaction): Promise<AiruRevision>
```

##### PermissionResolver Implementation

**File: `airunote.permissionResolver.ts`**

```typescript
export class AirunotePermissionResolver implements PermissionResolver {
  async canRead(folderId: string, userId: string, orgId: string): Promise<boolean>
  async canWrite(folderId: string, userId: string, orgId: string): Promise<boolean>
  async canDelete(folderId: string, userId: string, orgId: string): Promise<boolean>
}
```

**Access Resolution Order:**
1. Owner → always allowed
2. Explicit user share → check `airu_shares`
3. Org-wide share → check `airu_shares` where `share_type = 'org'`
4. Public share → check `airu_shares` where `share_type = 'public'`
5. Link share → validate `link_code` and optional password

**Rules:**
- Admin does NOT automatically get access
- Org owner ≠ file owner
- Delete = owner only (even with edit share)
- View-only shares cannot modify content

##### Domain Service Extensions

**New Methods:**
```typescript
// Sharing
shareToUser(orgId: string, ownerUserId: string, targetType: 'folder' | 'document', targetId: string, userId: string, viewOnly: boolean): Promise<AiruShare>
shareToOrg(orgId: string, ownerUserId: string, targetType: 'folder' | 'document', targetId: string, viewOnly: boolean): Promise<AiruShare>
sharePublic(orgId: string, ownerUserId: string, targetType: 'folder' | 'document', targetId: string): Promise<AiruShare>
shareViaLink(orgId: string, ownerUserId: string, targetType: 'folder' | 'document', targetId: string, password?: string): Promise<AiruShare>
revokeShare(orgId: string, ownerUserId: string, shareId: string): Promise<void>

// Content management
updateDocumentCanonical(orgId: string, ownerUserId: string, documentId: string, content: string): Promise<AiruDocument>
updateDocumentShared(orgId: string, userId: string, documentId: string, content: string): Promise<AiruDocument>
acceptSharedChanges(orgId: string, ownerUserId: string, documentId: string): Promise<AiruDocument>
revertSharedChanges(orgId: string, ownerUserId: string, documentId: string): Promise<AiruDocument>
```

#### Success Criteria
- ✅ Owner can share to users
- ✅ Owner can share to org
- ✅ Owner can create public links
- ✅ Owner can create password-protected links
- ✅ Editors can modify shared_content only
- ✅ Owner can accept/revert shared changes
- ✅ Admin cannot access private files
- ✅ Links die when resource deleted
- ✅ Sharing does not change ownership

#### Dependencies
- Phase 1 (Folder & Document CRUD)

#### Risks
- Performance on permission checks (need indexes)
- Link code collision (use UUID-based codes)
- Password hash storage security

---

### 🟧 PHASE 3: Deletion & Lifecycle Finalization

**Goal:** Zero ambiguity in data lifecycle.

**Status:** PENDING  
**Priority:** HIGH  
**Estimated Complexity:** Medium  
**Dependencies:** Phase 2

#### Objectives
1. Implement user vault deletion on org removal
2. Collapse all shares on deletion
3. Invalidate all links on deletion
4. Add explicit confirmation flows
5. Add audit logging for destructive events

#### Technical Requirements

##### User Vault Deletion

**New Method in Domain Service:**
```typescript
deleteUserVault(orgId: string, userId: string, confirmedByUserId: string): Promise<void>
```

**Logic:**
1. Verify `confirmedByUserId` is org admin or org owner
2. Begin transaction
3. Find user root folder
4. Delete all folders under user root (cascade)
5. Delete all documents (cascade)
6. Delete all shares where user is owner
7. Delete all links where user is owner
8. Delete `airu_user_roots` mapping
9. Log deletion event
10. Commit transaction

**Constitution Compliance:**
- Hard delete (no soft delete)
- All shared links collapse
- All access references invalidated
- Re-adding user creates new vault (new user_id)

##### Share Collapse Logic

**On Document/Folder Deletion:**
```typescript
async deleteFolder(orgId: string, userId: string, folderId: string): Promise<void> {
  // 1. Delete folder (cascade deletes children)
  // 2. Delete all shares for this folder and descendants
  // 3. Delete all links for this folder and descendants
  // 4. Log deletion
}
```

##### Link Invalidation

**Link Resolution:**
```typescript
resolveLink(linkCode: string, password?: string): Promise<LinkResolution>
```

**Rules:**
- If resource deleted → return 404
- If password required → validate hash
- If expired → return 410
- If revoked → return 403

##### Audit Logging

**New Table: `airu_audit_logs`**
```sql
CREATE TABLE "airu_audit_logs" (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  event_type varchar(50) NOT NULL, -- 'vault_deleted', 'document_deleted', 'share_revoked'
  target_type varchar(50), -- 'folder', 'document', 'vault'
  target_id uuid,
  performed_by_user_id uuid NOT NULL,
  metadata jsonb,
  created_at timestamp NOT NULL
);
```

#### Success Criteria
- ✅ User removal triggers vault deletion
- ✅ All shares collapse on deletion
- ✅ All links return 404 after deletion
- ✅ Explicit confirmation required
- ✅ Audit trail for destructive events
- ✅ No orphaned data
- ✅ No cross-org leakage

#### Dependencies
- Phase 2 (Sharing Engine)

#### Risks
- Performance on large vault deletion
- Transaction timeout on deep folder trees
- Audit log table growth

---

### 🟩 PHASE 4: Org-Scoped Collaborative Resources (Optional V2)

**Goal:** Org-owned resources separate from personal vaults.

**Status:** OPTIONAL  
**Priority:** LOW  
**Estimated Complexity:** High  
**Dependencies:** Phase 3

#### Objectives
1. Create org-scoped folder/document tables
2. Implement multi-admin editor model
3. Separate creator from owner
4. Admin governance rules

#### Technical Requirements

**New Tables:**
- `airu_org_folders` (org-owned)
- `airu_org_documents` (org-owned)
- `airu_org_editors` (multi-admin list)

**Key Differences from Personal Vaults:**
- `owner_org_id` instead of `owner_user_id`
- `created_by_user_id` separate from owner
- Admin can remove creator rights
- Survives user departure
- Different permission model

#### Success Criteria
- ✅ Org-owned resources separate from personal vaults
- ✅ Multi-admin editing works
- ✅ Creator removal possible
- ✅ Resources survive user departure

#### Dependencies
- Phase 3 (Lifecycle Finalization)

#### Risks
- Mixing org-owned with personal vaults
- Permission model complexity
- Migration complexity if added later

---

### 🟪 PHASE 5: History / Revision Engine (Optional Elite Layer)

**Goal:** Immutable version history and restore capability.

**Status:** OPTIONAL  
**Priority:** LOW  
**Estimated Complexity:** Medium  
**Dependencies:** Phase 2

#### Objectives
1. Create revision snapshots
2. Enable version restore
3. Track activity
4. Revert shared changes

#### Technical Requirements

**Revision Table (already planned in Phase 2):**
- `airu_document_revisions`
- Immutable snapshots
- Link to document
- Track canonical vs shared

**New Methods:**
```typescript
createRevision(documentId: string, contentType: 'canonical' | 'shared', userId: string): Promise<AiruRevision>
listRevisions(documentId: string, orgId: string, userId: string): Promise<AiruRevision[]>
restoreRevision(documentId: string, revisionId: string, orgId: string, ownerUserId: string): Promise<AiruDocument>
```

#### Success Criteria
- ✅ Revision history accessible
- ✅ Owner can restore previous versions
- ✅ Activity tracking works
- ✅ Shared change revert works

#### Dependencies
- Phase 2 (Canonical/Shared Split)

---

## 🏗️ TECHNICAL ARCHITECTURE

### Current Architecture

```
┌─────────────────────────────────────────┐
│         API Layer (Express)             │
│  /internal/airunote/* (dev only)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Domain Service Layer               │
│  AirunoteDomainService                  │
│  - ensureOrgRootExists()                │
│  - ensureUserRootExists()               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository Layer                   │
│  AirunoteRepository                     │
│  - Pure DB access                       │
│  - Transaction support                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Database (PostgreSQL)              │
│  - airu_folders                         │
│  - airu_documents                       │
│  - airu_user_roots                      │
│  - airu_shortcuts                       │
└─────────────────────────────────────────┘
```

### Target Architecture (Phase 2+)

```
┌─────────────────────────────────────────┐
│         API Layer                       │
│  - Public routes (Phase 1+)            │
│  - Internal routes (dev only)          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Permission Layer                   │
│  PermissionResolver (Phase 2)          │
│  - canRead()                            │
│  - canWrite()                            │
│  - canDelete()                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Domain Service Layer               │
│  AirunoteDomainService                  │
│  - Folder CRUD (Phase 1)                │
│  - Document CRUD (Phase 1)              │
│  - Sharing (Phase 2)                    │
│  - Lifecycle (Phase 3)                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository Layer                   │
│  AirunoteRepository                     │
│  - Extended CRUD methods                │
│  - Share operations                     │
│  - Permission checks                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Database (PostgreSQL)              │
│  - airu_folders                         │
│  - airu_documents                       │
│  - airu_user_roots                      │
│  - airu_shares (Phase 2)                │
│  - airu_document_revisions (Phase 2)   │
│  - airu_audit_logs (Phase 3)           │
└─────────────────────────────────────────┘
```

### Design Patterns

1. **Repository Pattern** - Pure DB access, no business logic
2. **Domain Service Pattern** - Business logic, transaction orchestration
3. **Permission Resolver Pattern** - Centralized access control
4. **Transaction Discipline** - No nested transactions, explicit boundaries
5. **Idempotency** - All provisioning operations idempotent
6. **Race Condition Safety** - Unique constraint violation handling

### Key Constraints

- **No Admin Bypass** - Admin status never grants automatic access
- **Org Boundary** - All queries must include org_id validation
- **Owner Isolation** - All queries must verify owner_user_id
- **Hard Delete** - User removal = permanent deletion
- **Self-Parent Pattern** - Org root must have parent_folder_id = id

---

## ✅ IMPLEMENTATION CHECKLISTS

### Phase 1 Checklist

#### Repository Extensions
- [ ] Add `findChildFolders()` with org/owner validation
- [ ] Add `createFolder()` with parent validation
- [ ] Add `updateFolderName()` with root protection
- [ ] Add `moveFolder()` with cycle prevention
- [ ] Add `deleteFolder()` with owner-only check
- [ ] Add `findFolderTree()` for tree resolution
- [ ] Add `validateParentChain()` for cycle detection
- [ ] Add `createDocument()` with folder ownership check
- [ ] Add `findDocument()` with org/owner validation
- [ ] Add `findDocumentsInFolder()` with org/owner validation
- [ ] Add `updateDocumentContent()` owner-only
- [ ] Add `updateDocumentName()` owner-only
- [ ] Add `moveDocument()` with folder validation
- [ ] Add `deleteDocument()` owner-only

#### Domain Service Extensions
- [ ] Add `createFolderInUserVault()` with user root check
- [ ] Add `renameFolder()` with root protection
- [ ] Add `moveFolder()` with cycle prevention
- [ ] Add `deleteFolder()` with cascade handling
- [ ] Add `listUserFolderTree()` with org boundary
- [ ] Add `createUserDocument()` with folder validation
- [ ] Add `getUserDocument()` with org/owner check
- [ ] Add `listUserDocuments()` with org/owner check
- [ ] Add `updateUserDocument()` owner-only
- [ ] Add `renameUserDocument()` owner-only
- [ ] Add `moveUserDocument()` with validation
- [ ] Add `deleteUserDocument()` owner-only

#### Internal Routes
- [ ] Add `POST /internal/airunote/folder`
- [ ] Add `PUT /internal/airunote/folder/:id`
- [ ] Add `DELETE /internal/airunote/folder/:id`
- [ ] Add `GET /internal/airunote/tree`
- [ ] Add `POST /internal/airunote/document`
- [ ] Add `GET /internal/airunote/document/:id`
- [ ] Add `PUT /internal/airunote/document/:id`
- [ ] Add `DELETE /internal/airunote/document/:id`
- [ ] Add `GET /internal/airunote/folder/:folderId/documents`

#### Testing
- [ ] Test folder creation in user vault
- [ ] Test folder move cycle prevention
- [ ] Test cross-org move rejection
- [ ] Test root folder protection
- [ ] Test document CRUD operations
- [ ] Test org boundary enforcement
- [ ] Test owner-only delete

### Phase 2 Checklist

#### Schema Changes
- [ ] Create `airu_shares` table migration
- [ ] Add `canonical_content` column to `airu_documents`
- [ ] Add `shared_content` column to `airu_documents`
- [ ] Create `airu_document_revisions` table
- [ ] Migrate existing content to `canonical_content`

#### PermissionResolver Implementation
- [ ] Implement `canRead()` with access resolution order
- [ ] Implement `canWrite()` with share type checks
- [ ] Implement `canDelete()` owner-only enforcement
- [ ] Add caching for permission checks (optional)

#### Repository Extensions
- [ ] Add `grantShare()` method
- [ ] Add `revokeShare()` method
- [ ] Add `findSharesForTarget()` method
- [ ] Add `checkUserAccess()` method
- [ ] Add `updateCanonicalContent()` method
- [ ] Add `updateSharedContent()` method
- [ ] Add `acceptSharedIntoCanonical()` method
- [ ] Add `revertSharedToCanonical()` method
- [ ] Add `createRevision()` method

#### Domain Service Extensions
- [ ] Add `shareToUser()` method
- [ ] Add `shareToOrg()` method
- [ ] Add `sharePublic()` method
- [ ] Add `shareViaLink()` method
- [ ] Add `revokeShare()` method
- [ ] Add `updateDocumentCanonical()` method
- [ ] Add `updateDocumentShared()` method
- [ ] Add `acceptSharedChanges()` method
- [ ] Add `revertSharedChanges()` method

#### Testing
- [ ] Test share to user
- [ ] Test share to org
- [ ] Test public sharing
- [ ] Test link sharing with password
- [ ] Test admin non-access
- [ ] Test canonical/shared split
- [ ] Test accept/revert flow
- [ ] Test link invalidation on delete

### Phase 3 Checklist

#### Vault Deletion
- [ ] Implement `deleteUserVault()` method
- [ ] Add cascade deletion logic
- [ ] Add share collapse logic
- [ ] Add link invalidation logic
- [ ] Add confirmation requirement

#### Audit Logging
- [ ] Create `airu_audit_logs` table
- [ ] Add logging for vault deletion
- [ ] Add logging for document deletion
- [ ] Add logging for share revocation

#### Testing
- [ ] Test vault deletion cascade
- [ ] Test share collapse
- [ ] Test link invalidation
- [ ] Test audit log creation

---

## ⚠️ DEPENDENCIES & RISKS

### Critical Dependencies

1. **Phase 1 → Phase 2**
   - Sharing requires folder/document CRUD
   - PermissionResolver needs existing resources

2. **Phase 2 → Phase 3**
   - Lifecycle management requires sharing tables
   - Link invalidation requires share system

3. **Phase 0 → All Phases**
   - Root provisioning must be stable
   - Schema must be hardened

### Technical Risks

1. **Performance Risks**
   - Deep folder tree queries (mitigation: depth limit, indexes)
   - Permission check overhead (mitigation: caching, indexes)
   - Large vault deletion (mitigation: batch processing)

2. **Concurrency Risks**
   - Race conditions on folder moves (mitigation: transactions, locks)
   - Concurrent share grants (mitigation: unique constraints)
   - Link code collision (mitigation: UUID-based codes)

3. **Security Risks**
   - Cross-org data leakage (mitigation: strict org_id validation)
   - Admin privilege escalation (mitigation: no admin bypass logic)
   - Link password storage (mitigation: bcrypt hashing)

4. **Data Integrity Risks**
   - Orphaned folders (mitigation: FK constraints)
   - Circular references (mitigation: cycle detection)
   - Invalid shares (mitigation: cascade deletion)

### Migration Risks

1. **Schema Migration**
   - Adding canonical/shared columns (safe: nullable, default)
   - Creating share tables (safe: new tables)
   - Adding audit logs (safe: new table)

2. **Data Migration**
   - Migrating content to canonical_content (safe: copy operation)
   - No data loss expected

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Success
- ✅ Single user can manage their vault independently
- ✅ No cross-org data access possible
- ✅ No admin bypass possible
- ✅ Folder tree operations work correctly
- ✅ Document CRUD operations work correctly
- ✅ Root folders protected
- ✅ Cycle prevention works

### Phase 2 Success
- ✅ Sharing works for all modes (user, org, public, link)
- ✅ PermissionResolver correctly enforces access
- ✅ Canonical/shared split prevents destructive edits
- ✅ Owner can accept/revert shared changes
- ✅ Admin cannot access private files
- ✅ Links die when resource deleted

### Phase 3 Success
- ✅ User vault deletion works correctly
- ✅ All shares collapse on deletion
- ✅ All links invalidate on deletion
- ✅ Audit trail exists for destructive events
- ✅ No orphaned data remains

### Overall Success
- ✅ Constitution v1.0 invariants never broken
- ✅ Privacy-first model enforced
- ✅ Org boundary never violated
- ✅ Admin never gains automatic access
- ✅ Ownership model immutable
- ✅ Hard delete lifecycle respected

---

## 🚀 EXECUTION ORDER

### Recommended Sequence

```
1. Phase 1 (Folder & Document CRUD)
   ↓
2. Phase 2 (Sharing Engine)
   ↓
3. Phase 3 (Lifecycle Finalization)
   ↓
4. Phase 5 (History/Revision) [Optional]
   ↓
5. Phase 4 (Org-Scoped Resources) [Optional V2]
```

### Why This Order?

1. **Phase 1 First** - Foundation must be solid before sharing
2. **Phase 2 Second** - Sharing requires stable CRUD
3. **Phase 3 Third** - Lifecycle needs sharing tables
4. **Phase 5 Optional** - Enhancement, not critical path
5. **Phase 4 Optional** - Different domain, can be parallel

### Critical Path

```
Phase 0 (✅ COMPLETE)
    ↓
Phase 1 (Folder & Document CRUD)
    ↓
Phase 2 (Sharing Engine)
    ↓
Phase 3 (Lifecycle Finalization)
    ↓
MVP Complete
```

### Parallel Opportunities

- Phase 5 (History) can be built alongside Phase 2
- Phase 4 (Org-Scoped) is completely separate domain

---

## 📝 NOTES

### Constitution Compliance
- All phases must respect Constitution v1.0
- No phase should introduce admin bypass
- No phase should violate ownership model
- All phases must enforce org boundary

### Code Quality Standards
- Strict TypeScript (no `any`)
- No unsafe casts
- Transaction discipline
- Race condition handling
- Idempotent operations
- Comprehensive error handling

### Testing Strategy
- Unit tests for repository methods
- Integration tests for domain services
- E2E tests for critical flows
- Security tests for boundary violations
- Performance tests for deep trees

### Documentation Requirements
- Code comments for Constitution compliance
- TODO markers for future phases
- API documentation for public routes
- Migration documentation

---

## 🔄 MAINTENANCE

### Regular Reviews
- Constitution compliance audit (quarterly)
- Performance review (monthly)
- Security audit (quarterly)
- Schema optimization (as needed)

### Future Considerations
- Soft delete option (if needed)
- Org-scoped resources (Phase 4)
- Revision history (Phase 5)
- Advanced sharing features
- Export/import functionality

---

**END OF MASTER PLAN**
