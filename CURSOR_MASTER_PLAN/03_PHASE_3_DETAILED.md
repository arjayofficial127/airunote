# 🟧 PHASE 3: Deletion & Lifecycle Finalization
## Detailed Implementation Guide

**Status:** PENDING  
**Priority:** HIGH  
**Dependencies:** Phase 2

---

## OBJECTIVE

Guarantee zero ambiguity in data lifecycle. Implement hard delete on user removal, collapse all shares, invalidate all links, and add explicit confirmation flows.

**Milestone:** "Security > Convenience"

---

## CONSTITUTION COMPLIANCE

- ✅ User vault becomes immediately inaccessible on removal
- ✅ All owned documents are deleted
- ✅ All shared links collapse
- ✅ All access references become invalid
- ✅ Re-adding user creates new vault (new user_id)
- ✅ Identity integrity: no data restoration

---

## PART 1: USER VAULT DELETION

### Schema: Audit Logs

**Migration: `0005_add_audit_logs.sql`**

```sql
CREATE TABLE IF NOT EXISTS "airu_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "event_type" varchar(50) NOT NULL, -- 'vault_deleted', 'document_deleted', 'share_revoked', 'link_revoked'
  "target_type" varchar(50), -- 'folder', 'document', 'vault', 'share', 'link'
  "target_id" uuid,
  "performed_by_user_id" uuid NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "airu_audit_logs_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_audit_logs_performed_by_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "airu_audit_logs_org_idx" ON "airu_audit_logs"("org_id");
CREATE INDEX IF NOT EXISTS "airu_audit_logs_event_type_idx" ON "airu_audit_logs"("event_type");
CREATE INDEX IF NOT EXISTS "airu_audit_logs_created_at_idx" ON "airu_audit_logs"("created_at");
```

### Domain Service Method

**File: `airunote.domainService.ts`**

```typescript
async deleteUserVault(
  orgId: string,
  userId: string,
  confirmedByUserId: string
): Promise<void>
```

**Logic:**
1. Verify `confirmedByUserId` is org admin or org owner
2. Begin transaction
3. Find user root folder
4. **Delete all folders** under user root (recursive, cascade)
5. **Delete all documents** under user root (cascade)
6. **Delete all shares** where user is owner:
   - Find all shares where `created_by_user_id = userId`
   - Delete shares
7. **Delete all links** where user is owner:
   - Find all link shares where `created_by_user_id = userId`
   - Delete shares
8. **Delete user root mapping:**
   - Delete from `airu_user_roots`
9. **Log deletion event:**
   - Create audit log entry
10. Commit transaction

**Constitution Compliance:**
- Hard delete (no soft delete)
- All shared links collapse
- All access references invalidated
- Re-adding user creates new vault (new user_id)

---

## PART 2: SHARE COLLAPSE ON DELETION

### Update Folder/Document Delete Methods

**In `airunote.domainService.ts`:**

```typescript
async deleteFolder(
  orgId: string,
  userId: string,
  folderId: string
): Promise<void> {
  return await db.transaction(async (tx) => {
    // 1. Verify ownership
    const folder = await this.repository.findFolderById(folderId, tx);
    if (!folder || folder.orgId !== orgId || folder.ownerUserId !== userId) {
      throw new ForbiddenError('Folder not found or access denied');
    }

    // 2. Find all descendant folders (for share cleanup)
    const descendants = await this.repository.findDescendantFolders(folderId, orgId, tx);

    // 3. Collect all target IDs (folder + descendants)
    const targetIds = [folderId, ...descendants.map(f => f.id)];

    // 4. Delete all shares for these folders
    for (const targetId of targetIds) {
      await this.repository.deleteSharesForTarget('folder', targetId, orgId, tx);
    }

    // 5. Delete folder (cascade deletes children)
    await this.repository.deleteFolder(folderId, orgId, userId, tx);

    // 6. Log deletion
    await this.repository.createAuditLog({
      orgId,
      eventType: 'folder_deleted',
      targetType: 'folder',
      targetId: folderId,
      performedByUserId: userId,
      metadata: { folderName: folder.humanId }
    }, tx);
  });
}

async deleteUserDocument(
  orgId: string,
  userId: string,
  documentId: string
): Promise<void> {
  return await db.transaction(async (tx) => {
    // 1. Verify ownership
    const document = await this.repository.findDocument(documentId, orgId, userId, tx);
    if (!document) {
      throw new ForbiddenError('Document not found or access denied');
    }

    // 2. Delete all shares for this document
    await this.repository.deleteSharesForTarget('document', documentId, orgId, tx);

    // 3. Delete document
    await this.repository.deleteDocument(documentId, orgId, userId, tx);

    // 4. Log deletion
    await this.repository.createAuditLog({
      orgId,
      eventType: 'document_deleted',
      targetType: 'document',
      targetId: documentId,
      performedByUserId: userId,
      metadata: { documentName: document.name }
    }, tx);
  });
}
```

### Repository Methods

**New Methods in `airunote.repository.ts`:**

```typescript
async findDescendantFolders(
  folderId: string,
  orgId: string,
  tx?: Transaction
): Promise<AiruFolder[]>

async deleteSharesForTarget(
  targetType: 'folder' | 'document',
  targetId: string,
  orgId: string,
  tx?: Transaction
): Promise<void>

async createAuditLog(
  log: {
    orgId: string;
    eventType: string;
    targetType?: string;
    targetId?: string;
    performedByUserId: string;
    metadata?: Record<string, unknown>;
  },
  tx?: Transaction
): Promise<AiruAuditLog>
```

---

## PART 3: LINK INVALIDATION

### Link Resolution Update

**In `airunote.domainService.ts`:**

```typescript
async resolveLink(
  linkCode: string,
  password?: string
): Promise<LinkResolution | null>
```

**Logic:**
1. Find share by link code
2. If not found → return null (404 - link dead)
3. If expired → return null (410 - expired)
4. If password required → validate hash
5. If password invalid → return null (403 - invalid password)
6. **Verify target exists:**
   - If target is folder → verify folder exists
   - If target is document → verify document exists
   - If target deleted → return null (404 - resource deleted)
7. Return target info

**Link Resolution Response:**
```typescript
interface LinkResolution {
  targetType: 'folder' | 'document';
  targetId: string;
  orgId: string;
  viewOnly: boolean;
  shareId: string;
}
```

---

## PART 4: EXPLICIT CONFIRMATION FLOWS

### UX Requirement (Constitution)

Before removal:
> "Removing this member permanently deletes their Airunote vault and all shared documents."

Must be explicit.

### API Endpoint

**New Route: `POST /internal/airunote/vault/delete`**

```typescript
Request: {
  orgId: string;
  userId: string; // user to remove
  confirmedByUserId: string; // admin/owner confirming
  confirmation: 'DELETE_VAULT_PERMANENTLY'; // explicit confirmation string
}

Response: {
  success: true;
  data: {
    deletedFolders: number;
    deletedDocuments: number;
    deletedShares: number;
    deletedLinks: number;
  };
}
```

**Validation:**
- `confirmation` must exactly match `'DELETE_VAULT_PERMANENTLY'`
- `confirmedByUserId` must be org admin or org owner
- Return error if confirmation string doesn't match

---

## PART 5: AUDIT LOGGING

### Repository Method

```typescript
async createAuditLog(
  log: {
    orgId: string;
    eventType: 'vault_deleted' | 'document_deleted' | 'folder_deleted' | 'share_revoked' | 'link_revoked';
    targetType?: 'folder' | 'document' | 'vault' | 'share' | 'link';
    targetId?: string;
    performedByUserId: string;
    metadata?: Record<string, unknown>;
  },
  tx?: Transaction
): Promise<AiruAuditLog>
```

### Event Types

- `vault_deleted` - User vault deletion
- `document_deleted` - Document deletion
- `folder_deleted` - Folder deletion
- `share_revoked` - Share revocation
- `link_revoked` - Link revocation

---

## VALIDATION RULES

### Vault Deletion
- ✅ Must be confirmed by org admin or org owner
- ✅ Explicit confirmation string required
- ✅ Hard delete (no soft delete)
- ✅ All shares collapse
- ✅ All links invalidate
- ✅ Audit log created

### Link Resolution
- ✅ Deleted resource → 404
- ✅ Expired link → 410
- ✅ Invalid password → 403
- ✅ Revoked link → 403

---

## COMMIT MESSAGE

```
feat(airunote): implement hard delete lifecycle and audit logging

- Add user vault deletion on org removal
- Collapse all shares on resource deletion
- Invalidate all links on resource deletion
- Add explicit confirmation flows
- Add audit logging for destructive events
- Enforce Constitution: removal = destruction
- No soft delete loopholes
- No orphaned data
```

---

**END OF PHASE 3 DETAILED GUIDE**
