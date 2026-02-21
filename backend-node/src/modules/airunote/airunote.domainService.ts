/**
 * Airunote Domain Service
 * Business logic for Airunote root provisioning
 * 
 * CONSTITUTION v1.0 COMPLIANCE:
 * - Ownership: Every folder has exactly one owner_user_id
 * - Org Boundary: All operations scoped to org_id
 * - Admin Non-Access: No admin shortcut logic
 * - Root Integrity: Self-parent pattern enforced
 * - Privacy Default: All user vaults start private
 */
import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  airuDocumentsTable,
  airuFoldersTable,
  airuUserRootsTable,
  airuSharesTable,
} from '../../infrastructure/db/drizzle/schema';
import {
  AirunoteRepository,
  type AiruFolder,
  type AiruDocument,
  type FolderTreeResponse,
  type AiruShare,
} from './airunote.repository';

// Transaction type - drizzle transactions have the same interface as db
type Transaction = typeof db;

/**
 * Type guard for Postgres unique constraint violation errors
 */
function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code === '23505'
  );
}

@injectable()
export class AirunoteDomainService {
  constructor(
    @inject(AirunoteRepository)
    private readonly repository: AirunoteRepository
  ) {}

  /**
   * Ensure org root exists (idempotent)
   * Creates org root folder if it doesn't exist
   * 
   * Constitution: Org root is structural only, not a content owner
   * Org root owned by orgOwnerUserId, but org is not content owner
   * 
   * @param tx Optional transaction - if provided, uses it; otherwise opens own transaction
   */
  async ensureOrgRootExists(
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const executeInTransaction = async (transaction: Transaction) => {
      // Check if org root already exists
      const existing = await this.repository.findOrgRoot(orgId, transaction);
      if (existing) {
        return existing;
      }

      try {
        // Generate folder ID first for self-parent pattern
        const folderId = randomUUID();

        // Insert org root with self-parent pattern
        // parentFolderId = id (self-reference)
        // Constitution: Root integrity enforced via self-parent pattern
        const orgRoot = await this.repository.insertOrgRoot(
          orgId,
          ownerUserId,
          folderId,
          transaction
        );

        return orgRoot;
      } catch (error: unknown) {
        // Handle race condition: another process may have created it
        if (isUniqueConstraintError(error)) {
          // Re-fetch existing root
          const existingRoot = await this.repository.findOrgRoot(
            orgId,
            transaction
          );
          if (existingRoot) {
            return existingRoot;
          }
        }
        throw error;
      }
    };

    // If transaction provided, use it; otherwise open new transaction
    if (tx) {
      return await executeInTransaction(tx);
    }

    return await db.transaction(executeInTransaction);
  }

  /**
   * Ensure user root exists (idempotent)
   * Creates user root folder and mapping if they don't exist
   * 
   * Constitution:
   * - User root folder owned by userId (not orgOwnerUserId)
   * - User vaults are isolated from one another
   * - Privacy default: visibility = 'private'
   * - Org boundary: All operations scoped to orgId
   * 
   * On user removal: hard delete vault
   * TODO Phase 2: Implement user vault deletion on org removal
   * - Delete all folders under user root (cascade)
   * - Delete all documents under user root (cascade)
   * - Delete airu_user_roots mapping
   * - All shared links collapse (handled by deletion)
   */
  async ensureUserRootExists(
    orgId: string,
    userId: string,
    orgOwnerUserId: string
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Ensure org root exists first (within same transaction)
      // Constitution: Org boundary enforced - org root must exist
      await this.ensureOrgRootExists(orgId, orgOwnerUserId, tx);

      // Check if user root already exists
      const existingUserRoot = await this.repository.findUserRoot(
        orgId,
        userId,
        tx
      );

      if (existingUserRoot) {
        // Fetch the folder
        const folder = await this.repository.findFolderById(
          existingUserRoot.rootFolderId,
          tx
        );
        if (!folder) {
          throw new Error(
            `User root folder not found: ${existingUserRoot.rootFolderId}`
          );
        }
        // Constitution: Verify org boundary (folder must belong to same org)
        if (folder.orgId !== orgId) {
          throw new Error(
            `User root folder org mismatch: expected ${orgId}, got ${folder.orgId}`
          );
        }
        return folder;
      }

      try {
        // Fetch org root
        const orgRoot = await this.repository.findOrgRoot(orgId, tx);
        if (!orgRoot) {
          throw new Error(`Org root not found for org: ${orgId}`);
        }

        // Generate folder ID
        const folderId = randomUUID();

        // Insert user root folder under org root
        // Constitution: User root folder owned by userId (not orgOwnerUserId)
        // Constitution: Privacy default - visibility = 'private'
        const userRootFolder = await this.repository.insertUserRootFolder(
          orgId,
          userId, // Constitution: user owns their vault
          orgRoot.id, // Parent is org root
          folderId,
          tx
        );

        // Insert user root mapping
        // Constitution: User vault isolation enforced
        await this.repository.insertUserRoot(orgId, userId, folderId, tx);

        return userRootFolder;
      } catch (error: unknown) {
        // Handle race condition: another process may have created it
        if (isUniqueConstraintError(error)) {
          // Re-fetch existing user root
          const existingUserRoot = await this.repository.findUserRoot(
            orgId,
            userId,
            tx
          );
          if (existingUserRoot) {
            const folder = await this.repository.findFolderById(
              existingUserRoot.rootFolderId,
              tx
            );
            if (folder) {
              // Constitution: Verify org boundary
              if (folder.orgId !== orgId) {
                throw new Error(
                  `User root folder org mismatch: expected ${orgId}, got ${folder.orgId}`
                );
              }
              return folder;
            }
          }
        }
        throw error;
      }
    });
  }

  // =====================================================
  // PHASE 1: Folder Operations
  // =====================================================

  /**
   * Create folder in user vault
   * Constitution: User vault isolation, privacy default enforced
   */
  async createFolderInUserVault(
    orgId: string,
    userId: string,
    parentFolderId: string,
    humanId: string
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists (idempotent)
      // Note: ensureUserRootExists doesn't accept tx, but it opens its own transaction
      // This is acceptable since we're already in a transaction context
      const userRoot = await this.ensureUserRootExists(orgId, userId, userId);

      // If parentFolderId is empty or invalid, use user root as parent
      let actualParentFolderId = parentFolderId?.trim() || userRoot.id;

      // Verify parent folder belongs to user and org
      const parent = await this.repository.findFolderById(actualParentFolderId, tx);
      if (!parent) {
        throw new Error(`Parent folder not found: ${actualParentFolderId}`);
      }
      if (parent.orgId !== orgId) {
        throw new Error(`Parent folder org mismatch: expected ${orgId}, got ${parent.orgId}`);
      }
      if (parent.ownerUserId !== userId) {
        throw new Error(`Parent folder owner mismatch: expected ${userId}, got ${parent.ownerUserId}`);
      }
      if (parent.humanId === '__org_root__') {
        throw new Error('Cannot create folder under org root');
      }

      // Create folder
      return await this.repository.createFolder(orgId, userId, actualParentFolderId, humanId, tx);
    });
  }

  /**
   * Rename folder
   * Constitution: Root folders cannot be renamed
   */
  async renameFolder(
    orgId: string,
    userId: string,
    folderId: string,
    newHumanId: string
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists
      await this.ensureUserRootExists(orgId, userId, userId);

      // Update folder name
      return await this.repository.updateFolderName(folderId, orgId, userId, newHumanId, tx);
    });
  }

  /**
   * Move folder
   * Constitution: Root folders cannot be moved, cycle prevention enforced
   */
  async moveFolder(
    orgId: string,
    userId: string,
    folderId: string,
    newParentFolderId: string
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists
      await this.ensureUserRootExists(orgId, userId, userId);

      // Move folder (includes cycle check)
      return await this.repository.moveFolder(folderId, orgId, userId, newParentFolderId, tx);
    });
  }

  /**
   * Delete folder
   * Constitution: Root folders cannot be deleted, owner-only
   * Phase 3: Collapse all shares on deletion
   */
  async deleteFolder(
    orgId: string,
    userId: string,
    folderId: string
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists
      await this.ensureUserRootExists(orgId, userId, userId);

      // Verify ownership
      const folder = await this.repository.findFolderById(folderId, tx);
      if (!folder || folder.orgId !== orgId || folder.ownerUserId !== userId) {
        throw new Error('Folder not found or access denied');
      }

      // Find all descendant folders (for share cleanup)
      const descendants = await this.repository.findDescendantFolders(folderId, orgId, tx);

      // Collect all target IDs (folder + descendants)
      const targetIds = [folderId, ...descendants.map((f) => f.id)];

      // Delete all shares for these folders
      for (const targetId of targetIds) {
        await this.repository.deleteSharesForTarget('folder', targetId, orgId, tx);
      }

      // Delete folder (includes validation, cascade deletes children)
      await this.repository.deleteFolder(folderId, orgId, userId, tx);

      // Log deletion
      await this.repository.createAuditLog(
        {
          orgId,
          eventType: 'folder_deleted',
          targetType: 'folder',
          targetId: folderId,
          performedByUserId: userId,
          metadata: { folderName: folder.humanId },
        },
        tx
      );
    });
  }

  /**
   * List user folder tree
   * Constitution: Org boundary and owner isolation enforced
   */
  async listUserFolderTree(
    orgId: string,
    userId: string,
    parentFolderId?: string
  ): Promise<FolderTreeResponse> {
    // Ensure user root exists
    const userRoot = await this.ensureUserRootExists(orgId, userId, userId);

    // Use provided parent or user root
    const rootFolderId = parentFolderId || userRoot.id;

    // Verify parent belongs to user and org
    const parent = await this.repository.findFolderById(rootFolderId);
    if (!parent) {
      throw new Error(`Parent folder not found: ${rootFolderId}`);
    }
    if (parent.orgId !== orgId) {
      throw new Error(`Parent folder org mismatch: expected ${orgId}, got ${parent.orgId}`);
    }
    if (parent.ownerUserId !== userId) {
      throw new Error(`Parent folder owner mismatch: expected ${userId}, got ${parent.ownerUserId}`);
    }

    // Build tree
    return await this.repository.findFolderTree(orgId, userId, rootFolderId);
  }

  // =====================================================
  // PHASE 1: Document Operations
  // =====================================================

  /**
   * Create user document
   * Constitution: Privacy default = 'private', owner isolation enforced
   */
  async createUserDocument(
    orgId: string,
    userId: string,
    folderId: string,
    name: string,
    content: string,
    type: 'TXT' | 'MD' | 'RTF'
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists
      await this.ensureUserRootExists(orgId, userId, userId);

      // Verify folder belongs to user and org
      const folder = await this.repository.findFolderById(folderId, tx);
      if (!folder) {
        throw new Error(`Folder not found: ${folderId}`);
      }
      if (folder.orgId !== orgId) {
        throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
      }
      if (folder.ownerUserId !== userId) {
        throw new Error(`Folder owner mismatch: expected ${userId}, got ${folder.ownerUserId}`);
      }

      // Create document
      return await this.repository.createDocument(
        folderId,
        orgId,
        userId,
        name,
        content,
        type,
        tx
      );
    });
  }

  /**
   * Get user document
   * Constitution: Org boundary and owner isolation enforced
   */
  async getUserDocument(
    orgId: string,
    userId: string,
    documentId: string
  ): Promise<AiruDocument> {
    const document = await this.repository.findDocument(documentId, orgId, userId);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }
    return document;
  }

  /**
   * List user documents in folder
   * Constitution: Org boundary and owner isolation enforced
   */
  async listUserDocuments(
    orgId: string,
    userId: string,
    folderId: string
  ): Promise<AiruDocument[]> {
    // Verify folder belongs to user and org
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== userId) {
      throw new Error(`Folder owner mismatch: expected ${userId}, got ${folder.ownerUserId}`);
    }

    return await this.repository.findDocumentsInFolder(folderId, orgId, userId);
  }

  /**
   * Update user document
   * Constitution: Owner-only operation
   */
  async updateUserDocument(
    orgId: string,
    userId: string,
    documentId: string,
    content: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Update document content
      return await this.repository.updateDocumentContent(documentId, orgId, userId, content, tx);
    });
  }

  /**
   * Rename user document
   * Constitution: Owner-only operation
   */
  async renameUserDocument(
    orgId: string,
    userId: string,
    documentId: string,
    newName: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Update document name
      return await this.repository.updateDocumentName(documentId, orgId, userId, newName, tx);
    });
  }

  /**
   * Move user document
   * Constitution: Owner-only operation, org boundary enforced
   */
  async moveUserDocument(
    orgId: string,
    userId: string,
    documentId: string,
    newFolderId: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Move document
      return await this.repository.moveDocument(documentId, orgId, userId, newFolderId, tx);
    });
  }

  /**
   * Delete user document
   * Constitution: Owner-only operation, hard delete
   * Phase 3: Collapse all shares on deletion
   */
  async deleteUserDocument(
    orgId: string,
    userId: string,
    documentId: string
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      // Verify ownership
      const document = await this.repository.findDocument(documentId, orgId, userId, tx);
      if (!document) {
        throw new Error('Document not found or access denied');
      }

      // Delete all shares for this document
      await this.repository.deleteSharesForTarget('document', documentId, orgId, tx);

      // Delete document
      await this.repository.deleteDocument(documentId, orgId, userId, tx);

      // Log deletion
      await this.repository.createAuditLog(
        {
          orgId,
          eventType: 'document_deleted',
          targetType: 'document',
          targetId: documentId,
          performedByUserId: userId,
          metadata: { documentName: document.name },
        },
        tx
      );
    });
  }

  // =====================================================
  // PHASE 2: Sharing Operations
  // =====================================================

  /**
   * Share to user
   * Constitution: Sharing expands access, not ownership
   */
  async shareToUser(
    orgId: string,
    ownerUserId: string,
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    viewOnly: boolean
  ): Promise<AiruShare> {
    return await db.transaction(async (tx) => {
      // Verify target exists and belongs to owner
      if (targetType === 'folder') {
        const folder = await this.repository.findFolderById(targetId, tx);
        if (!folder || folder.orgId !== orgId || folder.ownerUserId !== ownerUserId) {
          throw new Error(`Folder not found or access denied: ${targetId}`);
        }
        if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
          throw new Error('Cannot share root folders');
        }
      } else {
        const document = await this.repository.findDocument(targetId, orgId, ownerUserId, tx);
        if (!document) {
          throw new Error(`Document not found or access denied: ${targetId}`);
        }
      }

      // Grant share
      return await this.repository.grantShare(
        {
          orgId,
          targetType,
          targetId,
          shareType: 'user',
          grantedToUserId: userId,
          viewOnly,
          createdByUserId: ownerUserId,
        },
        tx
      );
    });
  }

  /**
   * Share to org
   * Constitution: Sharing expands access, not ownership
   */
  async shareToOrg(
    orgId: string,
    ownerUserId: string,
    targetType: 'folder' | 'document',
    targetId: string,
    viewOnly: boolean
  ): Promise<AiruShare> {
    return await db.transaction(async (tx) => {
      // Verify target exists and belongs to owner
      if (targetType === 'folder') {
        const folder = await this.repository.findFolderById(targetId, tx);
        if (!folder || folder.orgId !== orgId || folder.ownerUserId !== ownerUserId) {
          throw new Error(`Folder not found or access denied: ${targetId}`);
        }
        if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
          throw new Error('Cannot share root folders');
        }
      } else {
        const document = await this.repository.findDocument(targetId, orgId, ownerUserId, tx);
        if (!document) {
          throw new Error(`Document not found or access denied: ${targetId}`);
        }
      }

      // Grant share
      return await this.repository.grantShare(
        {
          orgId,
          targetType,
          targetId,
          shareType: 'org',
          viewOnly,
          createdByUserId: ownerUserId,
        },
        tx
      );
    });
  }

  /**
   * Share publicly
   * Constitution: Sharing expands access, not ownership
   */
  async sharePublic(
    orgId: string,
    ownerUserId: string,
    targetType: 'folder' | 'document',
    targetId: string
  ): Promise<AiruShare> {
    return await db.transaction(async (tx) => {
      // Verify target exists and belongs to owner
      if (targetType === 'folder') {
        const folder = await this.repository.findFolderById(targetId, tx);
        if (!folder || folder.orgId !== orgId || folder.ownerUserId !== ownerUserId) {
          throw new Error(`Folder not found or access denied: ${targetId}`);
        }
        if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
          throw new Error('Cannot share root folders');
        }
      } else {
        const document = await this.repository.findDocument(targetId, orgId, ownerUserId, tx);
        if (!document) {
          throw new Error(`Document not found or access denied: ${targetId}`);
        }
      }

      // Grant share
      return await this.repository.grantShare(
        {
          orgId,
          targetType,
          targetId,
          shareType: 'public',
          viewOnly: true, // Public shares are view-only by default
          createdByUserId: ownerUserId,
        },
        tx
      );
    });
  }

  /**
   * Share via link
   * Constitution: Links resolve to resource existence
   */
  async shareViaLink(
    orgId: string,
    ownerUserId: string,
    targetType: 'folder' | 'document',
    targetId: string,
    password?: string
  ): Promise<AiruShare> {
    return await db.transaction(async (tx) => {
      // Verify target exists and belongs to owner
      if (targetType === 'folder') {
        const folder = await this.repository.findFolderById(targetId, tx);
        if (!folder || folder.orgId !== orgId || folder.ownerUserId !== ownerUserId) {
          throw new Error(`Folder not found or access denied: ${targetId}`);
        }
        if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
          throw new Error('Cannot share root folders');
        }
      } else {
        const document = await this.repository.findDocument(targetId, orgId, ownerUserId, tx);
        if (!document) {
          throw new Error(`Document not found or access denied: ${targetId}`);
        }
      }

      // Generate unique link code (UUID-based, shortened to first 8 chars)
      const linkCode = randomUUID().replace(/-/g, '').substring(0, 8);

      // Hash password if provided
      let linkPasswordHash: string | undefined;
      if (password) {
        linkPasswordHash = await hash(password, 10);
      }

      // Grant share
      return await this.repository.grantShare(
        {
          orgId,
          targetType,
          targetId,
          shareType: 'link',
          linkCode,
          linkPasswordHash,
          viewOnly: false, // Link shares allow editing by default
          createdByUserId: ownerUserId,
        },
        tx
      );
    });
  }

  /**
   * Revoke share
   * Constitution: Owner-only operation
   */
  async revokeShare(
    orgId: string,
    ownerUserId: string,
    shareId: string
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      await this.repository.revokeShare(shareId, orgId, ownerUserId, tx);
    });
  }

  // =====================================================
  // PHASE 2: Content Management
  // =====================================================

  /**
   * Update document canonical content
   * Constitution: Owner-only operation
   */
  async updateDocumentCanonical(
    orgId: string,
    ownerUserId: string,
    documentId: string,
    content: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Update canonical content
      const document = await this.repository.updateCanonicalContent(
        documentId,
        orgId,
        ownerUserId,
        content,
        tx
      );

      // Create revision snapshot
      await this.repository.createRevision(
        documentId,
        'canonical',
        content,
        ownerUserId,
        tx
      );

      return document;
    });
  }

  /**
   * Update document shared content
   * Constitution: Editors modify shared_content only
   */
  async updateDocumentShared(
    orgId: string,
    userId: string,
    documentId: string,
    content: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Update shared content
      const document = await this.repository.updateSharedContent(
        documentId,
        orgId,
        userId,
        content,
        tx
      );

      // Create revision snapshot
      await this.repository.createRevision(
        documentId,
        'shared',
        content,
        userId,
        tx
      );

      return document;
    });
  }

  /**
   * Accept shared changes into canonical
   * Constitution: Owner-only operation
   */
  async acceptSharedIntoCanonical(
    orgId: string,
    ownerUserId: string,
    documentId: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Accept shared content
      const document = await this.repository.acceptSharedIntoCanonical(
        documentId,
        orgId,
        ownerUserId,
        tx
      );

      // Create revision snapshot
      if (document.canonicalContent) {
        await this.repository.createRevision(
          documentId,
          'canonical',
          document.canonicalContent,
          ownerUserId,
          tx
        );
      }

      return document;
    });
  }

  /**
   * Revert shared changes to canonical
   * Constitution: Owner-only operation
   */
  async revertSharedToCanonical(
    orgId: string,
    ownerUserId: string,
    documentId: string
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Revert shared content
      return await this.repository.revertSharedToCanonical(
        documentId,
        orgId,
        ownerUserId,
        tx
      );
    });
  }

  // =====================================================
  // PHASE 2: Link Resolution
  // =====================================================

  /**
   * Resolve link code to target
   * Constitution: Links resolve to resource existence
   */
  async resolveLink(
    linkCode: string,
    password?: string
  ): Promise<{
    targetType: 'folder' | 'document';
    targetId: string;
    orgId: string;
    viewOnly: boolean;
    shareId: string;
  } | null> {
    // Find share by link code
    const share = await this.repository.findShareByLinkCode(linkCode);
    if (!share) {
      return null; // 404 - link dead
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      return null; // 410 - expired
    }

    // Validate password if required
    if (share.linkPasswordHash) {
      if (!password) {
        return null; // 403 - password required
      }
      const { compare } = await import('bcryptjs');
      const isValid = await compare(password, share.linkPasswordHash);
      if (!isValid) {
        return null; // 403 - invalid password
      }
    }

    // Verify target exists
    if (share.targetType === 'folder') {
      const folder = await this.repository.findFolderById(share.targetId);
      if (!folder) {
        return null; // 404 - resource deleted
      }
    } else {
      // For documents, we need to check if it exists
      // Since we don't have orgId here, we'll check via the share's orgId
      const [document] = await db
        .select()
        .from(airuDocumentsTable)
        .where(eq(airuDocumentsTable.id, share.targetId))
        .limit(1);
      if (!document) {
        return null; // 404 - resource deleted
      }
    }

      return {
        targetType: share.targetType,
        targetId: share.targetId,
        orgId: share.orgId,
        viewOnly: share.viewOnly,
        shareId: share.id,
      };
    }

  // =====================================================
  // PHASE 3: Vault Deletion & Lifecycle
  // =====================================================

  /**
   * Delete user vault (hard delete)
   * Constitution: Removal = destruction of owned vault
   * 
   * This method performs a complete hard delete of a user's vault:
   * - Deletes all folders under user root (cascade)
   * - Deletes all documents under user root (cascade)
   * - Deletes all shares where user is owner
   * - Deletes all links where user is owner
   * - Deletes user root mapping
   * - Creates audit log entry
   * 
   * Note: Admin/owner verification should be done at the route level
   */
  async deleteUserVault(
    orgId: string,
    userId: string,
    confirmedByUserId: string
  ): Promise<{
    deletedFolders: number;
    deletedDocuments: number;
    deletedShares: number;
    deletedLinks: number;
  }> {
    return await db.transaction(async (tx) => {
      // Find user root
      const userRoot = await this.repository.findUserRoot(orgId, userId, tx);
      if (!userRoot) {
        // Vault doesn't exist, return zeros
        return {
          deletedFolders: 0,
          deletedDocuments: 0,
          deletedShares: 0,
          deletedLinks: 0,
        };
      }

      // Find all descendant folders
      const descendants = await this.repository.findDescendantFolders(
        userRoot.rootFolderId,
        orgId,
        tx
      );
      const allFolderIds = [userRoot.rootFolderId, ...descendants.map((f) => f.id)];

      // Count documents in all folders
      let deletedDocuments = 0;
      for (const folderId of allFolderIds) {
        const documents = await tx
          .select()
          .from(airuDocumentsTable)
          .where(
            and(
              eq(airuDocumentsTable.folderId, folderId),
              eq(airuDocumentsTable.ownerUserId, userId)
            )
          );
        deletedDocuments += documents.length;
      }

      // Delete all shares where user is owner (folders and documents)
      const userShares = await tx
        .select()
        .from(airuSharesTable)
        .where(
          and(
            eq(airuSharesTable.orgId, orgId),
            eq(airuSharesTable.createdByUserId, userId)
          )
        );

      const deletedShares = userShares.length;
      const deletedLinks = userShares.filter((s) => s.shareType === 'link').length;

      // Delete all shares for user's folders and documents
      for (const folderId of allFolderIds) {
        await this.repository.deleteSharesForTarget('folder', folderId, orgId, tx);
      }

      // Delete all shares where user is owner
      await tx
        .delete(airuSharesTable)
        .where(
          and(
            eq(airuSharesTable.orgId, orgId),
            eq(airuSharesTable.createdByUserId, userId)
          )
        );

      // Delete user root folder (cascade deletes all children folders and documents)
      await tx
        .delete(airuFoldersTable)
        .where(
          and(
            eq(airuFoldersTable.id, userRoot.rootFolderId),
            eq(airuFoldersTable.orgId, orgId),
            eq(airuFoldersTable.ownerUserId, userId)
          )
        );

      // Delete user root mapping
      await tx
        .delete(airuUserRootsTable)
        .where(
          and(
            eq(airuUserRootsTable.orgId, orgId),
            eq(airuUserRootsTable.userId, userId)
          )
        );

      // Log deletion event
      await this.repository.createAuditLog(
        {
          orgId,
          eventType: 'vault_deleted',
          targetType: 'vault',
          targetId: userRoot.rootFolderId,
          performedByUserId: confirmedByUserId,
          metadata: {
            deletedUserId: userId,
            deletedFolders: allFolderIds.length,
            deletedDocuments,
            deletedShares,
            deletedLinks,
          },
        },
        tx
      );

      return {
        deletedFolders: allFolderIds.length,
        deletedDocuments,
        deletedShares,
        deletedLinks,
      };
    });
  }
}
