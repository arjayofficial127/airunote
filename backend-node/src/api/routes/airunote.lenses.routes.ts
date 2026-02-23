/**
 * Airunote Lenses API Routes
 * REST endpoints for managing lens projections (Board/Canvas/Book)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { container } from '../../core/di/container';
import { AirunoteDomainService } from '../../modules/airunote/airunote.domainService';
import { AirunoteRepository } from '../../modules/airunote/airunote.repository';
import { AirunotePermissionResolver } from '../../modules/airunote/airunote.permissions';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';
import { db } from '../../infrastructure/db/drizzle/client';
import type { AiruLensType, AiruLensEntityType, AiruLensItemMetadata } from '../../modules/airunote/airunote.repository';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// All routes require authentication and org membership
router.use(authMiddleware);
router.use(requireOrgMembership);

/**
 * Validation helpers
 */
function isUuidLike(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidLensType(type: unknown): type is AiruLensType {
  const validTypes: AiruLensType[] = ['box', 'board', 'canvas', 'book', 'desktop', 'saved'];
  return typeof type === 'string' && validTypes.includes(type as AiruLensType);
}

function isValidEntityType(type: unknown): type is AiruLensEntityType {
  return type === 'document' || type === 'folder';
}

function isValidViewMode(mode: unknown): boolean {
  const validModes = ['icon', 'preview', 'full', 'scroll'];
  return typeof mode === 'string' && validModes.includes(mode);
}

/**
 * GET /folders/:folderId/lenses
 * Get all lenses for a folder
 */
router.get('/folders/:folderId/lenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, folderId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(folderId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or folderId', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Verify folder exists and user has access
    const folder = await repository.findFolderById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'NOT_FOUND' },
      });
    }

    if (folder.orgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Folder does not belong to organization', code: 'FORBIDDEN' },
      });
    }

    // Check read access
    const canRead = await permissionResolver.canRead('folder', folderId, userId, orgId);
    if (!canRead) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'FORBIDDEN' },
      });
    }

    // Get lenses for folder
    const lenses = await repository.getLensesForFolder(folderId);

    res.status(200).json({
      success: true,
      data: { lenses },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:lensId
 * Get lens + lens items
 */
router.get('/:lensId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, lensId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(lensId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or lensId', code: 'VALIDATION_ERROR' },
      });
    }

    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Get lens
    const lens = await repository.getLensById(lensId);
    if (!lens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    // If lens has folderId, verify folder access
    if (lens.folderId) {
      const folder = await repository.findFolderById(lens.folderId);
      if (!folder || folder.orgId !== orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Lens does not belong to organization', code: 'FORBIDDEN' },
        });
      }

      const canRead = await permissionResolver.canRead('folder', lens.folderId, userId, orgId);
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied', code: 'FORBIDDEN' },
        });
      }
    } else {
      // Desktop lens - verify user has access (future: check query permissions)
      // For now, allow if user is in org
    }

    // Get lens items
    const items = await repository.getLensItems(lensId);

    res.status(200).json({
      success: true,
      data: { lens, items },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /folders/:folderId/lenses
 * Create a new lens
 */
router.post('/folders/:folderId/lenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, folderId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(folderId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or folderId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as {
      name?: string;
      type?: unknown;
      isDefault?: boolean;
      metadata?: Record<string, unknown>;
    };

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!isValidLensType(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'type is required and must be one of: box, board, canvas, book, desktop, saved', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Verify folder exists and user has write access
    const folder = await repository.findFolderById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'NOT_FOUND' },
      });
    }

    if (folder.orgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Folder does not belong to organization', code: 'FORBIDDEN' },
      });
    }

    const canWrite = await permissionResolver.canWrite('folder', folderId, userId, orgId);
    if (!canWrite) {
      return res.status(403).json({
        success: false,
        error: { message: 'Write access denied', code: 'FORBIDDEN' },
      });
    }

    // Initialize default metadata for board type if missing
    let metadata = body.metadata || {};
    if (body.type === 'board' && !metadata.columns) {
      metadata = {
        columns: [
          { id: 'todo', title: 'Todo', description: null, order: 0 },
          { id: 'doing', title: 'Doing', description: null, order: 1 },
          { id: 'done', title: 'Done', description: null, order: 2 },
        ],
      };
    }

    // Create lens and set as default if requested (in transaction)
    const lensType = body.type as AiruLensType; // Already validated above
    const lensName = body.name.trim(); // Already validated above
    
    const lens: Awaited<ReturnType<typeof domainService.createFolderLens>> = await (async () => {
      if (body.isDefault === true) {
        let createdLens: Awaited<ReturnType<typeof domainService.createFolderLens>>;
        await db.transaction(async (tx) => {
          createdLens = await domainService.createFolderLens(folderId, orgId, userId, {
            name: lensName,
            type: lensType,
            metadata,
            query: null,
          });
          await repository.setDefaultLens(folderId, createdLens.id, tx);
        });
        return createdLens!;
      } else {
        return await domainService.createFolderLens(folderId, orgId, userId, {
          name: lensName,
          type: lensType,
          metadata,
          query: null,
        });
      }
    })();

    res.status(201).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:lensId/duplicate
 * Duplicate a lens
 */
router.post('/:lensId/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, lensId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(lensId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or lensId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as { name?: string };
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
      });
    }

    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Get original lens
    const originalLens = await repository.getLensById(lensId);
    if (!originalLens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    // Verify access to original lens
    if (originalLens.folderId) {
      const folder = await repository.findFolderById(originalLens.folderId);
      if (!folder || folder.orgId !== orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Lens does not belong to organization', code: 'FORBIDDEN' },
        });
      }

      const canRead = await permissionResolver.canRead('folder', originalLens.folderId, userId, orgId);
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied', code: 'FORBIDDEN' },
        });
      }
    }

    // Duplicate lens
    const newLens = await repository.duplicateLens(lensId, body.name.trim());

    res.status(201).json({
      success: true,
      data: { lens: newLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /:lensId
 * Delete a lens
 */
router.delete('/:lensId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, lensId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(lensId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or lensId', code: 'VALIDATION_ERROR' },
      });
    }

    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Get lens
    const lens = await repository.getLensById(lensId);
    if (!lens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    // Verify access
    if (lens.folderId) {
      const folder = await repository.findFolderById(lens.folderId);
      if (!folder || folder.orgId !== orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Lens does not belong to organization', code: 'FORBIDDEN' },
        });
      }

      const canWrite = await permissionResolver.canWrite('folder', lens.folderId, userId, orgId);
      if (!canWrite) {
        return res.status(403).json({
          success: false,
          error: { message: 'Write access denied', code: 'FORBIDDEN' },
        });
      }
    }

    // Delete lens (lens_items cascade deletes via FK)
    await repository.deleteLens(lensId, orgId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Lens deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId/items
 * Batch upsert lens items
 */
router.patch('/:lensId/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, lensId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(lensId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or lensId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as { items?: unknown[] };
    if (!Array.isArray(body.items)) {
      return res.status(400).json({
        success: false,
        error: { message: 'items must be an array', code: 'VALIDATION_ERROR' },
      });
    }

    if (body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'items array cannot be empty', code: 'VALIDATION_ERROR' },
      });
    }

    if (body.items.length > 500) {
      return res.status(400).json({
        success: false,
        error: { message: 'items array cannot exceed 500 items', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate each item
    const validatedItems: Array<{
      entityId: string;
      entityType: AiruLensEntityType;
      columnId?: string | null;
      order?: number | null;
      x?: number | null;
      y?: number | null;
      metadata?: AiruLensItemMetadata;
    }> = [];

    for (const item of body.items) {
      if (typeof item !== 'object' || item === null) {
        return res.status(400).json({
          success: false,
          error: { message: 'Each item must be an object', code: 'VALIDATION_ERROR' },
        });
      }

      const itemObj = item as Record<string, unknown>;

      if (!isUuidLike(itemObj.entityId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Each item must have a valid entityId (UUID)', code: 'VALIDATION_ERROR' },
        });
      }

      if (!isValidEntityType(itemObj.entityType)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Each item must have entityType as "document" or "folder"', code: 'VALIDATION_ERROR' },
        });
      }

      const validatedItem: typeof validatedItems[0] = {
        entityId: itemObj.entityId as string,
        entityType: itemObj.entityType,
      };

      if (itemObj.columnId !== undefined) {
        validatedItem.columnId = itemObj.columnId === null ? null : String(itemObj.columnId);
      }

      if (itemObj.order !== undefined) {
        validatedItem.order = itemObj.order === null ? null : Number(itemObj.order);
        if (validatedItem.order !== null && isNaN(validatedItem.order)) {
          return res.status(400).json({
            success: false,
            error: { message: 'order must be a number or null', code: 'VALIDATION_ERROR' },
          });
        }
      }

      if (itemObj.x !== undefined) {
        validatedItem.x = itemObj.x === null ? null : Number(itemObj.x);
        if (validatedItem.x !== null && isNaN(validatedItem.x)) {
          return res.status(400).json({
            success: false,
            error: { message: 'x must be a number or null', code: 'VALIDATION_ERROR' },
          });
        }
      }

      if (itemObj.y !== undefined) {
        validatedItem.y = itemObj.y === null ? null : Number(itemObj.y);
        if (validatedItem.y !== null && isNaN(validatedItem.y)) {
          return res.status(400).json({
            success: false,
            error: { message: 'y must be a number or null', code: 'VALIDATION_ERROR' },
          });
        }
      }

      if (itemObj.metadata !== undefined) {
        if (typeof itemObj.metadata !== 'object' || itemObj.metadata === null) {
          return res.status(400).json({
            success: false,
            error: { message: 'metadata must be an object', code: 'VALIDATION_ERROR' },
          });
        }

        const metadata = itemObj.metadata as Record<string, unknown>;
        if (metadata.viewMode !== undefined && !isValidViewMode(metadata.viewMode)) {
          return res.status(400).json({
            success: false,
            error: { message: 'metadata.viewMode must be one of: icon, preview, full, scroll', code: 'VALIDATION_ERROR' },
          });
        }

        validatedItem.metadata = metadata as AiruLensItemMetadata;
      }

      validatedItems.push(validatedItem);
    }

    const repository = container.resolve(AirunoteRepository);
    const permissionResolver = container.resolve(AirunotePermissionResolver);

    // Get lens and verify access
    const lens = await repository.getLensById(lensId);
    if (!lens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    if (lens.folderId) {
      const folder = await repository.findFolderById(lens.folderId);
      if (!folder || folder.orgId !== orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Lens does not belong to organization', code: 'FORBIDDEN' },
        });
      }

      const canWrite = await permissionResolver.canWrite('folder', lens.folderId, userId, orgId);
      if (!canWrite) {
        return res.status(403).json({
          success: false,
          error: { message: 'Write access denied', code: 'FORBIDDEN' },
        });
      }
    }

    // Batch upsert items
    await repository.batchUpsertLensItems(lensId, validatedItems);

    res.status(200).json({
      success: true,
      data: { updated: validatedItems.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
