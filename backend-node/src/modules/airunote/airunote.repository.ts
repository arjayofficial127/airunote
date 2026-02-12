/**
 * Airunote Repository
 * Pure database access layer for Airunote domain tables
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
  ownerUserId: string;
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
          eq(airuFoldersTable.orgId, orgId),
          eq(airuFoldersTable.humanId, '__org_root__'),
          sql`${airuFoldersTable.parentFolderId} = ${airuFoldersTable.id}`
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
        ownerUserId,
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
          eq(airuUserRootsTable.orgId, orgId),
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
   */
  async insertUserRootFolder(
    orgId: string,
    ownerUserId: string,
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
        ownerUserId,
        parentFolderId,
        humanId: '__user_root__',
        visibility: 'private',
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
      ownerUserId: folder.ownerUserId,
      parentFolderId: folder.parentFolderId,
      humanId: folder.humanId,
      visibility: folder.visibility as 'private' | 'org' | 'public',
      createdAt: folder.createdAt,
    };
  }
}
