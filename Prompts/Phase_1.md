MODE: CODE
MODE: EFFICIENT

PROJECT: Airunote
PHASE: 1 — Folder Tree + Owner-Only Document Lifecycle

OBJECTIVE:
Implement folder tree logic and owner-scoped document CRUD
without introducing sharing or permission resolver yet.

CONSTITUTION v1.0 MUST BE RESPECTED:
- Each folder/document has exactly one owner_user_id
- Org is boundary, not owner
- Admin does NOT auto-read private content
- Privacy default = private
- Org root is structural container only

DO NOT:
- Add sharing logic
- Add permission resolver logic
- Add UI
- Add admin bypass
- Add canonical/shared split yet

----------------------------------------------------
PART 1 — REPOSITORY EXTENSIONS
----------------------------------------------------

Extend airunote.repository.ts

ADD METHODS:

1) findChildFolders(orgId, parentFolderId, ownerUserId)
   - Return folders scoped by:
       org_id
       parent_folder_id
       owner_user_id
   - Enforce org boundary in WHERE clause

2) createFolder(orgId, ownerUserId, parentFolderId, humanId)
   - visibility default 'private'
   - must not allow creating folder outside owner vault
   - parent must belong to same org and owner

3) deleteFolder(folderId, ownerUserId)
   - hard delete
   - owner-only
   - rely on FK RESTRICT for parent integrity

4) createDocument(folderId, ownerUserId, name, content, type)
   - state default 'active'
   - visibility default 'private'
   - enforce folder ownership

5) findDocument(documentId, ownerUserId, orgId)
   - must enforce:
       folder.owner_user_id = ownerUserId
       folder.org_id = orgId

6) updateDocument(documentId, ownerUserId, content)
   - update content + updated_at

7) deleteDocument(documentId, ownerUserId)
   - hard delete

STRICT:
- All queries enforce org_id boundary
- No loose findById without org validation
- No any types
- Keep functions single-responsibility

----------------------------------------------------
PART 2 — DOMAIN SERVICE EXTENSIONS
----------------------------------------------------

Extend airunote.domainService.ts

ADD METHODS:

1) createFolderInUserVault(orgId, userId, parentFolderId, humanId)
   - ensureUserRootExists first
   - verify parent belongs to user
   - call repository.createFolder

2) listUserFolderTree(orgId, userId, parentFolderId)
   - ensure root exists
   - return folders + documents under parent
   - owner-only for now

3) createUserDocument(orgId, userId, folderId, name, content, type)
   - verify folder belongs to user
   - call repository.createDocument

4) updateUserDocument(orgId, userId, documentId, content)
   - owner-only
   - enforce org boundary

5) deleteUserDocument(orgId, userId, documentId)
   - owner-only
   - hard delete

STRICT:
- All operations wrapped in transaction
- Enforce org boundary validation before returning any data
- Throw explicit error on org mismatch
- No admin logic

----------------------------------------------------
PART 3 — INTERNAL TEST ROUTES (TEMPORARY)
----------------------------------------------------

Extend airunote.internal.routes.ts

ADD ROUTES:

POST /internal/airunote/folder
POST /internal/airunote/document
PUT  /internal/airunote/document/:id
DELETE /internal/airunote/document/:id
GET /internal/airunote/tree

Production guard MUST remain.

----------------------------------------------------
STRUCTURAL RULES
----------------------------------------------------

- Never return folder/document without verifying:
    folder.orgId === orgId
- No admin-based access
- No sharing yet
- No canonical/shared yet
- Privacy default must remain private

----------------------------------------------------
OUTPUT FORMAT
----------------------------------------------------

Print full updated files:
- airunote.repository.ts
- airunote.domainService.ts
- airunote.internal.routes.ts

Add Conventional Commit:

feat(airunote): implement owner-scoped folder tree and document lifecycle

- Add folder tree CRUD (owner-only)
- Add document CRUD (owner-only)
- Enforce org boundary validation
- Maintain privacy-first invariant
- No sharing logic introduced
