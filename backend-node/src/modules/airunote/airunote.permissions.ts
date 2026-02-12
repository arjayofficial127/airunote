/**
 * Airunote Permission Resolution
 * 
 * CONSTITUTION v1.0: Sharing Model (Access-Only)
 * 
 * Sharing expands access, not ownership.
 * - Sharing does not duplicate content
 * - Sharing does not change ownership
 * - If owner leaves and data is deleted, all shared access dies
 * - Links resolve to resource existence — deleted resource = dead link
 * 
 * TODO Phase 2: Implement permission resolution
 * 
 * Supported Modes (to be implemented):
 * - Share to specific users
 * - Share to org-wide
 * - Share publicly
 * - Share via link (with optional password)
 * - Share by view list
 * - Share by edit list
 * 
 * Rules:
 * - Admin does NOT automatically gain read access to private files
 * - Org owner ≠ data owner
 * - Multiple admins may exist; none inherit private vault access
 */

/**
 * Permission resolver interface
 * 
 * TODO Phase 2: Implement concrete permission resolver
 */
export interface PermissionResolver {
  /**
   * Check if user has read access to folder/document
   * 
   * Constitution: Admin does NOT automatically gain read access
   * Constitution: Org owner ≠ data owner
   */
  canRead(folderId: string, userId: string, orgId: string): Promise<boolean>;

  /**
   * Check if user has write access to folder/document
   * 
   * Constitution: Only owner can hard-delete
   * Constitution: Editors can modify shared_content only
   */
  canWrite(folderId: string, userId: string, orgId: string): Promise<boolean>;

  /**
   * Check if user has delete access to folder/document
   * 
   * Constitution: Delete privilege remains owner-only
   * Constitution: Editors cannot hard-delete
   */
  canDelete(folderId: string, userId: string, orgId: string): Promise<boolean>;
}
