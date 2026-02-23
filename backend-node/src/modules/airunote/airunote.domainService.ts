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
  type AiruFolderType,
  type AiruDocument,
  type FolderTreeResponse,
  type AiruShare,
  type AiruDocumentMetadata,
  type AiruLens,
  type LensQuery,
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
    humanId: string,
    type: AiruFolderType = 'box',
    metadata: Record<string, unknown> | null = null
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

      // Validate type - extended folder types
      const validTypes: AiruFolderType[] = [
        'box', 'board', 'book', 'canvas', 'collection', 
        'contacts', 'ledger', 'journal', 'manual', 
        'notebook', 'pipeline', 'project', 'wiki'
      ];
      if (!validTypes.includes(type as AiruFolderType)) {
        throw new Error(`Invalid folder type: ${type}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Create folder
      return await this.repository.createFolder(orgId, userId, actualParentFolderId, humanId, type, metadata, tx);
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
   * Update folder properties (name, type, metadata)
   * Constitution: Root folders cannot be renamed
   */
  async updateFolder(
    orgId: string,
    userId: string,
    folderId: string,
    updates: {
      humanId?: string;
      type?: AiruFolderType;
      metadata?: Record<string, unknown> | null;
    }
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Ensure user root exists
      await this.ensureUserRootExists(orgId, userId, userId);

      // Validate type if provided
      if (updates.type && !['box', 'book', 'board'].includes(updates.type)) {
        throw new Error(`Invalid folder type: ${updates.type}. Must be 'box', 'book', or 'board'`);
      }

      // Update folder
      return await this.repository.updateFolder(folderId, orgId, userId, updates, tx);
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
   * Phase 7: Supports attributes and optional schema validation
   */
  async createUserDocument(
    orgId: string,
    userId: string,
    folderId: string,
    name: string,
    content: string,
    type: 'TXT' | 'MD' | 'RTF',
    attributes?: Record<string, any>
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

      // Phase 7: Validate attributes against folder schema if present
      const folderSchema = folder.metadata?.schema;
      if (attributes && folderSchema) {
        this.validateDocumentAttributes(attributes, folderSchema);
      }

      // Create document
      return await this.repository.createDocument(
        folderId,
        orgId,
        userId,
        name,
        content,
        type,
        attributes || {},
        tx
      );
    });
  }

  /**
   * Phase 7: Hybrid Attribute Engine
   * Validates document attributes against folder schema if present
   */
  private validateDocumentAttributes(
    attributes: Record<string, any>,
    folderSchema?: Record<string, any> | null
  ): void {
    if (!folderSchema || typeof folderSchema !== 'object') {
      // No schema defined, skip validation
      return;
    }

    const schema = folderSchema as Record<string, { type: string; required?: boolean }>;
    
    // Validate each attribute key
    for (const [key, value] of Object.entries(attributes)) {
      const fieldSchema = schema[key];
      if (!fieldSchema) {
        // Attribute not in schema - allow it (flexible schema)
        continue;
      }

      // Type validation
      const expectedType = fieldSchema.type;
      const actualType = typeof value;
      
      if (expectedType === 'string' && actualType !== 'string') {
        throw new Error(`Attribute "${key}" must be of type string, got ${actualType}`);
      }
      if (expectedType === 'number' && actualType !== 'number') {
        throw new Error(`Attribute "${key}" must be of type number, got ${actualType}`);
      }
      if (expectedType === 'boolean' && actualType !== 'boolean') {
        throw new Error(`Attribute "${key}" must be of type boolean, got ${actualType}`);
      }
      if (expectedType === 'array' && !Array.isArray(value)) {
        throw new Error(`Attribute "${key}" must be of type array, got ${actualType}`);
      }
      if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value) || value === null)) {
        throw new Error(`Attribute "${key}" must be of type object, got ${actualType}`);
      }
    }

    // Check required fields
    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.required && !(key in attributes)) {
        throw new Error(`Required attribute "${key}" is missing`);
      }
    }
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
   * Update user document attributes
   * Phase 7: Hybrid Attribute Engine
   * Constitution: Owner-only operation
   */
  async updateUserDocumentAttributes(
    orgId: string,
    userId: string,
    documentId: string,
    attributes: Record<string, any>
  ): Promise<AiruDocument> {
    return await db.transaction(async (tx) => {
      // Get document to find its folder
      const document = await this.repository.findDocument(documentId, orgId, userId, tx);
      if (!document) {
        throw new Error(`Document not found or access denied: ${documentId}`);
      }

      // Get folder to check for schema validation
      const folder = await this.repository.findFolderById(document.folderId, tx);
      if (folder) {
        const folderSchema = folder.metadata?.schema;
        if (folderSchema) {
          this.validateDocumentAttributes(attributes, folderSchema);
        }
      }

      // Update attributes
      return await this.repository.updateDocumentAttributes(
        documentId,
        orgId,
        userId,
        attributes,
        tx
      );
    });
  }

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
   * Get full metadata for all folders and documents owned by user in org
   * Returns flat arrays (no nesting, no content)
   * Constitution: Org boundary and owner isolation enforced
   */
  async getFullMetadata(
    orgId: string,
    userId: string
  ): Promise<{ folders: AiruFolder[]; documents: AiruDocumentMetadata[] }> {
    // Verify user is authenticated
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get full metadata from repository
    return await this.repository.getFullMetadata(orgId, userId);
  }

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

  /**
   * Resolve folder projection with lens
   * Phase 1 — Folder → Lens Rendering Refactor
   * 
   * Fetches folder and its default lens (or creates implicit box lens if none exists)
   * 
   * @returns Object with folder and lens (never null - falls back to implicit box lens)
   */
  async resolveFolderProjection(
    folderId: string
  ): Promise<{ folder: AiruFolder; lens: AiruLens }> {
    // Fetch folder
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    // Fetch lens via getDefaultLensForFolder
    let lens = await this.repository.getDefaultLensForFolder(folderId);

    // If lens is null: construct implicit lens object
    if (!lens) {
      lens = {
        id: '', // Empty string for implicit lens (no database id)
        folderId: folderId,
        name: 'Default',
        type: 'box',
        isDefault: true,
        metadata: { layout: { defaultView: 'box' } },
        query: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      folder,
      lens,
    };
  }

  /**
   * Resolve lens and fetch documents by query
   * Phase 6 — Unified Projection Engine
   * 
   * Uses unified resolveLensDocuments for all lens types
   * 
   * @returns Object with lens and documents
   */
  async resolveLensProjection(
    lensId: string,
    orgId: string,
    userId: string
  ): Promise<{ lens: AiruLens; documents: AiruDocument[] }> {
    // Fetch lens
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Phase 6: Use unified resolver for all lens types
    const documents = await this.repository.resolveLensDocuments(lens, orgId, userId);
    return { lens, documents };
  }

  // =====================================================
  // PHASE 2: Multi-lens per folder
  // =====================================================

  /**
   * Create a lens for a folder
   */
  async createFolderLens(
    folderId: string,
    orgId: string,
    userId: string,
    data: {
      name: string;
      type: 'box' | 'board' | 'canvas' | 'book';
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    }
  ): Promise<AiruLens> {
    // Verify folder exists and user has access
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    if (folder.orgId !== orgId) {
      throw new Error('Folder does not belong to organization');
    }

    if (folder.ownerUserId !== userId) {
      throw new Error('User does not own this folder');
    }

    // Validate type
    if (!['box', 'board', 'canvas', 'book'].includes(data.type)) {
      throw new Error(`Invalid lens type: ${data.type}. Must be one of: box, board, canvas, book`);
    }

    return await this.repository.createLens({
      folderId,
      name: data.name,
      type: data.type,
      metadata: data.metadata,
      query: data.query,
    });
  }

  /**
   * Create a desktop lens (folderId = null)
   * Phase 5 — Desktop Lenses
   * Phase 6 — Also supports "saved" type
   */
  async createDesktopLens(
    orgId: string,
    userId: string,
    data: {
      name: string;
      type: 'desktop' | 'saved';
      query?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<AiruLens> {
    // Validate type
    if (data.type !== 'desktop' && data.type !== 'saved') {
      throw new Error(`Invalid lens type: ${data.type}. Must be "desktop" or "saved"`);
    }

    // Desktop/saved lenses don't require folderId (it will be null)
    return await this.repository.createLens({
      folderId: null,
      name: data.name,
      type: data.type,
      metadata: data.metadata,
      query: data.query,
    });
  }

  /**
   * Update a desktop/saved lens (folderId = null)
   * Phase 6 — Unified Projection Engine + Saved Views
   */
  async updateDesktopLens(
    lensId: string,
    orgId: string,
    userId: string,
    partialData: {
      name?: string;
      query?: LensQuery | Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<AiruLens> {
    // Fetch lens to verify it exists and is a desktop/saved lens
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Only allow updating desktop/saved lenses (folderId is null)
    if (lens.folderId !== null) {
      throw new Error('Use updateFolderLens for folder lenses');
    }

    // Update lens
    return await this.repository.updateLens(lensId, partialData);
  }

  /**
   * Update a lens
   */
  async updateFolderLens(
    folderId: string,
    lensId: string,
    orgId: string,
    userId: string,
    partialData: {
      name?: string;
      type?: 'box' | 'board' | 'canvas' | 'book';
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    }
  ): Promise<AiruLens> {
    // Verify folder exists and user has access
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    if (folder.orgId !== orgId) {
      throw new Error('Folder does not belong to organization');
    }

    if (folder.ownerUserId !== userId) {
      throw new Error('User does not own this folder');
    }

    // Verify lens exists and belongs to folder
    const lenses = await this.repository.getLensesForFolder(folderId);
    const lens = lenses.find((l) => l.id === lensId);
    if (!lens) {
      throw new Error(`Lens ${lensId} not found or does not belong to folder ${folderId}`);
    }

    // Validate type if provided
    if (partialData.type && !['box', 'board', 'canvas', 'book'].includes(partialData.type)) {
      throw new Error(`Invalid lens type: ${partialData.type}. Must be one of: box, board, canvas, book`);
    }

    return await this.repository.updateLens(lensId, partialData);
  }

  /**
   * Switch default lens for a folder
   * Uses transaction to ensure atomicity
   */
  async switchFolderLens(
    folderId: string,
    lensId: string,
    orgId: string,
    userId: string
  ): Promise<void> {
    // Verify folder exists and user has access
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    if (folder.orgId !== orgId) {
      throw new Error('Folder does not belong to organization');
    }

    if (folder.ownerUserId !== userId) {
      throw new Error('User does not own this folder');
    }

    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      await this.repository.setDefaultLens(folderId, lensId, tx);
    });
  }

  /**
   * Get lenses for a folder (with access control)
   */
  async getFolderLenses(
    folderId: string,
    orgId: string,
    userId: string
  ): Promise<AiruLens[]> {
    // Verify folder exists and user has access
    const folder = await this.repository.findFolderById(folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    if (folder.orgId !== orgId) {
      throw new Error('Folder does not belong to organization');
    }

    if (folder.ownerUserId !== userId) {
      throw new Error('User does not own this folder');
    }

    return await this.repository.getLensesForFolder(folderId);
  }

  /**
   * Update canvas positions for a lens
   * Phase 3 — Canvas layout ownership by Lens
   * 
   * Merges positions into lens.metadata.views.canvas.positions
   * Only updates metadata column, preserves other metadata
   */
  async updateCanvasPositions(
    lensId: string,
    positions: Record<string, { x: number; y: number }>
  ): Promise<AiruLens> {
    // Fetch lens to verify it exists and is canvas type
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Verify lens type is canvas
    if (lens.type !== 'canvas') {
      throw new Error(`Lens type must be "canvas", got "${lens.type}"`);
    }

    // Validate positions shape
    for (const [docId, position] of Object.entries(positions)) {
      if (typeof docId !== 'string') {
        throw new Error(`Invalid document ID: ${docId}`);
      }
      if (
        typeof position !== 'object' ||
        position === null ||
        typeof position.x !== 'number' ||
        typeof position.y !== 'number'
      ) {
        throw new Error(`Invalid position for document ${docId}: must have x and y as numbers`);
      }
    }

    // Merge positions into metadata.views.canvas.positions
    const metadataUpdate = {
      views: {
        canvas: {
          positions: positions,
        },
      },
    };

    return await this.repository.updateLensMetadataPartial(lensId, metadataUpdate);
  }

  /**
   * Update board card position (fractional order)
   * Phase 4 — Board state ownership by Lens
   * 
   * Updates card position in lens.metadata.views.board.cardPositions
   */
  async updateBoardCard(
    lensId: string,
    documentId: string,
    laneId: string,
    fractionalOrder: number
  ): Promise<AiruLens> {
    // Fetch lens to verify it exists and is board type
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Verify lens type is board
    if (lens.type !== 'board') {
      throw new Error(`Lens type must be "board", got "${lens.type}"`);
    }

    // Validate inputs
    if (typeof documentId !== 'string' || !documentId) {
      throw new Error('Invalid document ID');
    }
    if (typeof laneId !== 'string' || !laneId) {
      throw new Error('Invalid lane ID');
    }
    if (typeof fractionalOrder !== 'number' || isNaN(fractionalOrder)) {
      throw new Error('Invalid fractional order');
    }

    // Update card position in metadata.views.board.cardPositions
    const metadata = lens.metadata || {};
    const views = (metadata.views as Record<string, unknown>) || {};
    const board = (views.board as Record<string, unknown>) || {};
    const cardPositions = (board.cardPositions as Record<string, { laneId: string; fractionalOrder: number }>) || {};

    // Update or add card position
    cardPositions[documentId] = { laneId, fractionalOrder };

    const metadataUpdate = {
      views: {
        board: {
          ...board,
          cardPositions,
        },
      },
    };

    return await this.repository.updateLensMetadataPartial(lensId, metadataUpdate);
  }

  /**
   * Update board lanes
   * Phase 4 — Board state ownership by Lens
   * 
   * Updates lanes in lens.metadata.views.board.lanes
   */
  async updateBoardLanes(
    lensId: string,
    lanes: Array<{ id: string; name: string; order: number }>
  ): Promise<AiruLens> {
    // Fetch lens to verify it exists and is board type
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Verify lens type is board
    if (lens.type !== 'board') {
      throw new Error(`Lens type must be "board", got "${lens.type}"`);
    }

    // Validate lanes
    if (!Array.isArray(lanes)) {
      throw new Error('Lanes must be an array');
    }

    for (const lane of lanes) {
      if (typeof lane.id !== 'string' || !lane.id) {
        throw new Error('Invalid lane ID');
      }
      if (typeof lane.name !== 'string') {
        throw new Error('Invalid lane name');
      }
      if (typeof lane.order !== 'number' || isNaN(lane.order)) {
        throw new Error('Invalid lane order');
      }
    }

    // Update lanes in metadata.views.board.lanes
    const metadataUpdate = {
      views: {
        board: {
          lanes,
        },
      },
    };

    return await this.repository.updateLensMetadataPartial(lensId, metadataUpdate);
  }

  /**
   * Batch update lens layout (canvas positions and/or board positions)
   * Phase 8.1 — Batch Layout Updates
   * 
   * Updates both canvas and board positions in a single transaction
   * Uses JSONB merge patch to ensure concurrent-safe updates
   */
  async updateBatchLayout(
    lensId: string,
    updates: {
      canvasPositions?: Record<string, { x: number; y: number }>;
      boardPositions?: Record<string, { laneId: string; order: number }>;
    }
  ): Promise<AiruLens> {
    // Fetch lens to verify it exists
    const lens = await this.repository.getLensById(lensId);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Validate canvas positions if provided
    if (updates.canvasPositions) {
      if (lens.type !== 'canvas') {
        throw new Error(`Lens type must be "canvas" to update canvas positions, got "${lens.type}"`);
      }

      for (const [docId, position] of Object.entries(updates.canvasPositions)) {
        if (typeof docId !== 'string') {
          throw new Error(`Invalid document ID: ${docId}`);
        }
        if (
          typeof position !== 'object' ||
          position === null ||
          typeof position.x !== 'number' ||
          typeof position.y !== 'number'
        ) {
          throw new Error(`Invalid position for document ${docId}: must have x and y as numbers`);
        }
      }
    }

    // Validate board positions if provided
    if (updates.boardPositions) {
      if (lens.type !== 'board') {
        throw new Error(`Lens type must be "board" to update board positions, got "${lens.type}"`);
      }

      for (const [docId, position] of Object.entries(updates.boardPositions)) {
        if (typeof docId !== 'string') {
          throw new Error(`Invalid document ID: ${docId}`);
        }
        if (
          typeof position !== 'object' ||
          position === null ||
          typeof position.laneId !== 'string' ||
          typeof position.order !== 'number'
        ) {
          throw new Error(`Invalid board position for document ${docId}: must have laneId (string) and order (number)`);
        }
      }
    }

    // Build metadata update with both canvas and board positions
    const metadataUpdate: Record<string, unknown> = {};

    if (updates.canvasPositions) {
      metadataUpdate.views = {
        ...(metadataUpdate.views as Record<string, unknown> || {}),
        canvas: {
          positions: updates.canvasPositions,
        },
      };
    }

    if (updates.boardPositions) {
      // Convert boardPositions to cardPositions format
      const cardPositions: Record<string, { laneId: string; fractionalOrder: number }> = {};
      for (const [docId, position] of Object.entries(updates.boardPositions)) {
        cardPositions[docId] = {
          laneId: position.laneId,
          fractionalOrder: position.order,
        };
      }

      const existingViews = (metadataUpdate.views as Record<string, unknown>) || {};
      const existingBoard = (existingViews.board as Record<string, unknown>) || {};

      metadataUpdate.views = {
        ...existingViews,
        board: {
          ...existingBoard,
          cardPositions,
        },
      };
    }

    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      return await this.repository.updateLensMetadataPartial(lensId, metadataUpdate, tx);
    });
  }
}
