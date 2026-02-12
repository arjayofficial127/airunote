# 🟦 PHASE 1: Folder & Document Core
## Detailed Implementation Guide

**Status:** PENDING  
**Priority:** HIGH  
**Dependencies:** Phase 0 (COMPLETE)

---

## OBJECTIVE

Make Airunote usable for a single user vault inside org boundary. Enable complete folder tree and document lifecycle management with strict owner-only access and org boundary enforcement.

**Milestone:** "Private Vault Complete"

---

## CONSTITUTION COMPLIANCE

- ✅ Each folder/document has exactly one `owner_user_id`
- ✅ Org is boundary, not owner
- ✅ Admin does NOT auto-read private content
- ✅ Privacy default = private
- ✅ Org root is structural container only
- ✅ User root represents user's vault
- ✅ All personal documents live under user root
- ✅ User vaults are isolated from one another

---

## PART 1: REPOSITORY EXTENSIONS

### File: `backend-node/src/modules/airunote/airunote.repository.ts`

#### New Interfaces

```typescript
export interface AiruDocument {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  content: string;
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
```

#### Folder Operations

**1. `findChildFolders()`**
```typescript
async findChildFolders(
  orgId: string,
  parentFolderId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<AiruFolder[]>
```

**Logic:**
- Query: `WHERE org_id = ? AND parent_folder_id = ? AND owner_user_id = ?`
- Exclude org root and user root from results
- Return ordered by `created_at`

**2. `createFolder()`**
```typescript
async createFolder(
  orgId: string,
  ownerUserId: string,
  parentFolderId: string,
  humanId: string,
  tx?: Transaction
): Promise<AiruFolder>
```

**Logic:**
- Verify parent exists and belongs to same org and owner
- Verify parent is not org root (cannot create under org root directly)
- Verify humanId is not reserved (`__org_root__`, `__user_root__`)
- Check unique constraint: `(org_id, owner_user_id, parent_folder_id, human_id)`
- Insert with `visibility = 'private'` (Constitution: privacy default)
- Return created folder

**3. `updateFolderName()`**
```typescript
async updateFolderName(
  folderId: string,
  orgId: string,
  ownerUserId: string,
  newHumanId: string,
  tx?: Transaction
): Promise<AiruFolder>
```

**Logic:**
- Verify folder exists and belongs to org and owner
- Verify folder is not org root (cannot rename)
- Verify folder is not user root (cannot rename)
- Verify new humanId is not reserved
- Check unique constraint
- Update and return

**4. `moveFolder()`**
```typescript
async moveFolder(
  folderId: string,
  orgId: string,
  ownerUserId: string,
  newParentFolderId: string,
  tx?: Transaction
): Promise<AiruFolder>
```

**Logic:**
- Verify folder exists and belongs to org and owner
- Verify folder is not org root (cannot move)
- Verify folder is not user root (cannot move)
- Verify new parent exists and belongs to same org and owner
- Verify new parent is not org root
- **Cycle check:** Verify new parent is not a descendant of folder
- Check unique constraint with new parent
- Update `parent_folder_id`
- Return updated folder

**5. `deleteFolder()`**
```typescript
async deleteFolder(
  folderId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<void>
```

**Logic:**
- Verify folder exists and belongs to org and owner
- Verify folder is not org root (cannot delete)
- Verify folder is not user root (cannot delete)
- Hard delete (rely on FK RESTRICT for children - must delete children first)
- Return void

**6. `findFolderTree()`**
```typescript
async findFolderTree(
  orgId: string,
  ownerUserId: string,
  rootFolderId: string,
  maxDepth: number = 20,
  tx?: Transaction
): Promise<FolderTreeResponse>
```

**Logic:**
- Verify root folder belongs to org and owner
- Recursively fetch folders and documents
- Enforce max depth (prevent infinite recursion)
- Build tree structure
- Return tree response

**7. `validateParentChain()`**
```typescript
async validateParentChain(
  folderId: string,
  newParentId: string,
  orgId: string,
  tx?: Transaction
): Promise<boolean>
```

**Logic:**
- Start from `newParentId`
- Walk up parent chain
- If encounter `folderId` → return false (cycle detected)
- If reach org root → return true (valid)
- Max depth check (prevent infinite loops)

#### Document Operations

**1. `createDocument()`**
```typescript
async createDocument(
  folderId: string,
  orgId: string,
  ownerUserId: string,
  name: string,
  content: string,
  type: 'TXT' | 'MD' | 'RTF',
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Verify folder exists and belongs to org and owner
- Check unique constraint: `(folder_id, name)`
- Insert with:
  - `state = 'active'`
  - `visibility = 'private'` (Constitution: privacy default)
  - `content` (will become `canonical_content` in Phase 2)
- Return created document

**2. `findDocument()`**
```typescript
async findDocument(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<AiruDocument | null>
```

**Logic:**
- Query document with join to folder
- Verify: `folder.org_id = orgId AND folder.owner_user_id = ownerUserId`
- Return document or null

**3. `findDocumentsInFolder()`**
```typescript
async findDocumentsInFolder(
  folderId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<AiruDocument[]>
```

**Logic:**
- Verify folder exists and belongs to org and owner
- Query documents in folder
- Return ordered by `created_at`

**4. `updateDocumentContent()`**
```typescript
async updateDocumentContent(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  content: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Verify document exists and belongs to org and owner
- Update `content` and `updated_at`
- Return updated document

**5. `updateDocumentName()`**
```typescript
async updateDocumentName(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  newName: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Verify document exists and belongs to org and owner
- Check unique constraint: `(folder_id, name)`
- Update `name` and `updated_at`
- Return updated document

**6. `moveDocument()`**
```typescript
async moveDocument(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  newFolderId: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Verify document exists and belongs to org and owner
- Verify new folder exists and belongs to same org and owner
- Check unique constraint: `(new_folder_id, name)`
- Update `folder_id` and `updated_at`
- Return updated document

**7. `deleteDocument()`**
```typescript
async deleteDocument(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<void>
```

**Logic:**
- Verify document exists and belongs to org and owner
- Hard delete
- Return void

---

## PART 2: DOMAIN SERVICE EXTENSIONS

### File: `backend-node/src/modules/airunote/airunote.domainService.ts`

#### Folder Operations

**1. `createFolderInUserVault()`**
```typescript
async createFolderInUserVault(
  orgId: string,
  userId: string,
  parentFolderId: string,
  humanId: string
): Promise<AiruFolder>
```

**Logic:**
1. Begin transaction
2. Ensure user root exists (idempotent)
3. Verify parent folder belongs to user and org
4. Verify parent is not org root
5. Call repository.createFolder
6. Commit transaction
7. Return created folder

**2. `renameFolder()`**
```typescript
async renameFolder(
  orgId: string,
  userId: string,
  folderId: string,
  newHumanId: string
): Promise<AiruFolder>
```

**Logic:**
1. Begin transaction
2. Verify folder belongs to user and org
3. Verify folder is not root (org or user)
4. Call repository.updateFolderName
5. Commit transaction
6. Return updated folder

**3. `moveFolder()`**
```typescript
async moveFolder(
  orgId: string,
  userId: string,
  folderId: string,
  newParentFolderId: string
): Promise<AiruFolder>
```

**Logic:**
1. Begin transaction
2. Verify folder belongs to user and org
3. Verify folder is not root
4. Verify new parent belongs to same user and org
5. Verify new parent is not org root
6. **Cycle check:** Call repository.validateParentChain
7. If cycle detected → throw error
8. Call repository.moveFolder
9. Commit transaction
10. Return updated folder

**4. `deleteFolder()`**
```typescript
async deleteFolder(
  orgId: string,
  userId: string,
  folderId: string
): Promise<void>
```

**Logic:**
1. Begin transaction
2. Verify folder belongs to user and org
3. Verify folder is not root
4. **Check for children:** Query child folders and documents
5. If children exist → throw error (must delete children first)
6. Call repository.deleteFolder
7. Commit transaction

**5. `listUserFolderTree()`**
```typescript
async listUserFolderTree(
  orgId: string,
  userId: string,
  parentFolderId?: string
): Promise<FolderTreeResponse>
```

**Logic:**
1. Ensure user root exists
2. If parentFolderId not provided → use user root
3. Verify parent belongs to user and org
4. Call repository.findFolderTree
5. Return tree response

#### Document Operations

**1. `createUserDocument()`**
```typescript
async createUserDocument(
  orgId: string,
  userId: string,
  folderId: string,
  name: string,
  content: string,
  type: 'TXT' | 'MD' | 'RTF'
): Promise<AiruDocument>
```

**Logic:**
1. Begin transaction
2. Ensure user root exists
3. Verify folder belongs to user and org
4. Call repository.createDocument
5. Commit transaction
6. Return created document

**2. `getUserDocument()`**
```typescript
async getUserDocument(
  orgId: string,
  userId: string,
  documentId: string
): Promise<AiruDocument>
```

**Logic:**
1. Call repository.findDocument with org and owner
2. If not found → throw NotFoundError
3. Return document

**3. `listUserDocuments()`**
```typescript
async listUserDocuments(
  orgId: string,
  userId: string,
  folderId: string
): Promise<AiruDocument[]>
```

**Logic:**
1. Verify folder belongs to user and org
2. Call repository.findDocumentsInFolder
3. Return documents

**4. `updateUserDocument()`**
```typescript
async updateUserDocument(
  orgId: string,
  userId: string,
  documentId: string,
  content: string
): Promise<AiruDocument>
```

**Logic:**
1. Begin transaction
2. Verify document belongs to user and org
3. Call repository.updateDocumentContent
4. Commit transaction
5. Return updated document

**5. `renameUserDocument()`**
```typescript
async renameUserDocument(
  orgId: string,
  userId: string,
  documentId: string,
  newName: string
): Promise<AiruDocument>
```

**Logic:**
1. Begin transaction
2. Verify document belongs to user and org
3. Call repository.updateDocumentName
4. Commit transaction
5. Return updated document

**6. `moveUserDocument()`**
```typescript
async moveUserDocument(
  orgId: string,
  userId: string,
  documentId: string,
  newFolderId: string
): Promise<AiruDocument>
```

**Logic:**
1. Begin transaction
2. Verify document belongs to user and org
3. Verify new folder belongs to same user and org
4. Call repository.moveDocument
5. Commit transaction
6. Return updated document

**7. `deleteUserDocument()`**
```typescript
async deleteUserDocument(
  orgId: string,
  userId: string,
  documentId: string
): Promise<void>
```

**Logic:**
1. Begin transaction
2. Verify document belongs to user and org
3. Call repository.deleteDocument
4. Commit transaction

---

## PART 3: INTERNAL ROUTES

### File: `backend-node/src/modules/airunote/airunote.internal.routes.ts`

#### New Endpoints

**1. `POST /internal/airunote/folder`**
```typescript
Request: {
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
}

Response: {
  success: true;
  data: { folder: AiruFolder };
}
```

**2. `PUT /internal/airunote/folder/:id`**
```typescript
Request: {
  orgId: string;
  userId: string;
  humanId?: string; // rename
  parentFolderId?: string; // move
}

Response: {
  success: true;
  data: { folder: AiruFolder };
}
```

**3. `DELETE /internal/airunote/folder/:id`**
```typescript
Request: {
  orgId: string;
  userId: string;
}

Response: {
  success: true;
  data: {};
}
```

**4. `GET /internal/airunote/tree`**
```typescript
Query: {
  orgId: string;
  userId: string;
  parentFolderId?: string;
}

Response: {
  success: true;
  data: FolderTreeResponse;
}
```

**5. `POST /internal/airunote/document`**
```typescript
Request: {
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
}

Response: {
  success: true;
  data: { document: AiruDocument };
}
```

**6. `GET /internal/airunote/document/:id`**
```typescript
Query: {
  orgId: string;
  userId: string;
}

Response: {
  success: true;
  data: { document: AiruDocument };
}
```

**7. `PUT /internal/airunote/document/:id`**
```typescript
Request: {
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string; // move
}

Response: {
  success: true;
  data: { document: AiruDocument };
}
```

**8. `DELETE /internal/airunote/document/:id`**
```typescript
Query: {
  orgId: string;
  userId: string;
}

Response: {
  success: true;
  data: {};
}
```

**9. `GET /internal/airunote/folder/:folderId/documents`**
```typescript
Query: {
  orgId: string;
  userId: string;
}

Response: {
  success: true;
  data: { documents: AiruDocument[] };
}
```

---

## VALIDATION RULES

### Folder Validation
- ✅ `humanId` cannot be `__org_root__` or `__user_root__`
- ✅ `parentFolderId` must belong to same org and owner
- ✅ Cannot move folder into its descendant
- ✅ Cannot delete folder with children
- ✅ Cannot modify org root or user root

### Document Validation
- ✅ `name` must be unique within folder
- ✅ `type` must be valid enum value
- ✅ `folderId` must belong to same org and owner
- ✅ Owner-only operations enforced

### Org Boundary Validation
- ✅ All queries include `orgId` check
- ✅ All operations verify `ownerUserId` matches
- ✅ Cross-org operations rejected with explicit error

---

## ERROR HANDLING

### Error Types
- `NotFoundError` - Resource not found
- `ForbiddenError` - Owner mismatch or org mismatch
- `ConflictError` - Unique constraint violation
- `ValidationError` - Invalid input (reserved names, cycles, etc.)

### Error Messages
- Clear, actionable messages
- Include context (orgId, userId, resourceId)
- No sensitive data in errors

---

## TESTING REQUIREMENTS

### Unit Tests
- Repository methods with mocked DB
- Domain service methods with mocked repository
- Error cases (not found, forbidden, conflict)

### Integration Tests
- Full CRUD flows
- Cycle prevention
- Cross-org rejection
- Root protection

### Security Tests
- Org boundary violation attempts
- Owner mismatch attempts
- Admin bypass attempts (should fail)

---

## COMMIT MESSAGE

```
feat(airunote): implement owner-scoped folder tree and document lifecycle

- Add folder CRUD operations (owner-only)
- Add document CRUD operations (owner-only)
- Enforce org boundary validation in all queries
- Prevent circular folder moves
- Protect root folders from modification
- Maintain privacy-first invariant
- No sharing logic introduced
- No admin bypass possible
```

---

**END OF PHASE 1 DETAILED GUIDE**
