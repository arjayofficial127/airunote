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
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  airuFoldersTable,
  airuUserRootsTable,
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
  // TODO Phase 2: Canonical / Shared Split
  // =====================================================
  // 
  // Constitution VI: Each document maintains:
  // - canonical_content (owner-controlled)
  // - shared_content (collaborator-edited)
  //
  // TODO Phase 2: Add methods for:
  // - findDocumentWithCanonical(folderId, documentId)
  // - findDocumentWithShared(folderId, documentId)
  // - updateCanonicalContent(documentId, content, ownerUserId)
  // - updateSharedContent(documentId, content, editorUserId)
  // - acceptSharedIntoCanonical(documentId, ownerUserId)
  // - revertSharedToCanonical(documentId, ownerUserId)
  //
  // Schema changes needed:
  // - airu_documents.canonical_content (text)
  // - airu_documents.shared_content (text, nullable)
  // - airu_document_revisions table (for history)
  //
  // =====================================================
}
