# 🟨 PHASE 2: Sharing Engine (Access Expansion Only)
## Detailed Implementation Guide

**Status:** PENDING  
**Priority:** HIGH  
**Dependencies:** Phase 1

---

## OBJECTIVE

Implement sharing model where access expands but ownership never changes. Enable share-to-user, share-to-org, public sharing, and link sharing with password protection. Implement canonical/shared content split to prevent destructive edits.

**Milestone:** "Notion-Private-First Model"

---

## CONSTITUTION COMPLIANCE

- ✅ Sharing expands access, not ownership
- ✅ Sharing does not duplicate content
- ✅ If owner leaves → all shared access dies
- ✅ Links resolve to resource existence
- ✅ Admin does NOT automatically gain read access
- ✅ Owner controls canonical content
- ✅ Editors modify shared content only
- ✅ Delete privilege remains owner-only

---

## PART 1: SCHEMA CHANGES

### Migration: `0004_add_sharing_and_canonical_split.sql`

#### 1. Create `airu_shares` Table

```sql
CREATE TYPE "airu_share_type" AS ENUM('user', 'org', 'public', 'link');

CREATE TABLE IF NOT EXISTS "airu_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "target_type" "airu_shortcut_target_type" NOT NULL, -- 'folder' | 'document'
  "target_id" uuid NOT NULL,
  "share_type" "airu_share_type" NOT NULL,
  "granted_to_user_id" uuid, -- nullable (for org/public/link)
  "link_code" varchar(50), -- nullable (for link shares)
  "link_password_hash" varchar(255), -- nullable
  "view_only" boolean DEFAULT true NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp, -- nullable
  CONSTRAINT "airu_shares_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_granted_to_user_id_fk" FOREIGN KEY ("granted_to_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_unique" UNIQUE("org_id", "target_type", "target_id", "share_type", "granted_to_user_id", "link_code")
);

CREATE INDEX IF NOT EXISTS "airu_shares_target_idx" ON "airu_shares"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "airu_shares_user_idx" ON "airu_shares"("granted_to_user_id");
CREATE INDEX IF NOT EXISTS "airu_shares_link_code_idx" ON "airu_shares"("link_code");
```

#### 2. Add Canonical/Shared Columns to `airu_documents`

```sql
ALTER TABLE IF EXISTS "airu_documents"
  ADD COLUMN IF NOT EXISTS "canonical_content" text NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS "airu_documents"
  ADD COLUMN IF NOT EXISTS "shared_content" text;

-- Migrate existing content to canonical_content
UPDATE IF EXISTS "airu_documents"
SET "canonical_content" = "content"
WHERE "canonical_content" = '';

-- Make content column nullable (will be deprecated in favor of canonical_content)
ALTER TABLE IF EXISTS "airu_documents"
  ALTER COLUMN "content" DROP NOT NULL;
```

#### 3. Create `airu_document_revisions` Table

```sql
CREATE TYPE "airu_content_type" AS ENUM('canonical', 'shared');

CREATE TABLE IF NOT EXISTS "airu_document_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "content_type" "airu_content_type" NOT NULL,
  "content" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "airu_document_revisions_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "airu_documents"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_document_revisions_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "airu_document_revisions_document_idx" ON "airu_document_revisions"("document_id");
CREATE INDEX IF NOT EXISTS "airu_document_revisions_created_at_idx" ON "airu_document_revisions"("created_at");
```

---

## PART 2: REPOSITORY EXTENSIONS

### File: `backend-node/src/modules/airunote/airunote.repository.ts`

#### New Interfaces

```typescript
export interface AiruShare {
  id: string;
  orgId: string;
  targetType: 'folder' | 'document';
  targetId: string;
  shareType: 'user' | 'org' | 'public' | 'link';
  grantedToUserId: string | null;
  linkCode: string | null;
  linkPasswordHash: string | null;
  viewOnly: boolean;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface AccessResult {
  hasAccess: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  shareType?: 'user' | 'org' | 'public' | 'link';
  viewOnly?: boolean;
}

export interface AiruRevision {
  id: string;
  documentId: string;
  contentType: 'canonical' | 'shared';
  content: string;
  createdByUserId: string;
  createdAt: Date;
}
```

#### Sharing Operations

**1. `grantShare()`**
```typescript
async grantShare(
  share: {
    orgId: string;
    targetType: 'folder' | 'document';
    targetId: string;
    shareType: 'user' | 'org' | 'public' | 'link';
    grantedToUserId?: string;
    linkCode?: string;
    linkPasswordHash?: string;
    viewOnly: boolean;
    createdByUserId: string;
    expiresAt?: Date;
  },
  tx?: Transaction
): Promise<AiruShare>
```

**2. `revokeShare()`**
```typescript
async revokeShare(
  shareId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<void>
```

**3. `findSharesForTarget()`**
```typescript
async findSharesForTarget(
  targetType: 'folder' | 'document',
  targetId: string,
  orgId: string,
  tx?: Transaction
): Promise<AiruShare[]>
```

**4. `checkUserAccess()`**
```typescript
async checkUserAccess(
  targetType: 'folder' | 'document',
  targetId: string,
  userId: string,
  orgId: string,
  tx?: Transaction
): Promise<AccessResult>
```

**Access Resolution Logic:**
1. Check if user is owner → full access
2. Check explicit user share → return share permissions
3. Check org-wide share → return share permissions
4. Check public share → return share permissions
5. Check link share → validate link code (if provided)
6. Default → no access

#### Canonical/Shared Content Operations

**1. `updateCanonicalContent()`**
```typescript
async updateCanonicalContent(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  content: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**2. `updateSharedContent()`**
```typescript
async updateSharedContent(
  documentId: string,
  orgId: string,
  userId: string,
  content: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**3. `acceptSharedIntoCanonical()`**
```typescript
async acceptSharedIntoCanonical(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Copy `shared_content` → `canonical_content`
- Clear `shared_content`
- Create revision snapshot
- Return updated document

**4. `revertSharedToCanonical()`**
```typescript
async revertSharedToCanonical(
  documentId: string,
  orgId: string,
  ownerUserId: string,
  tx?: Transaction
): Promise<AiruDocument>
```

**Logic:**
- Clear `shared_content`
- Create revision snapshot
- Return updated document

**5. `createRevision()`**
```typescript
async createRevision(
  documentId: string,
  contentType: 'canonical' | 'shared',
  content: string,
  userId: string,
  tx?: Transaction
): Promise<AiruRevision>
```

---

## PART 3: PERMISSION RESOLVER IMPLEMENTATION

### File: `backend-node/src/modules/airunote/airunote.permissionResolver.ts`

```typescript
@injectable()
export class AirunotePermissionResolver implements PermissionResolver {
  constructor(
    @inject(AirunoteRepository)
    private readonly repository: AirunoteRepository
  ) {}

  async canRead(
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    orgId: string
  ): Promise<boolean> {
    const access = await this.repository.checkUserAccess(
      targetType,
      targetId,
      userId,
      orgId
    );
    return access.hasAccess && access.canRead;
  }

  async canWrite(
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    orgId: string
  ): Promise<boolean> {
    const access = await this.repository.checkUserAccess(
      targetType,
      targetId,
      userId,
      orgId
    );
    return access.hasAccess && access.canWrite && !access.viewOnly;
  }

  async canDelete(
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    orgId: string
  ): Promise<boolean> {
    // Constitution: Delete privilege remains owner-only
    // Even with edit share, delete is owner-only
    const access = await this.repository.checkUserAccess(
      targetType,
      targetId,
      userId,
      orgId
    );
    // Only owner can delete
    if (targetType === 'folder') {
      const folder = await this.repository.findFolderById(targetId);
      return folder?.ownerUserId === userId && folder?.orgId === orgId;
    } else {
      const document = await this.repository.findDocument(targetId, orgId, userId);
      return document?.ownerUserId === userId;
    }
  }
}
```

---

## PART 4: DOMAIN SERVICE EXTENSIONS

### File: `backend-node/src/modules/airunote/airunote.domainService.ts`

#### Sharing Operations

**1. `shareToUser()`**
```typescript
async shareToUser(
  orgId: string,
  ownerUserId: string,
  targetType: 'folder' | 'document',
  targetId: string,
  userId: string,
  viewOnly: boolean
): Promise<AiruShare>
```

**2. `shareToOrg()`**
```typescript
async shareToOrg(
  orgId: string,
  ownerUserId: string,
  targetType: 'folder' | 'document',
  targetId: string,
  viewOnly: boolean
): Promise<AiruShare>
```

**3. `sharePublic()`**
```typescript
async sharePublic(
  orgId: string,
  ownerUserId: string,
  targetType: 'folder' | 'document',
  targetId: string
): Promise<AiruShare>
```

**4. `shareViaLink()`**
```typescript
async shareViaLink(
  orgId: string,
  ownerUserId: string,
  targetType: 'folder' | 'document',
  targetId: string,
  password?: string
): Promise<AiruShare>
```

**Logic:**
- Generate unique link code (UUID-based, shortened)
- Hash password if provided (bcrypt)
- Create share with `share_type = 'link'`
- Return share with link code

**5. `revokeShare()`**
```typescript
async revokeShare(
  orgId: string,
  ownerUserId: string,
  shareId: string
): Promise<void>
```

#### Content Management

**1. `updateDocumentCanonical()`**
```typescript
async updateDocumentCanonical(
  orgId: string,
  ownerUserId: string,
  documentId: string,
  content: string
): Promise<AiruDocument>
```

**2. `updateDocumentShared()`**
```typescript
async updateDocumentShared(
  orgId: string,
  userId: string,
  documentId: string,
  content: string
): Promise<AiruDocument>
```

**Logic:**
- Verify user has write access (via PermissionResolver)
- Verify user is not owner (owners edit canonical)
- Update `shared_content` only
- Create revision snapshot
- Return updated document

**3. `acceptSharedChanges()`**
```typescript
async acceptSharedIntoCanonical(
  orgId: string,
  ownerUserId: string,
  documentId: string
): Promise<AiruDocument>
```

**4. `revertSharedChanges()`**
```typescript
async revertSharedToCanonical(
  orgId: string,
  ownerUserId: string,
  documentId: string
): Promise<AiruDocument>
```

---

## PART 5: LINK RESOLUTION

### New Method in Domain Service

```typescript
async resolveLink(
  linkCode: string,
  password?: string
): Promise<{
  targetType: 'folder' | 'document';
  targetId: string;
  orgId: string;
  viewOnly: boolean;
} | null>
```

**Logic:**
1. Find share by link code
2. If not found → return null (404)
3. If expired → return null (410)
4. If password required → validate hash
5. If password invalid → return null (403)
6. Return target info

---

## VALIDATION RULES

### Sharing Validation
- ✅ Cannot share org root
- ✅ Cannot share user root
- ✅ Owner must match `created_by_user_id`
- ✅ Link codes must be unique
- ✅ Expired shares are invalid

### Content Validation
- ✅ Only owner can edit canonical
- ✅ Only editors with write access can edit shared
- ✅ Only owner can accept/revert
- ✅ Delete remains owner-only

---

## COMMIT MESSAGE

```
feat(airunote): implement sharing engine and canonical/shared split

- Add airu_shares table for access expansion
- Add canonical_content and shared_content columns
- Add airu_document_revisions table
- Implement PermissionResolver with access resolution order
- Add share-to-user, share-to-org, public, and link sharing
- Implement canonical/shared content split
- Add accept/revert shared changes flow
- Enforce owner-only delete privilege
- No admin automatic access
- Links die when resource deleted
```

---

**END OF PHASE 2 DETAILED GUIDE**
