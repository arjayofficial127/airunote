/**
 * Airunote Domain Service
 * Business logic for Airunote root provisioning
 */
import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'crypto';
import { db } from '../../infrastructure/db/drizzle/client';
import { AirunoteRepository, type AiruFolder, type AiruUserRoot } from './airunote.repository';

@injectable()
export class AirunoteDomainService {
  constructor(
    @inject(AirunoteRepository)
    private readonly repository: AirunoteRepository
  ) {}

  /**
   * Ensure org root exists (idempotent)
   * Creates org root folder if it doesn't exist
   */
  async ensureOrgRootExists(
    orgId: string,
    ownerUserId: string
  ): Promise<AiruFolder> {
    return await db.transaction(async (tx) => {
      // Check if org root already exists
      const existing = await this.repository.findOrgRoot(orgId, tx);
      if (existing) {
        return existing;
      }

      try {
        // Generate folder ID first for self-parent pattern
        const folderId = randomUUID();

        // Insert org root with self-parent pattern
        // parentFolderId = id (self-reference)
        const orgRoot = await this.repository.insertOrgRoot(
          orgId,
          ownerUserId,
          folderId,
          tx
        );

        return orgRoot;
      } catch (error: unknown) {
        // Handle race condition: another process may have created it
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === '23505' // Unique constraint violation
        ) {
          // Re-fetch existing root
          const existingRoot = await this.repository.findOrgRoot(orgId, tx);
          if (existingRoot) {
            return existingRoot;
          }
        }
        throw error;
      }
    });
  }

  /**
   * Ensure user root exists (idempotent)
   * Creates user root folder and mapping if they don't exist
   */
  async ensureUserRootExists(
    orgId: string,
    userId: string,
    ownerUserId: string
  ): Promise<AiruFolder> {
    // Ensure org root exists first
    await this.ensureOrgRootExists(orgId, ownerUserId);

    return await db.transaction(async (tx) => {
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
        const userRootFolder = await this.repository.insertUserRootFolder(
          orgId,
          ownerUserId,
          orgRoot.id, // Parent is org root
          folderId,
          tx
        );

        // Insert user root mapping
        await this.repository.insertUserRoot(
          orgId,
          userId,
          folderId,
          tx
        );

        return userRootFolder;
      } catch (error: unknown) {
        // Handle race condition: another process may have created it
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === '23505' // Unique constraint violation
        ) {
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
              return folder;
            }
          }
        }
        throw error;
      }
    });
  }
}
