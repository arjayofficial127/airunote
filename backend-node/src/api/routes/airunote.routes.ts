/**
 * Airunote Production Routes
 * Production-safe REST endpoints for Airunote folder and document operations
 * 
 * Security:
 * - All routes require authentication (authMiddleware)
 * - All routes require org membership (requireOrgMembership)
 * - orgId extracted from req.params (not body)
 * - userId extracted from req.user (not body)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { container } from '../../core/di/container';
import { AirunoteDomainService } from '../../modules/airunote/airunote.domainService';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgMembership } from '../middleware/requireOrgMembership';
import type { AiruFolderType } from '../../modules/airunote/airunote.repository';

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

const VALID_FOLDER_TYPES: AiruFolderType[] = [
  'box', 'board', 'book', 'canvas', 'collection', 
  'contacts', 'ledger', 'journal', 'manual', 
  'notebook', 'pipeline', 'project', 'wiki'
];

/**
 * POST /folders
 * Create a new folder
 */
router.post('/folders', async (req: Request, res: Response, next: NextFunction) => {
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
      parentFolderId: string;
      humanId: string;
      type?: AiruFolderType;
      metadata?: Record<string, unknown> | null;
    };

    // parentFolderId is required
    if (!body.parentFolderId || typeof body.parentFolderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'parentFolderId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!isUuidLike(body.parentFolderId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid parentFolderId', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.humanId || typeof body.humanId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'humanId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate type if provided
    if (body.type && !VALID_FOLDER_TYPES.includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid folder type. Must be one of: ${VALID_FOLDER_TYPES.join(', ')}`, code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const folder = await domainService.createFolderInUserVault(
      orgId,
      userId,
      body.parentFolderId,
      body.humanId,
      body.type || 'box',
      body.metadata || null
    );

    res.status(201).json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /folders/:id
 * Update folder (rename, change type, or move)
 */
router.put('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: folderId } = req.params;
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
      humanId?: string;
      parentFolderId?: string;
      type?: AiruFolderType;
      metadata?: Record<string, unknown> | null;
    };

    // Validate type if provided
    if (body.type && !VALID_FOLDER_TYPES.includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid folder type. Must be one of: ${VALID_FOLDER_TYPES.join(', ')}`, code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    let folder;

    // If updating name, type, or metadata, use updateFolder
    if (body.humanId || body.type !== undefined || body.metadata !== undefined) {
      const updates: {
        humanId?: string;
        type?: AiruFolderType;
        metadata?: Record<string, unknown> | null;
      } = {};
      if (body.humanId) updates.humanId = body.humanId;
      if (body.type !== undefined) updates.type = body.type;
      if (body.metadata !== undefined) updates.metadata = body.metadata;

      folder = await domainService.updateFolder(orgId, userId, folderId, updates);
    } else if (body.parentFolderId) {
      folder = await domainService.moveFolder(orgId, userId, folderId, body.parentFolderId);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either humanId, type, metadata, or parentFolderId must be provided', code: 'VALIDATION_ERROR' },
      });
    }

    res.status(200).json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /folders/:id
 * Delete a folder
 */
router.delete('/folders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: folderId } = req.params;
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
    await domainService.deleteFolder(orgId, userId, folderId);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tree
 * Get folder tree for user
 */
router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.userId;
    const parentFolderId = req.query.parentFolderId as string | undefined;

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

    if (parentFolderId !== undefined && !isUuidLike(parentFolderId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid parentFolderId', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const tree = await domainService.listUserFolderTree(orgId, userId, parentFolderId);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /documents
 * Create a new document
 */
router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
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
      folderId: string;
      name: string;
      content: string;
      type: 'TXT' | 'MD' | 'RTF';
      attributes?: Record<string, any>;
    };

    if (!body.folderId || typeof body.folderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'folderId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!isUuidLike(body.folderId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid folderId', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.name || typeof body.name !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (typeof body.content !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'content is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.type || !['TXT', 'MD', 'RTF'].includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'type must be one of: TXT, MD, RTF', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const document = await domainService.createUserDocument(
      orgId,
      userId,
      body.folderId,
      body.name,
      body.content,
      body.type,
      body.attributes
    );

    res.status(201).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /documents/:id
 * Get a document by ID
 */
router.get('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: documentId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(documentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or documentId', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const document = await domainService.getUserDocument(orgId, userId, documentId);

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /documents/:id
 * Update document (content, name, move, or attributes)
 */
router.put('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: documentId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(documentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or documentId', code: 'VALIDATION_ERROR' },
      });
    }

    const body = req.body as {
      content?: string;
      name?: string;
      folderId?: string;
      attributes?: Record<string, any>;
    };

    // Validate that only one operation is performed at a time
    const operations = [
      body.content !== undefined,
      body.name !== undefined,
      body.folderId !== undefined,
      body.attributes !== undefined,
    ].filter(Boolean);

    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Either content, name, folderId, or attributes must be provided', code: 'VALIDATION_ERROR' },
      });
    }

    if (operations.length > 1) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update multiple fields in same request. Only one of content, name, folderId, or attributes allowed.', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    let document;

    if (body.content !== undefined) {
      document = await domainService.updateUserDocument(orgId, userId, documentId, body.content);
    } else if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'name must be a non-empty string', code: 'VALIDATION_ERROR' },
        });
      }
      document = await domainService.renameUserDocument(orgId, userId, documentId, body.name);
    } else if (body.folderId !== undefined) {
      if (!isUuidLike(body.folderId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid folderId', code: 'VALIDATION_ERROR' },
        });
      }
      document = await domainService.moveUserDocument(orgId, userId, documentId, body.folderId);
    } else if (body.attributes !== undefined) {
      // Phase 7: Update document attributes
      if (typeof body.attributes !== 'object' || body.attributes === null || Array.isArray(body.attributes)) {
        return res.status(400).json({
          success: false,
          error: { message: 'attributes must be an object', code: 'VALIDATION_ERROR' },
        });
      }
      document = await domainService.updateUserDocumentAttributes(orgId, userId, documentId, body.attributes);
    }

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /documents/:id
 * Delete a document
 */
router.delete('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: documentId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    if (!isUuidLike(orgId) || !isUuidLike(documentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid orgId or documentId', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    await domainService.deleteUserDocument(orgId, userId, documentId);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /folders/:id/documents
 * Get all documents in a folder
 */
router.get('/folders/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId, id: folderId } = req.params;
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
    const documents = await domainService.listUserDocuments(orgId, userId, folderId);

    res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
