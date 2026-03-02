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

/**
 * POST /
 * Create desktop or saved lens
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as {
      name?: string;
      type?: unknown;
      query?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    };

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!isValidLensType(body.type) || (body.type !== 'desktop' && body.type !== 'saved')) {
      return res.status(400).json({
        success: false,
        error: { message: 'type is required and must be "desktop" or "saved"', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.createDesktopLens(orgId, userId, {
      name: body.name.trim(),
      type: body.type as 'desktop' | 'saved',
      query: body.query || null,
      metadata: body.metadata || {},
    });

    res.status(201).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId
 * Update desktop or saved lens
 */
router.patch('/:lensId', async (req: Request, res: Response, next: NextFunction) => {
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

    // Get lens and verify access
    const lens = await repository.getLensById(lensId);
    if (!lens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    // Desktop/saved lenses don't have folderId - verify user owns it or is in org
    if (lens.folderId) {
      // This is a folder lens, not a desktop lens
      return res.status(400).json({
        success: false,
        error: { message: 'This endpoint is for desktop/saved lenses only. Use folder lens endpoint for folder lenses.', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as {
      name?: string;
      query?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    };

    // Validate name if provided
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: { message: 'name must be a non-empty string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateDesktopLens(lensId, orgId, userId, {
      name: body.name?.trim(),
      query: body.query !== undefined ? body.query : undefined,
      metadata: body.metadata !== undefined ? body.metadata : undefined,
    });

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId/canvas-positions
 * Update canvas positions for a lens
 */
router.patch('/:lensId/canvas-positions', async (req: Request, res: Response, next: NextFunction) => {
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

    const body = req.body as {
      positions?: Record<string, { x: number; y: number }>;
    };

    if (!body.positions || typeof body.positions !== 'object' || body.positions === null || Array.isArray(body.positions)) {
      return res.status(400).json({
        success: false,
        error: { message: 'positions is required and must be an object', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate positions shape
    for (const [docId, position] of Object.entries(body.positions)) {
      if (typeof docId !== 'string') {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid document ID: ${docId}`, code: 'VALIDATION_ERROR' },
        });
      }
      if (
        typeof position !== 'object' ||
        position === null ||
        typeof position.x !== 'number' ||
        typeof position.y !== 'number'
      ) {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid position for document ${docId}: must have x and y as numbers`, code: 'VALIDATION_ERROR' },
        });
      }
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

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateCanvasPositions(lensId, body.positions);

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId/board-card
 * Update board card position (fractional order)
 */
router.patch('/:lensId/board-card', async (req: Request, res: Response, next: NextFunction) => {
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

    const body = req.body as {
      entityId?: string;
      columnId?: string;
      order?: number;
    };

    if (!body.entityId || typeof body.entityId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'entityId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!isUuidLike(body.entityId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid entityId', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.columnId || typeof body.columnId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'columnId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (typeof body.order !== 'number' || isNaN(body.order)) {
      return res.status(400).json({
        success: false,
        error: { message: 'order is required and must be a number', code: 'VALIDATION_ERROR' },
      });
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

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateBoardCard(lensId, body.entityId, body.columnId, body.order);

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId/board-lanes
 * Update board lanes
 */
router.patch('/:lensId/board-lanes', async (req: Request, res: Response, next: NextFunction) => {
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

    const body = req.body as {
      lanes?: Array<{ id: string; title?: string; name?: string; description?: string | null; order: number }>;
    };

    if (!body.lanes || !Array.isArray(body.lanes)) {
      return res.status(400).json({
        success: false,
        error: { message: 'lanes is required and must be an array', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate lanes shape
    for (const lane of body.lanes) {
      if (typeof lane.id !== 'string' || !lane.id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid lane ID', code: 'VALIDATION_ERROR' },
        });
      }
      // Support both 'name' and 'title' for backward compatibility
      const laneName = lane.title || lane.name;
      if (typeof laneName !== 'string') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid lane name/title', code: 'VALIDATION_ERROR' },
        });
      }
      if (typeof lane.order !== 'number' || isNaN(lane.order)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid lane order', code: 'VALIDATION_ERROR' },
        });
      }
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

    // Normalize lanes to use 'title' (domain service expects this)
    const normalizedLanes = body.lanes.map((lane) => ({
      id: lane.id,
      name: lane.title || lane.name || '',
      order: lane.order,
    }));

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateBoardLanes(lensId, normalizedLanes);

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /:lensId/batch-layout
 * Batch update lens layout (canvas and/or board positions)
 */
router.patch('/:lensId/batch-layout', async (req: Request, res: Response, next: NextFunction) => {
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

    const body = req.body as {
      canvasPositions?: Record<string, { x: number; y: number }>;
      boardPositions?: Record<string, { laneId: string; order: number }>;
    };

    // Validate that at least one update is provided
    if (!body.canvasPositions && !body.boardPositions) {
      return res.status(400).json({
        success: false,
        error: { message: 'At least one of canvasPositions or boardPositions must be provided', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate canvasPositions if provided
    if (body.canvasPositions) {
      if (typeof body.canvasPositions !== 'object' || body.canvasPositions === null || Array.isArray(body.canvasPositions)) {
        return res.status(400).json({
          success: false,
          error: { message: 'canvasPositions must be an object', code: 'VALIDATION_ERROR' },
        });
      }

      for (const [docId, position] of Object.entries(body.canvasPositions)) {
        if (typeof docId !== 'string') {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid document ID: ${docId}`, code: 'VALIDATION_ERROR' },
          });
        }
        if (
          typeof position !== 'object' ||
          position === null ||
          typeof position.x !== 'number' ||
          typeof position.y !== 'number'
        ) {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid position for document ${docId}: must have x and y as numbers`, code: 'VALIDATION_ERROR' },
          });
        }
      }
    }

    // Validate boardPositions if provided
    if (body.boardPositions) {
      if (typeof body.boardPositions !== 'object' || body.boardPositions === null || Array.isArray(body.boardPositions)) {
        return res.status(400).json({
          success: false,
          error: { message: 'boardPositions must be an object', code: 'VALIDATION_ERROR' },
        });
      }

      for (const [docId, position] of Object.entries(body.boardPositions)) {
        if (typeof docId !== 'string') {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid document ID: ${docId}`, code: 'VALIDATION_ERROR' },
          });
        }
        if (
          typeof position !== 'object' ||
          position === null ||
          typeof position.laneId !== 'string' ||
          typeof position.order !== 'number'
        ) {
          return res.status(400).json({
            success: false,
            error: { message: `Invalid board position for document ${docId}: must have laneId (string) and order (number)`, code: 'VALIDATION_ERROR' },
          });
        }
      }
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

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateBatchLayout(lensId, {
      canvasPositions: body.canvasPositions,
      boardPositions: body.boardPositions,
    });

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /folders/:folderId/lenses/:lensId
 * Update folder lens
 */
router.patch('/folders/:folderId/lenses/:lensId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, folderId, lensId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(folderId) || !isUuidLike(lensId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId, folderId, or lensId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as {
      name?: string;
      type?: unknown;
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    };

    // Validate type if provided
    if (body.type !== undefined && !isValidLensType(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'type must be one of: box, board, canvas, book, desktop, saved', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate name if provided
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: { message: 'name must be a non-empty string', code: 'VALIDATION_ERROR' },
      });
    }

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

    const domainService = container.resolve(AirunoteDomainService);
    const updatedLens = await domainService.updateFolderLens(folderId, lensId, orgId, userId, {
      name: body.name?.trim(),
      type: body.type as AiruLensType | undefined,
      metadata: body.metadata,
      query: body.query !== undefined ? body.query : undefined,
    });

    res.status(200).json({
      success: true,
      data: { lens: updatedLens },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
