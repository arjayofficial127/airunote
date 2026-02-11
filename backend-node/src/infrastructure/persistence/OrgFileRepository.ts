import { injectable } from 'tsyringe';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { db } from '../db/drizzle/client';
import { orgFilesTable, orgFileUsersTable, orgFileLinksTable } from '../db/drizzle/schema';
import { IOrgFileRepository } from '../../application/interfaces/IOrgFileRepository';
import { OrgFile } from '../../domain/entities/OrgFile';

@injectable()
export class OrgFileRepository implements IOrgFileRepository {
  async create(file: Omit<OrgFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrgFile> {
    const [created] = await db
      .insert(orgFilesTable)
      .values({
        orgId: file.orgId,
        ownerUserId: file.ownerUserId,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        checksum: file.checksum,
        visibility: file.visibility,
      })
      .returning();

    return new OrgFile(
      created.id,
      created.orgId,
      created.ownerUserId,
      created.storageProvider,
      created.storageKey,
      created.url,
      created.fileName,
      created.mimeType,
      created.sizeBytes ? Number(created.sizeBytes) : 0,
      created.checksum,
      created.visibility as 'private' | 'org' | 'public' | 'users',
      created.createdAt,
      created.updatedAt,
      created.objectKey ?? null,
      created.previewObjectKey ?? null,
      created.payloadSize ?? null,
      created.payloadHash ?? null,
    );
  }

  async findById(id: string): Promise<OrgFile | null> {
    const [file] = await db
      .select()
      .from(orgFilesTable)
      .where(eq(orgFilesTable.id, id))
      .limit(1);

    if (!file) return null;

    return new OrgFile(
      file.id,
      file.orgId,
      file.ownerUserId,
      file.storageProvider,
      file.storageKey,
      file.url,
      file.fileName,
      file.mimeType,
      file.sizeBytes ? Number(file.sizeBytes) : 0,
      file.checksum,
      file.visibility as 'private' | 'org' | 'public' | 'users',
      file.createdAt,
      file.updatedAt,
      file.objectKey ?? null,
      file.previewObjectKey ?? null,
      file.payloadSize ?? null,
      file.payloadHash ?? null,
    );
  }

  async findByOrgId(orgId: string, userId?: string, filters?: { visibility?: string; search?: string }): Promise<OrgFile[]> {
    // Build conditions array
    const conditions = [eq(orgFilesTable.orgId, orgId)];

    // Apply visibility filter
    if (filters?.visibility) {
      conditions.push(eq(orgFilesTable.visibility, filters.visibility));
    }

    // Apply search filter
    if (filters?.search) {
      conditions.push(like(orgFilesTable.fileName, `%${filters.search}%`));
    }

    const files = await db
      .select()
      .from(orgFilesTable)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    // Filter by visibility rules if userId provided
    if (userId) {
      return files
        .filter((file) => {
          if (file.visibility === 'public' || file.visibility === 'org') return true;
          if (file.visibility === 'private' && file.ownerUserId === userId) return true;
          if (file.visibility === 'users') {
            // Check if user has access (we'll need to check org_file_users)
            // For now, return true and filter in use case
            return true;
          }
          return false;
        })
        .map((f) => this.mapToEntity(f));
    }

    return files.map((f) => this.mapToEntity(f));
  }

  async update(id: string, updates: Partial<OrgFile>): Promise<OrgFile> {
    const [updated] = await db
      .update(orgFilesTable)
      .set({
        ...(updates.visibility && { visibility: updates.visibility }),
        ...(updates.fileName && { fileName: updates.fileName }),
        updatedAt: new Date(),
      })
      .where(eq(orgFilesTable.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id ${id} not found`);
    }

    return this.mapToEntity(updated);
  }

  async delete(id: string): Promise<void> {
    await db.delete(orgFilesTable).where(eq(orgFilesTable.id, id));
  }

  async addUserAccess(fileId: string, userId: string): Promise<void> {
    await db.insert(orgFileUsersTable).values({
      fileId,
      userId,
    }).onConflictDoNothing();
  }

  async removeUserAccess(fileId: string, userId: string): Promise<void> {
    await db
      .delete(orgFileUsersTable)
      .where(and(eq(orgFileUsersTable.fileId, fileId), eq(orgFileUsersTable.userId, userId)));
  }

  async getUserAccessList(fileId: string): Promise<string[]> {
    const users = await db
      .select({ userId: orgFileUsersTable.userId })
      .from(orgFileUsersTable)
      .where(eq(orgFileUsersTable.fileId, fileId));

    return users.map((u) => u.userId);
  }

  async createLink(fileId: string, code: string): Promise<void> {
    await db.insert(orgFileLinksTable).values({
      fileId,
      code,
    });
  }

  async findLinkByCode(code: string): Promise<{ fileId: string; revokedAt: Date | null } | null> {
    const [link] = await db
      .select()
      .from(orgFileLinksTable)
      .where(eq(orgFileLinksTable.code, code))
      .limit(1);

    if (!link) return null;

    return {
      fileId: link.fileId,
      revokedAt: link.revokedAt,
    };
  }

  async revokeLink(code: string): Promise<void> {
    await db
      .update(orgFileLinksTable)
      .set({ revokedAt: new Date() })
      .where(eq(orgFileLinksTable.code, code));
  }

  private mapToEntity(row: any): OrgFile {
    return new OrgFile(
      row.id,
      row.orgId,
      row.ownerUserId,
      row.storageProvider,
      row.storageKey,
      row.url,
      row.fileName,
      row.mimeType,
      row.sizeBytes ? Number(row.sizeBytes) : 0,
      row.checksum,
      row.visibility as 'private' | 'org' | 'public' | 'users',
      row.createdAt,
      row.updatedAt,
      row.objectKey ?? null,
      row.previewObjectKey ?? null,
      row.payloadSize ?? null,
      row.payloadHash ?? null,
    );
  }
}
