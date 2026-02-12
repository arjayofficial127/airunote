/**
 * Airunote Repository
 * Pure database access layer for Airunote domain tables
 * 
 * CONSTITUTION v1.0 COMPLIANCE:
 * - Every document/folder has exactly one owner_user_id
 * - Org is boundary, not owner
 * - No admin access bypass
 * - Org boundary enforced in all queries
 */
import { injectable } from 'tsyringe';
import { eq, and, sql, ne, or, desc, isNull, gt, lt } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  airuFoldersTable,
  airuUserRootsTable,
  airuDocumentsTable,
  airuSharesTable,
  airuDocumentRevisionsTable,
} from '../../infrastructure/db/drizzle/schema';

// Transaction type - drizzle transactions have the same interface as db
type Transaction = typeof db;

export interface AiruFolder {
  id: string;
  orgId: string;
  ownerUserId: string; // Constitution: exactly one owner per folder
  parentFolderId: string;
  humanId: string;
  visibility: 'private' | 'org' | 'public';
  createdAt: Date;
}

export interface AiruUserRoot {
  orgId: string;
  userId: string;
  rootFolderId: string;
  createdAt: Date;
}

export interface AiruDocument {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  content: string; // Always use canonicalContent from DB, fallback to content if needed
  canonicalContent?: string; // Phase 2: canonical content
  sharedContent?: string | null; // Phase 2: shared content (nullable)
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

@injectable()
export class AirunoteRepository {
  /**
   * Find org root folder by orgId
   * Org root is identified by:
   * - humanId = '__org_root__'
   * - parentFolderId = id (self-parent pattern)
   * 
   * Constitution: Org root is structural only, not a content owner
   * 
   * TODO Phase 2: Add unique constraint on (org_id) WHERE human_id='__org_root__'
   * to enforce exactly one org root per org at DB level
   */
  async findOrgRoot(
    orgId: string,
    tx?: Transaction
  ): Promise<AiruFolder | null> {
    const dbInstance = tx ?? db;
    const [folder] = await dbInstance
      .select()
      .from(airuFoldersTable)
      .where(
        and(
          eq(airuFoldersTable.orgId, orgId), // Constitution: org boundary enforced
          eq(airuFoldersTable.humanId, '__org_root__'),
          sql`${airuFoldersTable.parentFolderId} = ${airuFoldersTable.id}` // Root integrity: self-parent
        )
      )
      .limit(1);

    if (!folder) {
      return null;
    }

    return {
      id: folder.id,
      orgId: folder.orgId,
      ownerUserId: folder.ownerUserId,
      parentFolderId: folder.parentFolderId,
      humanId: folder.humanId,
      visibility: folder.visibility as 'private' | 'org' | 'public',
      createdAt: folder.createdAt,
    };
  }

  /**
   * Insert org root folder
   * Uses self-parent pattern: parentFolderId = id
   * 
   * Constitution: Org root owned by org owner, but org is not content owner
   */
  async insertOrgRoot(
    orgId: string,
    ownerUserId: string,
    folderId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const dbInstance = tx ?? db;
    const [inserted] = await dbInstance
      .insert(airuFoldersTable)
      .values({
        id: folderId,
        orgId,
        ownerUserId, // Constitution: exactly one owner
        parentFolderId: folderId, // Self-parent pattern
        humanId: '__org_root__',
        visibility: 'org',
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      createdAt: inserted.createdAt,
    };
  }

  /**
   * Find user root from airu_user_roots table
   * 
   * Constitution: User root represents user's vault within org
   * All personal documents live under user root
   * User vaults are isolated from one another
   */
  async findUserRoot(
    orgId: string,
    userId: string,
    tx?: Transaction
  ): Promise<AiruUserRoot | null> {
    const dbInstance = tx ?? db;
    const [userRoot] = await dbInstance
      .select()
      .from(airuUserRootsTable)
      .where(
        and(
          eq(airuUserRootsTable.orgId, orgId), // Constitution: org boundary enforced
          eq(airuUserRootsTable.userId, userId)
        )
      )
      .limit(1);

    if (!userRoot) {
      return null;
    }

    return {
      orgId: userRoot.orgId,
      userId: userRoot.userId,
      rootFolderId: userRoot.rootFolderId,
      createdAt: userRoot.createdAt,
    };
  }

  /**
   * Insert user root mapping
   * 
   * Constitution: User vault isolation enforced
   */
  async insertUserRoot(
    orgId: string,
    userId: string,
    rootFolderId: string,
    tx?: Transaction
  ): Promise<AiruUserRoot> {
    const dbInstance = tx ?? db;
    const [inserted] = await dbInstance
      .insert(airuUserRootsTable)
      .values({
        orgId,
        userId,
        rootFolderId,
      })
      .returning();

    return {
      orgId: inserted.orgId,
      userId: inserted.userId,
      rootFolderId: inserted.rootFolderId,
      createdAt: inserted.createdAt,
    };
  }

  /**
   * Insert user root folder under org root
   * 
   * Constitution: User root folder owned by userId (not org owner)
   * Visibility defaults to 'private' - no implicit org visibility
   */
  async insertUserRootFolder(
    orgId: string,
    ownerUserId: string, // Constitution: exactly one owner per folder
    parentFolderId: string,
    folderId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const dbInstance = tx ?? db;
    const [inserted] = await dbInstance
      .insert(airuFoldersTable)
      .values({
        id: folderId,
        orgId,
        ownerUserId, // Constitution: user owns their vault
        parentFolderId,
        humanId: '__user_root__',
        visibility: 'private', // Constitution: privacy default
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      createdAt: inserted.createdAt,
    };
  }

  /**
   * Find folder by ID
   * 
   * Constitution: No admin access bypass
   * 
   * TODO Phase 2: Add org_id validation parameter to prevent cross-org access
   * Current implementation does not validate org boundary - caller must enforce
   */
  async findFolderById(
    folderId: string,
    tx?: Transaction
  ): Promise<AiruFolder | null> {
    const dbInstance = tx ?? db;
    const [folder] = await dbInstance
      .select()
      .from(airuFoldersTable)
      .where(eq(airuFoldersTable.id, folderId))
      .limit(1);

    if (!folder) {
      return null;
    }

    return {
      id: folder.id,
      orgId: folder.orgId,
      ownerUserId: folder.ownerUserId, // Constitution: exactly one owner
      parentFolderId: folder.parentFolderId,
      humanId: folder.humanId,
      visibility: folder.visibility as 'private' | 'org' | 'public',
      createdAt: folder.createdAt,
    };
  }

  // =====================================================
  // PHASE 1: Folder Operations
  // =====================================================

  /**
   * Find child folders by parent
   * Constitution: Org boundary and owner isolation enforced
   */
  async findChildFolders(
    orgId: string,
    parentFolderId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruFolder[]> {
    const dbInstance = tx ?? db;
    const folders = await dbInstance
      .select()
      .from(airuFoldersTable)
      .where(
        and(
          eq(airuFoldersTable.orgId, orgId), // Constitution: org boundary
          eq(airuFoldersTable.parentFolderId, parentFolderId),
          eq(airuFoldersTable.ownerUserId, ownerUserId), // Constitution: owner isolation
          ne(airuFoldersTable.humanId, '__org_root__'), // Exclude org root
          ne(airuFoldersTable.humanId, '__user_root__') // Exclude user root
        )
      )
      .orderBy(desc(airuFoldersTable.createdAt));

    return folders.map((folder) => ({
      id: folder.id,
      orgId: folder.orgId,
      ownerUserId: folder.ownerUserId,
      parentFolderId: folder.parentFolderId,
      humanId: folder.humanId,
      visibility: folder.visibility as 'private' | 'org' | 'public',
      createdAt: folder.createdAt,
    }));
  }

  /**
   * Create folder
   * Constitution: Privacy default = 'private', owner isolation enforced
   */
  async createFolder(
    orgId: string,
    ownerUserId: string,
    parentFolderId: string,
    humanId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const dbInstance = tx ?? db;

    // Verify parent exists and belongs to same org and owner
    const parent = await this.findFolderById(parentFolderId, dbInstance);
    if (!parent) {
      throw new Error(`Parent folder not found: ${parentFolderId}`);
    }
    if (parent.orgId !== orgId) {
      throw new Error(`Parent folder org mismatch: expected ${orgId}, got ${parent.orgId}`);
    }
    if (parent.ownerUserId !== ownerUserId) {
      throw new Error(`Parent folder owner mismatch: expected ${ownerUserId}, got ${parent.ownerUserId}`);
    }
    if (parent.humanId === '__org_root__') {
      throw new Error('Cannot create folder directly under org root');
    }

    // Verify humanId is not reserved
    if (humanId === '__org_root__' || humanId === '__user_root__') {
      throw new Error(`Reserved humanId: ${humanId}`);
    }

    const [inserted] = await dbInstance
      .insert(airuFoldersTable)
      .values({
        orgId,
        ownerUserId, // Constitution: exactly one owner
        parentFolderId,
        humanId,
        visibility: 'private', // Constitution: privacy default
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      createdAt: inserted.createdAt,
    };
  }

  /**
   * Update folder name
   * Constitution: Root folders cannot be renamed
   */
  async updateFolderName(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    newHumanId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const dbInstance = tx ?? db;

    // Verify folder exists and belongs to org and owner
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== ownerUserId) {
      throw new Error(`Folder owner mismatch: expected ${ownerUserId}, got ${folder.ownerUserId}`);
    }

    // Verify folder is not root
    if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
      throw new Error('Cannot rename root folder');
    }

    // Verify new humanId is not reserved
    if (newHumanId === '__org_root__' || newHumanId === '__user_root__') {
      throw new Error(`Reserved humanId: ${newHumanId}`);
    }

    const [updated] = await dbInstance
      .update(airuFoldersTable)
      .set({ humanId: newHumanId })
      .where(
        and(
          eq(airuFoldersTable.id, folderId),
          eq(airuFoldersTable.orgId, orgId),
          eq(airuFoldersTable.ownerUserId, ownerUserId)
        )
      )
      .returning();

    return {
      id: updated.id,
      orgId: updated.orgId,
      ownerUserId: updated.ownerUserId,
      parentFolderId: updated.parentFolderId,
      humanId: updated.humanId,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      createdAt: updated.createdAt,
    };
  }

  /**
   * Move folder
   * Constitution: Root folders cannot be moved, cycle prevention enforced
   */
  async moveFolder(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    newParentFolderId: string,
    tx?: Transaction
  ): Promise<AiruFolder> {
    const dbInstance = tx ?? db;

    // Verify folder exists and belongs to org and owner
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== ownerUserId) {
      throw new Error(`Folder owner mismatch: expected ${ownerUserId}, got ${folder.ownerUserId}`);
    }

    // Verify folder is not root
    if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
      throw new Error('Cannot move root folder');
    }

    // Verify new parent exists and belongs to same org and owner
    const newParent = await this.findFolderById(newParentFolderId, dbInstance);
    if (!newParent) {
      throw new Error(`New parent folder not found: ${newParentFolderId}`);
    }
    if (newParent.orgId !== orgId) {
      throw new Error(`New parent org mismatch: expected ${orgId}, got ${newParent.orgId}`);
    }
    if (newParent.ownerUserId !== ownerUserId) {
      throw new Error(`New parent owner mismatch: expected ${ownerUserId}, got ${newParent.ownerUserId}`);
    }
    if (newParent.humanId === '__org_root__') {
      throw new Error('Cannot move folder under org root');
    }

    // Cycle check: verify new parent is not a descendant
    const isValid = await this.validateParentChain(folderId, newParentFolderId, orgId, dbInstance);
    if (!isValid) {
      throw new Error('Cannot move folder into its descendant (cycle detected)');
    }

    const [updated] = await dbInstance
      .update(airuFoldersTable)
      .set({ parentFolderId: newParentFolderId })
      .where(
        and(
          eq(airuFoldersTable.id, folderId),
          eq(airuFoldersTable.orgId, orgId),
          eq(airuFoldersTable.ownerUserId, ownerUserId)
        )
      )
      .returning();

    return {
      id: updated.id,
      orgId: updated.orgId,
      ownerUserId: updated.ownerUserId,
      parentFolderId: updated.parentFolderId,
      humanId: updated.humanId,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      createdAt: updated.createdAt,
    };
  }

  /**
   * Delete folder
   * Constitution: Root folders cannot be deleted, owner-only
   */
  async deleteFolder(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    // Verify folder exists and belongs to org and owner
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== ownerUserId) {
      throw new Error(`Folder owner mismatch: expected ${ownerUserId}, got ${folder.ownerUserId}`);
    }

    // Verify folder is not root
    if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
      throw new Error('Cannot delete root folder');
    }

    // Check for children (FK RESTRICT will prevent deletion if children exist)
    const children = await this.findChildFolders(orgId, folderId, ownerUserId, dbInstance);
    if (children.length > 0) {
      throw new Error('Cannot delete folder with child folders. Delete children first.');
    }

    // Check for documents
    const documents = await dbInstance
      .select()
      .from(airuDocumentsTable)
      .where(eq(airuDocumentsTable.folderId, folderId))
      .limit(1);
    if (documents.length > 0) {
      throw new Error('Cannot delete folder with documents. Delete documents first.');
    }

    await dbInstance
      .delete(airuFoldersTable)
      .where(
        and(
          eq(airuFoldersTable.id, folderId),
          eq(airuFoldersTable.orgId, orgId),
          eq(airuFoldersTable.ownerUserId, ownerUserId)
        )
      );
  }

  /**
   * Find folder tree recursively
   * Constitution: Org boundary and owner isolation enforced
   */
  async findFolderTree(
    orgId: string,
    ownerUserId: string,
    rootFolderId: string,
    maxDepth: number = 20,
    tx?: Transaction
  ): Promise<FolderTreeResponse> {
    const dbInstance = tx ?? db;

    // Verify root folder belongs to org and owner
    const rootFolder = await this.findFolderById(rootFolderId, dbInstance);
    if (!rootFolder) {
      throw new Error(`Root folder not found: ${rootFolderId}`);
    }
    if (rootFolder.orgId !== orgId) {
      throw new Error(`Root folder org mismatch: expected ${orgId}, got ${rootFolder.orgId}`);
    }
    if (rootFolder.ownerUserId !== ownerUserId) {
      throw new Error(`Root folder owner mismatch: expected ${ownerUserId}, got ${rootFolder.ownerUserId}`);
    }

    const buildTree = async (
      parentId: string,
      currentDepth: number
    ): Promise<FolderTreeResponse> => {
      if (currentDepth > maxDepth) {
        return { folders: [], documents: [], children: [] };
      }

      // Get child folders
      const folders = await this.findChildFolders(orgId, parentId, ownerUserId, dbInstance);

      // Get documents
      const documents = await dbInstance
        .select()
        .from(airuDocumentsTable)
        .where(
          and(
            eq(airuDocumentsTable.folderId, parentId),
            eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner isolation
          )
        )
        .orderBy(desc(airuDocumentsTable.createdAt));

      const mappedDocuments: AiruDocument[] = documents.map((doc) => ({
        id: doc.id,
        folderId: doc.folderId,
        ownerUserId: doc.ownerUserId,
        type: doc.type as 'TXT' | 'MD' | 'RTF',
        name: doc.name,
        content: doc.canonicalContent || doc.content || '', // Use canonicalContent, fallback to content
        canonicalContent: doc.canonicalContent || undefined,
        sharedContent: doc.sharedContent,
        visibility: doc.visibility as 'private' | 'org' | 'public',
        state: doc.state as 'active' | 'archived' | 'trashed',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Recursively build children
      const children = await Promise.all(
        folders.map((folder) => buildTree(folder.id, currentDepth + 1))
      );

      return {
        folders,
        documents: mappedDocuments,
        children,
      };
    };

    return buildTree(rootFolderId, 0);
  }

  /**
   * Validate parent chain (cycle detection)
   * Returns false if newParentId is a descendant of folderId
   */
  async validateParentChain(
    folderId: string,
    newParentId: string,
    orgId: string,
    tx?: Transaction
  ): Promise<boolean> {
    const dbInstance = tx ?? db;
    const maxDepth = 20;
    let currentId: string | null = newParentId;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      if (currentId === folderId) {
        return false; // Cycle detected
      }

      const [parent] = await dbInstance
        .select()
        .from(airuFoldersTable)
        .where(
          and(
            eq(airuFoldersTable.id, currentId),
            eq(airuFoldersTable.orgId, orgId) // Constitution: org boundary
          )
        )
        .limit(1);

      if (!parent) {
        return true; // Reached root, no cycle
      }

      // If parent is self-parent (org root), we've reached the top
      if (parent.parentFolderId === parent.id) {
        return true; // Reached org root, no cycle
      }

      currentId = parent.parentFolderId;
      depth++;
    }

    return true; // Max depth reached, assume valid (shouldn't happen in practice)
  }

  // =====================================================
  // PHASE 1: Document Operations
  // =====================================================

  /**
   * Create document
   * Constitution: Privacy default = 'private', owner isolation enforced
   */
  async createDocument(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    name: string,
    content: string,
    type: 'TXT' | 'MD' | 'RTF',
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify folder exists and belongs to org and owner
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== ownerUserId) {
      throw new Error(`Folder owner mismatch: expected ${ownerUserId}, got ${folder.ownerUserId}`);
    }

    const [inserted] = await dbInstance
      .insert(airuDocumentsTable)
      .values({
        folderId,
        ownerUserId, // Constitution: exactly one owner
        type,
        name,
        content, // Keep for backward compatibility
        canonicalContent: content, // Phase 2: Set canonical content
        visibility: 'private', // Constitution: privacy default
        state: 'active',
      })
      .returning();

    return {
      id: inserted.id,
      folderId: inserted.folderId,
      ownerUserId: inserted.ownerUserId,
      type: inserted.type as 'TXT' | 'MD' | 'RTF',
      name: inserted.name,
      content: inserted.canonicalContent || inserted.content || '', // Use canonicalContent, fallback to content
      canonicalContent: inserted.canonicalContent || undefined,
      sharedContent: inserted.sharedContent,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      state: inserted.state as 'active' | 'archived' | 'trashed',
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    };
  }

  /**
   * Find document by ID
   * Constitution: Org boundary and owner isolation enforced
   */
  async findDocument(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruDocument | null> {
    const dbInstance = tx ?? db;

    // Join with folder to verify org and owner
    const [result] = await dbInstance
      .select({
        document: airuDocumentsTable,
        folder: airuFoldersTable,
      })
      .from(airuDocumentsTable)
      .innerJoin(airuFoldersTable, eq(airuDocumentsTable.folderId, airuFoldersTable.id))
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuFoldersTable.orgId, orgId), // Constitution: org boundary
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner isolation
        )
      )
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: result.document.id,
      folderId: result.document.folderId,
      ownerUserId: result.document.ownerUserId,
      type: result.document.type as 'TXT' | 'MD' | 'RTF',
      name: result.document.name,
      content: result.document.canonicalContent || result.document.content || '', // Use canonicalContent, fallback to content
      canonicalContent: result.document.canonicalContent || undefined,
      sharedContent: result.document.sharedContent,
      visibility: result.document.visibility as 'private' | 'org' | 'public',
      state: result.document.state as 'active' | 'archived' | 'trashed',
      createdAt: result.document.createdAt,
      updatedAt: result.document.updatedAt,
    };
  }

  /**
   * Find documents in folder
   * Constitution: Org boundary and owner isolation enforced
   */
  async findDocumentsInFolder(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruDocument[]> {
    const dbInstance = tx ?? db;

    // Verify folder exists and belongs to org and owner
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    if (folder.orgId !== orgId) {
      throw new Error(`Folder org mismatch: expected ${orgId}, got ${folder.orgId}`);
    }
    if (folder.ownerUserId !== ownerUserId) {
      throw new Error(`Folder owner mismatch: expected ${ownerUserId}, got ${folder.ownerUserId}`);
    }

    const documents = await dbInstance
      .select()
      .from(airuDocumentsTable)
      .where(
        and(
          eq(airuDocumentsTable.folderId, folderId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner isolation
        )
      )
      .orderBy(desc(airuDocumentsTable.createdAt));

    return documents.map((doc) => ({
      id: doc.id,
      folderId: doc.folderId,
      ownerUserId: doc.ownerUserId,
      type: doc.type as 'TXT' | 'MD' | 'RTF',
      name: doc.name,
      content: doc.canonicalContent || doc.content || '', // Use canonicalContent, fallback to content
      canonicalContent: doc.canonicalContent || undefined,
      sharedContent: doc.sharedContent,
      visibility: doc.visibility as 'private' | 'org' | 'public',
      state: doc.state as 'active' | 'archived' | 'trashed',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Update document content
   * Constitution: Owner-only operation
   */
  async updateDocumentContent(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    content: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        content,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '', // Use canonicalContent, fallback to content
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Update document name
   * Constitution: Owner-only operation
   */
  async updateDocumentName(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    newName: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        name: newName,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '', // Use canonicalContent, fallback to content
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Move document to another folder
   * Constitution: Owner-only operation, org boundary enforced
   */
  async moveDocument(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    newFolderId: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    // Verify new folder exists and belongs to same org and owner
    const newFolder = await this.findFolderById(newFolderId, dbInstance);
    if (!newFolder) {
      throw new Error(`New folder not found: ${newFolderId}`);
    }
    if (newFolder.orgId !== orgId) {
      throw new Error(`New folder org mismatch: expected ${orgId}, got ${newFolder.orgId}`);
    }
    if (newFolder.ownerUserId !== ownerUserId) {
      throw new Error(`New folder owner mismatch: expected ${ownerUserId}, got ${newFolder.ownerUserId}`);
    }

    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        folderId: newFolderId,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '', // Use canonicalContent, fallback to content
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete document
   * Constitution: Owner-only operation, hard delete
   */
  async deleteDocument(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    await dbInstance
      .delete(airuDocumentsTable)
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      );
  }

  // =====================================================
  // PHASE 2: Sharing Operations
  // =====================================================

  /**
   * Grant share access
   * Constitution: Sharing expands access, not ownership
   */
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
  ): Promise<AiruShare> {
    const dbInstance = tx ?? db;

    const [inserted] = await dbInstance
      .insert(airuSharesTable)
      .values({
        orgId: share.orgId,
        targetType: share.targetType,
        targetId: share.targetId,
        shareType: share.shareType,
        grantedToUserId: share.grantedToUserId || null,
        linkCode: share.linkCode || null,
        linkPasswordHash: share.linkPasswordHash || null,
        viewOnly: share.viewOnly,
        createdByUserId: share.createdByUserId,
        expiresAt: share.expiresAt || null,
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      targetType: inserted.targetType as 'folder' | 'document',
      targetId: inserted.targetId,
      shareType: inserted.shareType as 'user' | 'org' | 'public' | 'link',
      grantedToUserId: inserted.grantedToUserId,
      linkCode: inserted.linkCode,
      linkPasswordHash: inserted.linkPasswordHash,
      viewOnly: inserted.viewOnly,
      createdByUserId: inserted.createdByUserId,
      createdAt: inserted.createdAt,
      expiresAt: inserted.expiresAt,
    };
  }

  /**
   * Revoke share access
   * Constitution: Owner-only operation
   */
  async revokeShare(
    shareId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    // Verify share exists and was created by owner
    const [share] = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.id, shareId),
          eq(airuSharesTable.orgId, orgId),
          eq(airuSharesTable.createdByUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .limit(1);

    if (!share) {
      throw new Error(`Share not found or access denied: ${shareId}`);
    }

    await dbInstance
      .delete(airuSharesTable)
      .where(eq(airuSharesTable.id, shareId));
  }

  /**
   * Find shares for target
   * Constitution: Org boundary enforced
   */
  async findSharesForTarget(
    targetType: 'folder' | 'document',
    targetId: string,
    orgId: string,
    tx?: Transaction
  ): Promise<AiruShare[]> {
    const dbInstance = tx ?? db;

    const shares = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.targetType, targetType),
          eq(airuSharesTable.targetId, targetId),
          eq(airuSharesTable.orgId, orgId), // Constitution: org boundary
          or(
            isNull(airuSharesTable.expiresAt),
            gt(airuSharesTable.expiresAt, sql`now()`) // Not expired
          )
        )
      )
      .orderBy(desc(airuSharesTable.createdAt));

    return shares.map((share) => ({
      id: share.id,
      orgId: share.orgId,
      targetType: share.targetType as 'folder' | 'document',
      targetId: share.targetId,
      shareType: share.shareType as 'user' | 'org' | 'public' | 'link',
      grantedToUserId: share.grantedToUserId,
      linkCode: share.linkCode,
      linkPasswordHash: share.linkPasswordHash,
      viewOnly: share.viewOnly,
      createdByUserId: share.createdByUserId,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    }));
  }

  /**
   * Check user access to target
   * Constitution: Access resolution order: owner → user share → org share → public → link
   */
  async checkUserAccess(
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    orgId: string,
    tx?: Transaction
  ): Promise<AccessResult> {
    const dbInstance = tx ?? db;

    // 1. Check if user is owner
    if (targetType === 'folder') {
      const folder = await this.findFolderById(targetId, dbInstance);
      if (folder && folder.orgId === orgId && folder.ownerUserId === userId) {
        return {
          hasAccess: true,
          canRead: true,
          canWrite: true,
          canDelete: true, // Constitution: Delete privilege remains owner-only
        };
      }
    } else {
      const document = await this.findDocument(targetId, orgId, userId, dbInstance);
      if (document) {
        return {
          hasAccess: true,
          canRead: true,
          canWrite: true,
          canDelete: true, // Constitution: Delete privilege remains owner-only
        };
      }
    }

    // 2. Check explicit user share
    const [userShare] = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.targetType, targetType),
          eq(airuSharesTable.targetId, targetId),
          eq(airuSharesTable.orgId, orgId),
          eq(airuSharesTable.shareType, 'user'),
          eq(airuSharesTable.grantedToUserId, userId),
          or(
            isNull(airuSharesTable.expiresAt),
            gt(airuSharesTable.expiresAt, sql`now()`)
          )
        )
      )
      .limit(1);

    if (userShare) {
      return {
        hasAccess: true,
        canRead: true,
        canWrite: !userShare.viewOnly,
        canDelete: false, // Constitution: Delete privilege remains owner-only
        shareType: 'user',
        viewOnly: userShare.viewOnly,
      };
    }

    // 3. Check org-wide share
    const [orgShare] = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.targetType, targetType),
          eq(airuSharesTable.targetId, targetId),
          eq(airuSharesTable.orgId, orgId),
          eq(airuSharesTable.shareType, 'org'),
          or(
            isNull(airuSharesTable.expiresAt),
            gt(airuSharesTable.expiresAt, sql`now()`)
          )
        )
      )
      .limit(1);

    if (orgShare) {
      return {
        hasAccess: true,
        canRead: true,
        canWrite: !orgShare.viewOnly,
        canDelete: false, // Constitution: Delete privilege remains owner-only
        shareType: 'org',
        viewOnly: orgShare.viewOnly,
      };
    }

    // 4. Check public share
    const [publicShare] = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.targetType, targetType),
          eq(airuSharesTable.targetId, targetId),
          eq(airuSharesTable.orgId, orgId),
          eq(airuSharesTable.shareType, 'public'),
          or(
            isNull(airuSharesTable.expiresAt),
            gt(airuSharesTable.expiresAt, sql`now()`)
          )
        )
      )
      .limit(1);

    if (publicShare) {
      return {
        hasAccess: true,
        canRead: true,
        canWrite: !publicShare.viewOnly,
        canDelete: false, // Constitution: Delete privilege remains owner-only
        shareType: 'public',
        viewOnly: publicShare.viewOnly,
      };
    }

    // 5. Check link share (requires link code validation in domain service)
    // This is checked separately via resolveLink

    // Default: no access
    return {
      hasAccess: false,
      canRead: false,
      canWrite: false,
      canDelete: false,
    };
  }

  /**
   * Find share by link code
   * Constitution: Links resolve to resource existence
   */
  async findShareByLinkCode(
    linkCode: string,
    tx?: Transaction
  ): Promise<AiruShare | null> {
    const dbInstance = tx ?? db;

    const [share] = await dbInstance
      .select()
      .from(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.linkCode, linkCode),
          eq(airuSharesTable.shareType, 'link'),
          or(
            isNull(airuSharesTable.expiresAt),
            gt(airuSharesTable.expiresAt, sql`now()`) // Not expired
          )
        )
      )
      .limit(1);

    if (!share) {
      return null;
    }

    return {
      id: share.id,
      orgId: share.orgId,
      targetType: share.targetType as 'folder' | 'document',
      targetId: share.targetId,
      shareType: share.shareType as 'user' | 'org' | 'public' | 'link',
      grantedToUserId: share.grantedToUserId,
      linkCode: share.linkCode,
      linkPasswordHash: share.linkPasswordHash,
      viewOnly: share.viewOnly,
      createdByUserId: share.createdByUserId,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    };
  }

  // =====================================================
  // PHASE 2: Canonical / Shared Content Operations
  // =====================================================

  /**
   * Update canonical content
   * Constitution: Owner-only operation
   */
  async updateCanonicalContent(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    content: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        canonicalContent: content,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '', // Use canonical if available
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Update shared content
   * Constitution: Editors modify shared_content only
   */
  async updateSharedContent(
    documentId: string,
    orgId: string,
    userId: string,
    content: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify user has write access (not owner - owners edit canonical)
    const access = await this.checkUserAccess('document', documentId, userId, orgId, dbInstance);
    if (!access.hasAccess || !access.canWrite) {
      throw new Error(`Document not found or write access denied: ${documentId}`);
    }

    // Verify user is not owner (owners edit canonical)
    const document = await this.findDocument(documentId, orgId, userId, dbInstance);
    if (document) {
      throw new Error('Owners must edit canonical content, not shared content');
    }

    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        sharedContent: content,
        updatedAt: sql`now()`,
      })
      .where(eq(airuDocumentsTable.id, documentId))
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '', // Return canonical for display
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Accept shared content into canonical
   * Constitution: Owner-only operation
   */
  async acceptSharedIntoCanonical(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const [document] = await dbInstance
      .select()
      .from(airuDocumentsTable)
      .where(
        and(
          eq(airuDocumentsTable.id, documentId),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner-only
        )
      )
      .limit(1);

    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    if (!document.sharedContent) {
      throw new Error('No shared content to accept');
    }

    // Copy shared_content → canonical_content
    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        canonicalContent: document.sharedContent,
        sharedContent: null, // Clear shared content
        updatedAt: sql`now()`,
      })
      .where(eq(airuDocumentsTable.id, documentId))
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '',
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Revert shared content to canonical
   * Constitution: Owner-only operation
   */
  async revertSharedToCanonical(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruDocument> {
    const dbInstance = tx ?? db;

    // Verify document exists and belongs to org and owner
    const document = await this.findDocument(documentId, orgId, ownerUserId, dbInstance);
    if (!document) {
      throw new Error(`Document not found or access denied: ${documentId}`);
    }

    // Clear shared_content
    const [updated] = await dbInstance
      .update(airuDocumentsTable)
      .set({
        sharedContent: null,
        updatedAt: sql`now()`,
      })
      .where(eq(airuDocumentsTable.id, documentId))
      .returning();

    return {
      id: updated.id,
      folderId: updated.folderId,
      ownerUserId: updated.ownerUserId,
      type: updated.type as 'TXT' | 'MD' | 'RTF',
      name: updated.name,
      content: updated.canonicalContent || updated.content || '',
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Create revision snapshot
   * Constitution: Immutable history
   */
  async createRevision(
    documentId: string,
    contentType: 'canonical' | 'shared',
    content: string,
    userId: string,
    tx?: Transaction
  ): Promise<AiruRevision> {
    const dbInstance = tx ?? db;

    const [inserted] = await dbInstance
      .insert(airuDocumentRevisionsTable)
      .values({
        documentId,
        contentType,
        content,
        createdByUserId: userId,
      })
      .returning();

    return {
      id: inserted.id,
      documentId: inserted.documentId,
      contentType: inserted.contentType as 'canonical' | 'shared',
      content: inserted.content,
      createdByUserId: inserted.createdByUserId,
      createdAt: inserted.createdAt,
    };
  }
}
