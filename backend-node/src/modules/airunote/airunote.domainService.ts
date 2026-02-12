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
import { db } from '../../infrastructure/db/drizzle/client';
import { AirunoteRepository, type AiruFolder } from './airunote.repository';

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
}
