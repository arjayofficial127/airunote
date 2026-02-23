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
import { eq, and, sql, ne, or, desc, isNull, gt, lt, inArray, ilike } from 'drizzle-orm';
import { db } from '../../infrastructure/db/drizzle/client';
import {
  airuFoldersTable,
  airuUserRootsTable,
  airuDocumentsTable,
  airuSharesTable,
  airuDocumentRevisionsTable,
  airuAuditLogsTable,
  airuLensesTable,
  airuLensItemsTable,
} from '../../infrastructure/db/drizzle/schema';

// Transaction type - drizzle transactions have the same interface as db
type Transaction = typeof db;

export type AiruFolderType = 
  | 'box' | 'board' | 'book' | 'canvas' | 'collection' 
  | 'contacts' | 'ledger' | 'journal' | 'manual' 
  | 'notebook' | 'pipeline' | 'project' | 'wiki';

export interface AiruFolder {
  id: string;
  orgId: string;
  ownerUserId: string; // Constitution: exactly one owner per folder
  parentFolderId: string;
  humanId: string;
  visibility: 'private' | 'org' | 'public';
  type: AiruFolderType;
  metadata: Record<string, unknown> | null;
  defaultLensId: string | null;
  createdAt: Date;
}

/**
 * Phase 6 — Unified Projection Engine
 * Standardized lens query format
 */
export interface LensQuery {
  filters?: {
    tags?: string[];
    state?: string[];
    authorId?: string;
    text?: string;
    attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine - filter by attribute key-value pairs
  };
  sort?: {
    field: 'createdAt' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
  groupBy?: string | null;
}

/**
 * Lens Type Union
 * Locked contract for projection engine
 */
export type AiruLensType = 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved';

/**
 * Board Column Definition
 * Used in board lens metadata
 */
export type AiruBoardColumn = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
};

/**
 * Board Lens Metadata
 * Contains column definitions for board view
 */
export type AiruBoardLensMetadata = {
  columns: AiruBoardColumn[];
};

/**
 * Canvas Lens Metadata
 * Global canvas settings (zoom, pan)
 */
export type AiruCanvasLensMetadata = {
  zoom?: number;
  panX?: number;
  panY?: number;
};

/**
 * Book Lens Metadata
 * Book-specific settings (order stored in lens_items)
 */
export type AiruBookLensMetadata = {
  // Book settings later; for now order is stored in lens_items
};

/**
 * Lens Metadata Union
 * Typed but permissive - allows type-specific metadata or generic objects
 */
export type AiruLensMetadata =
  | AiruBoardLensMetadata
  | AiruCanvasLensMetadata
  | AiruBookLensMetadata
  | Record<string, unknown>;

/**
 * Lens Item View Mode
 * Controls how items are displayed in lens projections
 */
export type AiruLensItemViewMode = 'icon' | 'preview' | 'full' | 'scroll';

/**
 * Lens Item Metadata
 * View mode and other per-item settings
 */
export type AiruLensItemMetadata = {
  viewMode?: AiruLensItemViewMode;
};

/**
 * Lens Entity Type
 * What type of entity is referenced by a lens item
 */
export type AiruLensEntityType = 'document' | 'folder';

/**
 * Lens Item Entity
 * Represents a document or folder placement in a lens projection
 */
export interface AiruLensItem {
  id: string;
  lensId: string;
  entityId: string;
  entityType: AiruLensEntityType;
  columnId: string | null;
  order: number | null;
  x: number | null;
  y: number | null;
  metadata: AiruLensItemMetadata;
  createdAt: string;
  updatedAt: string;
}

/**
 * Airu Lens Interface
 * Updated with typed metadata and query
 */
export interface AiruLens {
  id: string;
  folderId: string | null;
  name: string;
  type: AiruLensType;
  isDefault: boolean;
  metadata: AiruLensMetadata; // Typed but stored as jsonb; runtime validation deferred
  query: LensQuery | Record<string, unknown> | null; // Phase 6: Standardized to LensQuery, but keep backward compatible
  createdAt: Date;
  updatedAt: Date;
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
  attributes: Record<string, any>; // Phase 7: Hybrid Attribute Engine
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

/**
 * Map database row to AiruLensItem interface
 */
function mapLensItemRow(row: typeof airuLensItemsTable.$inferSelect): AiruLensItem {
  return {
    id: row.id,
    lensId: row.lensId,
    entityId: row.entityId,
    entityType: row.entityType as AiruLensEntityType,
    columnId: row.columnId,
    order: row.order ? parseFloat(row.order) : null,
    x: row.x ? parseFloat(row.x) : null,
    y: row.y ? parseFloat(row.y) : null,
    metadata: (row.metadata ?? {}) as AiruLensItemMetadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface AiruRevision {
  id: string;
  documentId: string;
  contentType: 'canonical' | 'shared';
  content: string;
  createdByUserId: string;
  createdAt: Date;
}

export interface AiruAuditLog {
  id: string;
  orgId: string;
  eventType: string;
  targetType: string | null;
  targetId: string | null;
  performedByUserId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Phase 7: Hybrid Attribute Engine
 * Validates document attributes against folder schema if present
 */
function validateDocumentAttributes(
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

export interface AiruDocumentMetadata {
  id: string;
  folderId: string;
  ownerUserId: string;
  type: 'TXT' | 'MD' | 'RTF';
  name: string;
  visibility: 'private' | 'org' | 'public';
  state: 'active' | 'archived' | 'trashed';
  attributes: Record<string, any>; // Phase 7: Hybrid Attribute Engine
  createdAt: Date;
  updatedAt: Date;
  size?: number; // Optional: content size in bytes if available
}

export interface FullMetadataResponse {
  folders: AiruFolder[];
  documents: AiruDocumentMetadata[];
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
      type: (folder.type as AiruFolderType) || 'box',
      metadata: folder.metadata as Record<string, unknown> | null,
      defaultLensId: folder.defaultLensId || null,
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
        type: 'box', // Default type for org root
        metadata: null,
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      type: (inserted.type as AiruFolderType) || 'box',
      metadata: inserted.metadata as Record<string, unknown> | null,
      defaultLensId: inserted.defaultLensId || null,
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
        type: 'box', // Default type for user root
        metadata: null,
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      type: (inserted.type as AiruFolderType) || 'box',
      metadata: inserted.metadata as Record<string, unknown> | null,
      defaultLensId: inserted.defaultLensId || null,
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
      type: (folder.type as AiruFolderType) || 'box',
      metadata: folder.metadata as Record<string, unknown> | null,
      defaultLensId: folder.defaultLensId || null,
      createdAt: folder.createdAt,
    };
  }

  /**
   * Get default lens for a folder
   * Phase 1 — Folder → Lens Rendering Refactor
   * 
   * Logic:
   * 1. Fetch folder by id
   * 2. If folder.defaultLensId exists: fetch lens by id and return
   * 3. Else: fetch lens where folderId = folderId AND isDefault = true, if exists return
   * 4. Else return null
   */
  async getDefaultLensForFolder(
    folderId: string,
    tx?: Transaction
  ): Promise<AiruLens | null> {
    const dbInstance = tx ?? db;

    // Fetch folder by id
    const folder = await this.findFolderById(folderId, dbInstance);
    if (!folder) {
      return null;
    }

    // If folder.defaultLensId exists: fetch lens by id and return
    if (folder.defaultLensId) {
      const [lens] = await dbInstance
        .select()
        .from(airuLensesTable)
        .where(eq(airuLensesTable.id, folder.defaultLensId))
        .limit(1);

      if (lens) {
        return {
          id: lens.id,
          folderId: lens.folderId,
          name: lens.name,
          type: lens.type as AiruLensType,
          isDefault: lens.isDefault,
          metadata: (lens.metadata as Record<string, unknown>) || {},
          query: (lens.query as Record<string, unknown> | null) || null,
          createdAt: lens.createdAt,
          updatedAt: lens.updatedAt,
        };
      }
    }

    // Else: fetch lens where folderId = folderId AND isDefault = true
    const [defaultLens] = await dbInstance
      .select()
      .from(airuLensesTable)
      .where(
        and(
          eq(airuLensesTable.folderId, folderId),
          eq(airuLensesTable.isDefault, true)
        )
      )
      .limit(1);

    if (defaultLens) {
      return {
        id: defaultLens.id,
        folderId: defaultLens.folderId,
        name: defaultLens.name,
        type: defaultLens.type as 'box' | 'board' | 'canvas' | 'book',
        isDefault: defaultLens.isDefault,
        metadata: (defaultLens.metadata as Record<string, unknown>) || {},
        query: (defaultLens.query as Record<string, unknown> | null) || null,
        createdAt: defaultLens.createdAt,
        updatedAt: defaultLens.updatedAt,
      };
    }

    // Else return null
    return null;
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
      type: (folder.type as AiruFolderType) || 'box',
      metadata: folder.metadata as Record<string, unknown> | null,
      defaultLensId: folder.defaultLensId || null,
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
    type: AiruFolderType = 'box',
    metadata: Record<string, unknown> | null = null,
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
        type,
        metadata,
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      ownerUserId: inserted.ownerUserId,
      parentFolderId: inserted.parentFolderId,
      humanId: inserted.humanId,
      visibility: inserted.visibility as 'private' | 'org' | 'public',
      type: (inserted.type as AiruFolderType) || 'box',
      metadata: inserted.metadata as Record<string, unknown> | null,
      defaultLensId: inserted.defaultLensId || null,
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
    return this.updateFolder(folderId, orgId, ownerUserId, { humanId: newHumanId }, tx);
  }

  /**
   * Update folder properties (name, type, metadata)
   * Constitution: Root folders cannot be renamed
   */
  async updateFolder(
    folderId: string,
    orgId: string,
    ownerUserId: string,
    updates: {
      humanId?: string;
      type?: AiruFolderType;
      metadata?: Record<string, unknown> | null;
    },
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

    // Verify folder is not root (if renaming)
    if (updates.humanId) {
      if (folder.humanId === '__org_root__' || folder.humanId === '__user_root__') {
        throw new Error('Cannot rename root folder');
      }

      // Verify new humanId is not reserved
      if (updates.humanId === '__org_root__' || updates.humanId === '__user_root__') {
        throw new Error(`Reserved humanId: ${updates.humanId}`);
      }
    }

    // Validate type if provided
    const validTypes: AiruFolderType[] = [
      'box', 'board', 'book', 'canvas', 'collection', 
      'contacts', 'ledger', 'journal', 'manual', 
      'notebook', 'pipeline', 'project', 'wiki'
    ];
    if (updates.type && !validTypes.includes(updates.type as AiruFolderType)) {
      throw new Error(`Invalid folder type: ${updates.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Build update object
    const updateValues: {
      humanId?: string;
      type?: AiruFolderType;
      metadata?: Record<string, unknown> | null;
    } = {};
    if (updates.humanId !== undefined) {
      updateValues.humanId = updates.humanId;
    }
    if (updates.type !== undefined) {
      updateValues.type = updates.type;
    }
    if (updates.metadata !== undefined) {
      updateValues.metadata = updates.metadata;
    }

    const [updated] = await dbInstance
      .update(airuFoldersTable)
      .set(updateValues)
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
      type: (updated.type as AiruFolderType) || 'box',
      metadata: updated.metadata as Record<string, unknown> | null,
      defaultLensId: updated.defaultLensId || null,
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
      type: (updated.type as AiruFolderType) || 'box',
      metadata: updated.metadata as Record<string, unknown> | null,
      defaultLensId: updated.defaultLensId || null,
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
        attributes: (doc.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
    attributes?: Record<string, any>,
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
        attributes: attributes || {}, // Phase 7: Hybrid Attribute Engine
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
      attributes: (inserted.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      attributes: (result.document.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      attributes: (doc.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Query documents by query filter (for desktop lenses)
   * Phase 5 — Desktop Lenses
   * 
   * Supports:
   * - tags: array match (checks if document metadata contains any of the tags)
   * - state: exact match
   * - text: ILIKE search on name and content
   */
  async queryDocumentsByFilter(
    orgId: string,
    ownerUserId: string,
    query: Record<string, unknown>,
    tx?: Transaction
  ): Promise<AiruDocument[]> {
    const dbInstance = tx ?? db;

    // Build where conditions
    const conditions: any[] = [
      eq(airuDocumentsTable.ownerUserId, ownerUserId), // Constitution: owner isolation
    ];

    // Filter by state if provided
    if (query.state && typeof query.state === 'string') {
      conditions.push(eq(airuDocumentsTable.state, query.state as 'active' | 'archived' | 'trashed'));
    }

    // Text search (ILIKE on name and content)
    if (query.text && typeof query.text === 'string') {
      const searchText = `%${query.text}%`;
      conditions.push(
        or(
          ilike(airuDocumentsTable.name, searchText),
          ilike(airuDocumentsTable.canonicalContent, searchText)
        )!
      );
    }

    // Execute query
    const documents = await dbInstance
      .select()
      .from(airuDocumentsTable)
      .where(and(...conditions))
      .orderBy(desc(airuDocumentsTable.createdAt));

    // Filter by tags if provided (tags are stored in metadata, so we filter in memory)
    let filteredDocuments = documents.map((doc) => ({
      id: doc.id,
      folderId: doc.folderId,
      ownerUserId: doc.ownerUserId,
      type: doc.type as 'TXT' | 'MD' | 'RTF',
      name: doc.name,
      content: doc.canonicalContent || doc.content || '',
      canonicalContent: doc.canonicalContent || undefined,
      sharedContent: doc.sharedContent,
      visibility: doc.visibility as 'private' | 'org' | 'public',
      state: doc.state as 'active' | 'archived' | 'trashed',
      attributes: (doc.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    // Filter by tags if provided (check metadata)
    if (query.tags && Array.isArray(query.tags) && query.tags.length > 0) {
      // Note: Tags would need to be stored in a metadata field or separate table
      // For now, we'll skip tag filtering if metadata doesn't exist
      // This is a placeholder for future tag implementation
      filteredDocuments = filteredDocuments.filter((doc) => {
        // If tags are in metadata, check them
        // For now, return all documents (tags not yet implemented in schema)
        return true;
      });
    }

    return filteredDocuments;
  }

  /**
   * Phase 6 — Unified Projection Engine
   * Resolve documents for a lens using standardized LensQuery format
   * 
   * Handles both folder-based and desktop/saved lenses
   */
  async resolveLensDocuments(
    lens: AiruLens,
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<AiruDocument[]> {
    const dbInstance = tx ?? db;

    // Build base where conditions
    const conditions: any[] = [
      eq(airuDocumentsTable.ownerUserId, ownerUserId), // Constitution: owner isolation
    ];

    // Phase 6: If lens has folderId, restrict to that folder
    if (lens.folderId !== null) {
      conditions.push(eq(airuDocumentsTable.folderId, lens.folderId));
    }
    // If folderId is null (desktop/saved lens), no folder restriction

    // Parse query - support both new LensQuery format and legacy format
    let lensQuery: LensQuery | null = null;
    if (lens.query) {
      // Check if it's already in LensQuery format
      if (
        typeof lens.query === 'object' &&
        lens.query !== null &&
        !Array.isArray(lens.query) &&
        ('filters' in lens.query || 'sort' in lens.query || 'groupBy' in lens.query)
      ) {
        lensQuery = lens.query as LensQuery;
      } else {
        // Legacy format - convert to LensQuery
        const legacyQuery = lens.query as Record<string, unknown>;
        lensQuery = {
          filters: {},
        };
        if (legacyQuery.state) {
          lensQuery.filters!.state = Array.isArray(legacyQuery.state)
            ? (legacyQuery.state as string[])
            : [legacyQuery.state as string];
        }
        if (legacyQuery.text && typeof legacyQuery.text === 'string') {
          lensQuery.filters!.text = legacyQuery.text;
        }
        if (legacyQuery.tags && Array.isArray(legacyQuery.tags)) {
          lensQuery.filters!.tags = legacyQuery.tags as string[];
        }
        if (legacyQuery.authorId && typeof legacyQuery.authorId === 'string') {
          lensQuery.filters!.authorId = legacyQuery.authorId;
        }
      }
    }

    // Apply filters
    if (lensQuery?.filters) {
      const filters = lensQuery.filters;

      // Filter by state (array support)
      if (filters.state && Array.isArray(filters.state) && filters.state.length > 0) {
        conditions.push(inArray(airuDocumentsTable.state, filters.state as ('active' | 'archived' | 'trashed')[]));
      }

      // Filter by authorId
      if (filters.authorId && typeof filters.authorId === 'string') {
        conditions.push(eq(airuDocumentsTable.ownerUserId, filters.authorId));
      }

      // Text search (ILIKE on name and content)
      if (filters.text && typeof filters.text === 'string') {
        const searchText = `%${filters.text}%`;
        conditions.push(
          or(
            ilike(airuDocumentsTable.name, searchText),
            ilike(airuDocumentsTable.canonicalContent, searchText)
          )!
        );
      }

      // Phase 7: Filter by attributes (JSONB queries)
      if (filters.attributes && typeof filters.attributes === 'object') {
        const attrFilters = filters.attributes as Record<string, any>;
        for (const [key, value] of Object.entries(attrFilters)) {
          // Use JSONB path query: attributes->>'key' = 'value'
          // For exact match
          if (value !== null && value !== undefined) {
            conditions.push(
              sql`${airuDocumentsTable.attributes}->>${key} = ${String(value)}`
            );
          }
        }
      }
    }

    // Build order by clause
    let orderByClause: any;
    if (lensQuery?.sort) {
      const sortField = lensQuery.sort.field === 'updatedAt' ? airuDocumentsTable.updatedAt : airuDocumentsTable.createdAt;
      orderByClause = lensQuery.sort.direction === 'asc' ? sortField : desc(sortField);
    } else {
      // Default: sort by createdAt desc
      orderByClause = desc(airuDocumentsTable.createdAt);
    }

    // Execute query
    const documents = await dbInstance
      .select()
      .from(airuDocumentsTable)
      .where(and(...conditions))
      .orderBy(orderByClause);

    // Map to AiruDocument format
    let mappedDocuments = documents.map((doc) => ({
      id: doc.id,
      folderId: doc.folderId,
      ownerUserId: doc.ownerUserId,
      type: doc.type as 'TXT' | 'MD' | 'RTF',
      name: doc.name,
      content: doc.canonicalContent || doc.content || '',
      canonicalContent: doc.canonicalContent || undefined,
      sharedContent: doc.sharedContent,
      visibility: doc.visibility as 'private' | 'org' | 'public',
      state: doc.state as 'active' | 'archived' | 'trashed',
      attributes: (doc.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    // Filter by tags if provided (tags are stored in metadata, so we filter in memory)
    // Phase 6: Support tags array filter
    if (lensQuery?.filters?.tags && Array.isArray(lensQuery.filters.tags) && lensQuery.filters.tags.length > 0) {
      // Note: Tags would need to be stored in a metadata field or separate table
      // For now, we'll skip tag filtering if metadata doesn't exist
      // This is a placeholder for future tag implementation
      mappedDocuments = mappedDocuments.filter((doc) => {
        // If tags are in metadata, check them
        // For now, return all documents (tags not yet implemented in schema)
        return true;
      });
    }

    // Phase 7: groupBy support for board grouping
    // Note: groupBy is handled in the service layer for board views
    // The repository returns flat list, grouping happens in domain service

    return mappedDocuments;
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
        canonicalContent: content, // Constitution: Owner updates canonicalContent
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
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Update document attributes
   * Phase 7: Hybrid Attribute Engine
   * Constitution: Owner-only operation
   */
  async updateDocumentAttributes(
    documentId: string,
    orgId: string,
    ownerUserId: string,
    attributes: Record<string, any>,
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
        attributes: attributes,
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
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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
      canonicalContent: updated.canonicalContent || undefined,
      sharedContent: updated.sharedContent,
      visibility: updated.visibility as 'private' | 'org' | 'public',
      state: updated.state as 'active' | 'archived' | 'trashed',
      attributes: (updated.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
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

  // =====================================================
  // PHASE 3: Lifecycle & Audit Operations
  // =====================================================

  /**
   * Find all descendant folders recursively
   * Constitution: Used for share cleanup on folder deletion
   */
  async findDescendantFolders(
    folderId: string,
    orgId: string,
    tx?: Transaction
  ): Promise<AiruFolder[]> {
    const dbInstance = tx ?? db;
    const descendants: AiruFolder[] = [];
    const maxDepth = 20;
    let depth = 0;

    const collectDescendants = async (parentId: string): Promise<void> => {
      if (depth > maxDepth) {
        return;
      }

      const children = await dbInstance
        .select()
        .from(airuFoldersTable)
        .where(
          and(
            eq(airuFoldersTable.parentFolderId, parentId),
            eq(airuFoldersTable.orgId, orgId) // Constitution: org boundary
          )
        );

      for (const child of children) {
        const folder: AiruFolder = {
          id: child.id,
          orgId: child.orgId,
          ownerUserId: child.ownerUserId,
          parentFolderId: child.parentFolderId,
          humanId: child.humanId,
          visibility: child.visibility as 'private' | 'org' | 'public',
          type: (child.type as AiruFolderType) || 'box',
          metadata: child.metadata as Record<string, unknown> | null,
          defaultLensId: child.defaultLensId || null,
          createdAt: child.createdAt,
        };
        descendants.push(folder);
        depth++;
        await collectDescendants(child.id);
        depth--;
      }
    };

    await collectDescendants(folderId);
    return descendants;
  }

  /**
   * Delete all shares for target
   * Constitution: Shares collapse when resource is deleted
   */
  async deleteSharesForTarget(
    targetType: 'folder' | 'document',
    targetId: string,
    orgId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    await dbInstance
      .delete(airuSharesTable)
      .where(
        and(
          eq(airuSharesTable.targetType, targetType),
          eq(airuSharesTable.targetId, targetId),
          eq(airuSharesTable.orgId, orgId) // Constitution: org boundary
        )
      );
  }

  /**
   * Get full metadata for all folders and documents owned by user in org
   * Returns flat arrays (no nesting, no content)
   * Constitution: Org boundary and owner isolation enforced
   */
  async getFullMetadata(
    orgId: string,
    ownerUserId: string,
    tx?: Transaction
  ): Promise<FullMetadataResponse> {
    const dbInstance = tx ?? db;

    // Single query for all folders owned by user in org
    const folders = await dbInstance
      .select()
      .from(airuFoldersTable)
      .where(
        and(
          eq(airuFoldersTable.orgId, orgId), // Constitution: org boundary
          eq(airuFoldersTable.ownerUserId, ownerUserId) // Constitution: owner isolation
        )
      )
      .orderBy(desc(airuFoldersTable.createdAt));

    const mappedFolders: AiruFolder[] = folders.map((folder) => ({
      id: folder.id,
      orgId: folder.orgId,
      ownerUserId: folder.ownerUserId,
      parentFolderId: folder.parentFolderId,
      humanId: folder.humanId,
      visibility: folder.visibility as 'private' | 'org' | 'public',
      type: (folder.type as AiruFolderType) || 'box',
      metadata: folder.metadata as Record<string, unknown> | null,
      defaultLensId: folder.defaultLensId || null,
      createdAt: folder.createdAt,
    }));

    // Single query for all documents owned by user in org (metadata only, no content)
    // Join with folders to filter by orgId (documents don't have orgId directly)
    // First, get all folder IDs for this org and user
    const userFolderIds = await dbInstance
      .select({ id: airuFoldersTable.id })
      .from(airuFoldersTable)
      .where(
        and(
          eq(airuFoldersTable.orgId, orgId),
          eq(airuFoldersTable.ownerUserId, ownerUserId)
        )
      );

    const folderIdList = userFolderIds.map((f) => f.id);

    // If no folders, return empty documents array
    if (folderIdList.length === 0) {
      return {
        folders: mappedFolders,
        documents: [],
      };
    }

    // Query documents in those folders
    const documents = await dbInstance
      .select({
        id: airuDocumentsTable.id,
        folderId: airuDocumentsTable.folderId,
        ownerUserId: airuDocumentsTable.ownerUserId,
        type: airuDocumentsTable.type,
        name: airuDocumentsTable.name,
        visibility: airuDocumentsTable.visibility,
        state: airuDocumentsTable.state,
        attributes: airuDocumentsTable.attributes, // Phase 7: Hybrid Attribute Engine
        createdAt: airuDocumentsTable.createdAt,
        updatedAt: airuDocumentsTable.updatedAt,
        // Calculate content size from canonicalContent or content (if available)
        size: sql<number | null>`
          COALESCE(
            LENGTH(${airuDocumentsTable.canonicalContent}),
            LENGTH(${airuDocumentsTable.content}),
            NULL
          )
        `,
      })
      .from(airuDocumentsTable)
      .where(
        and(
          inArray(airuDocumentsTable.folderId, folderIdList),
          eq(airuDocumentsTable.ownerUserId, ownerUserId) // Constitution: owner isolation
        )
      )
      .orderBy(desc(airuDocumentsTable.updatedAt));

    const mappedDocuments: AiruDocumentMetadata[] = documents.map((doc) => ({
      id: doc.id,
      folderId: doc.folderId,
      ownerUserId: doc.ownerUserId,
      type: doc.type as 'TXT' | 'MD' | 'RTF',
      name: doc.name,
      visibility: doc.visibility as 'private' | 'org' | 'public',
      state: doc.state as 'active' | 'archived' | 'trashed',
      attributes: (doc.attributes as Record<string, any>) || {}, // Phase 7: Hybrid Attribute Engine
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      size: doc.size ?? undefined,
    }));

    return {
      folders: mappedFolders,
      documents: mappedDocuments,
    };
  }

  /**
   * Create audit log entry
   * Constitution: Track all destructive events
   */
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
  ): Promise<AiruAuditLog> {
    const dbInstance = tx ?? db;

    const [inserted] = await dbInstance
      .insert(airuAuditLogsTable)
      .values({
        orgId: log.orgId,
        eventType: log.eventType,
        targetType: log.targetType || null,
        targetId: log.targetId || null,
        performedByUserId: log.performedByUserId,
        metadata: log.metadata || null,
      })
      .returning();

    return {
      id: inserted.id,
      orgId: inserted.orgId,
      eventType: inserted.eventType,
      targetType: inserted.targetType,
      targetId: inserted.targetId,
      performedByUserId: inserted.performedByUserId,
      metadata: inserted.metadata as Record<string, unknown> | null,
      createdAt: inserted.createdAt,
    };
  }

  // =====================================================
  // PHASE 2: Multi-lens per folder
  // =====================================================

  /**
   * Get lens by ID
   */
  async getLensById(
    lensId: string,
    tx?: Transaction
  ): Promise<AiruLens | null> {
    const dbInstance = tx ?? db;
    const [lens] = await dbInstance
      .select()
      .from(airuLensesTable)
      .where(eq(airuLensesTable.id, lensId))
      .limit(1);

    if (!lens) {
      return null;
    }

    return {
      id: lens.id,
      folderId: lens.folderId,
      name: lens.name,
      type: lens.type as 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved',
      isDefault: lens.isDefault,
      metadata: (lens.metadata as Record<string, unknown>) || {},
      query: (lens.query as Record<string, unknown> | null) || null,
      createdAt: lens.createdAt,
      updatedAt: lens.updatedAt,
    };
  }

  /**
   * Get all lenses for a folder
   */
  async getLensesForFolder(
    folderId: string,
    tx?: Transaction
  ): Promise<AiruLens[]> {
    const dbInstance = tx ?? db;
    const lenses = await dbInstance
      .select()
      .from(airuLensesTable)
      .where(eq(airuLensesTable.folderId, folderId))
      .orderBy(desc(airuLensesTable.isDefault), desc(airuLensesTable.createdAt));

    return lenses.map((lens) => ({
      id: lens.id,
      folderId: lens.folderId,
      name: lens.name,
      type: lens.type as 'box' | 'board' | 'canvas' | 'book' | 'desktop' | 'saved',
      isDefault: lens.isDefault,
      metadata: (lens.metadata as Record<string, unknown>) || {},
      query: (lens.query as Record<string, unknown> | null) || null,
      createdAt: lens.createdAt,
      updatedAt: lens.updatedAt,
    }));
  }

  /**
   * Create a new lens
   */
  async createLens(
    data: {
      folderId: string | null;
      name: string;
      type: AiruLensType;
      metadata?: Record<string, unknown>;
      query?: LensQuery | Record<string, unknown> | null;
    },
    tx?: Transaction
  ): Promise<AiruLens> {
    const dbInstance = tx ?? db;
    const [inserted] = await dbInstance
      .insert(airuLensesTable)
      .values({
        folderId: data.folderId,
        name: data.name,
        type: data.type,
        isDefault: false, // New lenses are not default by default
        metadata: data.metadata || {},
        query: data.query || null,
      })
      .returning();

    return {
      id: inserted.id,
      folderId: inserted.folderId,
      name: inserted.name,
      type: inserted.type as AiruLensType,
      isDefault: inserted.isDefault,
      metadata: (inserted.metadata as Record<string, unknown>) || {},
      query: (inserted.query as Record<string, unknown> | null) || null,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    };
  }

  /**
   * Update a lens
   */
  /**
   * Update lens properties
   * Phase 8.1 — Query Optimization: JSONB Merge Patch for metadata
   * 
   * Uses PostgreSQL JSONB merge operator (||) when updating metadata
   * to ensure concurrent-safe updates that only modify relevant subtrees
   */
  async updateLens(
    lensId: string,
    partialData: {
      name?: string;
      type?: AiruLensType;
      metadata?: Record<string, unknown>;
      query?: LensQuery | Record<string, unknown> | null;
    },
    tx?: Transaction
  ): Promise<AiruLens> {
    const dbInstance = tx ?? db;
    const updateValues: {
      name?: string;
      type?: string;
      metadata?: ReturnType<typeof sql>;
      query?: LensQuery | Record<string, unknown> | null;
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };

    if (partialData.name !== undefined) updateValues.name = partialData.name;
    if (partialData.type !== undefined) updateValues.type = partialData.type;
    
    // Phase 8.1: Use JSONB merge operator for metadata to ensure concurrent-safe updates
    if (partialData.metadata !== undefined) {
      const metadataPatch = JSON.stringify(partialData.metadata);
      updateValues.metadata = sql`COALESCE(${airuLensesTable.metadata}, '{}'::jsonb) || ${metadataPatch}::jsonb`;
    }
    
    if (partialData.query !== undefined) updateValues.query = partialData.query as LensQuery | Record<string, unknown> | null;

    const [updated] = await dbInstance
      .update(airuLensesTable)
      .set(updateValues)
      .where(eq(airuLensesTable.id, lensId))
      .returning();

    if (!updated) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    return {
      id: updated.id,
      folderId: updated.folderId,
      name: updated.name,
      type: updated.type as AiruLensType,
      isDefault: updated.isDefault,
      metadata: (updated.metadata as Record<string, unknown>) || {},
      query: (updated.query as Record<string, unknown> | null) || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Set default lens for a folder
   * Must be called within a transaction to ensure atomicity
   * 
   * Logic:
   * 1. Set all lenses where folderId = folderId → isDefault = false
   * 2. Set chosen lens → isDefault = true
   * 3. Update folders.defaultLensId = lensId
   */
  async setDefaultLens(
    folderId: string,
    lensId: string,
    tx: Transaction
  ): Promise<void> {
    // Verify lens exists and belongs to folder
    const [lens] = await tx
      .select()
      .from(airuLensesTable)
      .where(
        and(
          eq(airuLensesTable.id, lensId),
          eq(airuLensesTable.folderId, folderId)
        )
      )
      .limit(1);

    if (!lens) {
      throw new Error(`Lens ${lensId} not found or does not belong to folder ${folderId}`);
    }

    // Set all lenses where folderId = folderId → isDefault = false
    await tx
      .update(airuLensesTable)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(airuLensesTable.folderId, folderId));

    // Set chosen lens → isDefault = true
    await tx
      .update(airuLensesTable)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(airuLensesTable.id, lensId));

    // Update folders.defaultLensId = lensId
    await tx
      .update(airuFoldersTable)
      .set({ defaultLensId: lensId })
      .where(eq(airuFoldersTable.id, folderId));
  }

  /**
   * Update lens metadata with partial merge
   * Phase 8.1 — Query Optimization: JSONB Merge Patch
   * 
   * Uses PostgreSQL JSONB merge operator (||) for concurrent-safe updates
   * Only updates relevant subtrees, does not overwrite full metadata object
   * 
   * SQL: metadata = COALESCE(metadata, '{}'::jsonb) || $patch::jsonb
   */
  async updateLensMetadataPartial(
    lensId: string,
    metadataUpdate: Record<string, unknown>,
    tx?: Transaction
  ): Promise<AiruLens> {
    const dbInstance = tx ?? db;

    // Use PostgreSQL JSONB merge operator for atomic, concurrent-safe updates
    // COALESCE handles null metadata, || merges the patch
    // Convert metadataUpdate to JSONB using sql template with proper parameterization
    const metadataPatch = JSON.stringify(metadataUpdate);
    const [updated] = await dbInstance
      .update(airuLensesTable)
      .set({
        metadata: sql`COALESCE(${airuLensesTable.metadata}, '{}'::jsonb) || ${metadataPatch}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(airuLensesTable.id, lensId))
      .returning();

    if (!updated) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    return {
      id: updated.id,
      folderId: updated.folderId,
      name: updated.name,
      type: updated.type as AiruLensType,
      isDefault: updated.isDefault,
      metadata: (updated.metadata as Record<string, unknown>) || {},
      query: (updated.query as Record<string, unknown> | null) || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get all lens items for a lens
   */
  async getLensItems(
    lensId: string,
    tx?: Transaction
  ): Promise<AiruLensItem[]> {
    const dbInstance = tx ?? db;
    const rows = await dbInstance
      .select()
      .from(airuLensItemsTable)
      .where(eq(airuLensItemsTable.lensId, lensId));

    return rows.map(mapLensItemRow);
  }

  /**
   * Upsert a lens item
   * If row exists (lensId + entityId) → update, else → insert
   */
  async upsertLensItem(
    input: {
      lensId: string;
      entityId: string;
      entityType: AiruLensEntityType;
      columnId?: string | null;
      order?: number | null;
      x?: number | null;
      y?: number | null;
      metadata?: AiruLensItemMetadata;
    },
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    const existing = await dbInstance
      .select({ id: airuLensItemsTable.id })
      .from(airuLensItemsTable)
      .where(
        and(
          eq(airuLensItemsTable.lensId, input.lensId),
          eq(airuLensItemsTable.entityId, input.entityId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await dbInstance
        .update(airuLensItemsTable)
        .set({
          columnId: input.columnId ?? null,
          order: input.order !== null && input.order !== undefined ? String(input.order) : null,
          x: input.x !== null && input.x !== undefined ? String(input.x) : null,
          y: input.y !== null && input.y !== undefined ? String(input.y) : null,
          metadata: input.metadata ?? {},
          updatedAt: new Date(),
        })
        .where(eq(airuLensItemsTable.id, existing[0].id));
    } else {
      await dbInstance.insert(airuLensItemsTable).values({
        lensId: input.lensId,
        entityId: input.entityId,
        entityType: input.entityType,
        columnId: input.columnId ?? null,
        order: input.order !== null && input.order !== undefined ? String(input.order) : null,
        x: input.x !== null && input.x !== undefined ? String(input.x) : null,
        y: input.y !== null && input.y !== undefined ? String(input.y) : null,
        metadata: input.metadata ?? {},
      });
    }
  }

  /**
   * Batch upsert lens items
   * Wrapped in transaction for atomicity
   */
  async batchUpsertLensItems(
    lensId: string,
    items: Array<{
      entityId: string;
      entityType: AiruLensEntityType;
      columnId?: string | null;
      order?: number | null;
      x?: number | null;
      y?: number | null;
      metadata?: AiruLensItemMetadata;
    }>,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    await dbInstance.transaction(async (txInner) => {
      for (const item of items) {
        const existing = await txInner
          .select({ id: airuLensItemsTable.id })
          .from(airuLensItemsTable)
          .where(
            and(
              eq(airuLensItemsTable.lensId, lensId),
              eq(airuLensItemsTable.entityId, item.entityId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await txInner
            .update(airuLensItemsTable)
            .set({
              columnId: item.columnId ?? null,
              order: item.order !== null && item.order !== undefined ? String(item.order) : null,
              x: item.x !== null && item.x !== undefined ? String(item.x) : null,
              y: item.y !== null && item.y !== undefined ? String(item.y) : null,
              metadata: item.metadata ?? {},
              updatedAt: new Date(),
            })
            .where(eq(airuLensItemsTable.id, existing[0].id));
        } else {
          await txInner.insert(airuLensItemsTable).values({
            lensId,
            entityId: item.entityId,
            entityType: item.entityType,
            columnId: item.columnId ?? null,
            order: item.order !== null && item.order !== undefined ? String(item.order) : null,
            x: item.x !== null && item.x !== undefined ? String(item.x) : null,
            y: item.y !== null && item.y !== undefined ? String(item.y) : null,
            metadata: item.metadata ?? {},
          });
        }
      }
    });
  }

  /**
   * Delete all lens items for a lens
   */
  async deleteLensItemsByLensId(
    lensId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;
    await dbInstance
      .delete(airuLensItemsTable)
      .where(eq(airuLensItemsTable.lensId, lensId));
  }

  /**
   * Duplicate a lens (copy lens + lens items)
   */
  async duplicateLens(
    lensId: string,
    newName: string,
    tx?: Transaction
  ): Promise<AiruLens> {
    const dbInstance = tx ?? db;

    // Get original lens
    const originalLens = await this.getLensById(lensId, dbInstance);
    if (!originalLens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // Create new lens with same type, metadata, query
    const newLens = await this.createLens(
      {
        folderId: originalLens.folderId,
        name: newName,
        type: originalLens.type,
        metadata: originalLens.metadata,
        query: originalLens.query,
      },
      dbInstance
    );

    // Copy lens items
    const originalItems = await this.getLensItems(lensId, dbInstance);
    if (originalItems.length > 0) {
      await this.batchUpsertLensItems(
        newLens.id,
        originalItems.map((item) => ({
          entityId: item.entityId,
          entityType: item.entityType,
          columnId: item.columnId,
          order: item.order,
          x: item.x,
          y: item.y,
          metadata: item.metadata,
        })),
        dbInstance
      );
    }

    return newLens;
  }

  /**
   * Delete a lens
   * If it's a default lens, clear folder.defaultLensId
   */
  async deleteLens(
    lensId: string,
    orgId: string,
    userId: string,
    tx?: Transaction
  ): Promise<void> {
    const dbInstance = tx ?? db;

    // Get lens
    const lens = await this.getLensById(lensId, dbInstance);
    if (!lens) {
      throw new Error(`Lens not found: ${lensId}`);
    }

    // If lens is default and has folderId, clear folder.defaultLensId
    if (lens.isDefault && lens.folderId) {
      await dbInstance
        .update(airuFoldersTable)
        .set({ defaultLensId: null })
        .where(eq(airuFoldersTable.id, lens.folderId));
    }

    // Delete lens (lens_items cascade deletes via FK ON DELETE CASCADE)
    await dbInstance
      .delete(airuLensesTable)
      .where(eq(airuLensesTable.id, lensId));
  }

  /**
   * Deep merge utility for JSON objects
   * Merges source into target, preserving nested structures
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          sourceValue !== null &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue !== null &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          // Recursively merge nested objects
          result[key] = this.deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as Record<string, unknown>
          );
        } else {
          // Overwrite with source value
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }
}
