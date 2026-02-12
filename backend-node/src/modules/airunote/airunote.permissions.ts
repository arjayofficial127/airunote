/**
 * Airunote Permissions Resolver
 * Centralized access control for Airunote resources
 *
 * Constitution Compliance:
 * - Sharing Model: Access resolution based on sharing model
 * - Admin Non-Access: No implicit read bypass for admins
 * - Delete Privilege: Remains owner-only even with edit share
 */
import { injectable, inject } from 'tsyringe';
import { AirunoteRepository } from './airunote.repository';

export interface PermissionResolver {
  canRead(targetType: 'folder' | 'document', targetId: string, userId: string, orgId: string): Promise<boolean>;
  canWrite(targetType: 'folder' | 'document', targetId: string, userId: string, orgId: string): Promise<boolean>;
  canDelete(targetType: 'folder' | 'document', targetId: string, userId: string, orgId: string): Promise<boolean>;
}

@injectable()
export class AirunotePermissionResolver implements PermissionResolver {
  constructor(
    @inject(AirunoteRepository)
    private readonly repository: AirunoteRepository
  ) {}

  /**
   * Check if user can read target
   * Constitution: Access resolution order: owner → user share → org share → public → link
   */
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

  /**
   * Check if user can write to target
   * Constitution: Write access requires edit share (not view-only)
   */
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

  /**
   * Check if user can delete target
   * Constitution: Delete privilege remains owner-only
   * Even with edit share, delete is owner-only
   */
  async canDelete(
    targetType: 'folder' | 'document',
    targetId: string,
    userId: string,
    orgId: string
  ): Promise<boolean> {
    // Constitution: Delete privilege remains owner-only
    // Even with edit share, delete is owner-only
    if (targetType === 'folder') {
      const folder = await this.repository.findFolderById(targetId);
      return folder?.ownerUserId === userId && folder?.orgId === orgId;
    } else {
      const document = await this.repository.findDocument(targetId, orgId, userId);
      return document?.ownerUserId === userId;
    }
  }
}
