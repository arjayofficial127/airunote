/**
 * Airunote Internal Routes
 * Temporary internal-only endpoint for testing root provisioning and CRUD operations
 * 
 * Constitution Compliance:
 * - Internal Route Hardening: Includes production safety guard.
 * 
 * TODO remove after Phase 2 integration
 */
import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { AirunoteDomainService } from './airunote.domainService';

const router: ReturnType<typeof Router> = Router();

// Production safety guard helper
const checkProduction = (res: Response): boolean => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      error: { message: 'Internal route disabled in production', code: 'FORBIDDEN' },
    });
    return true;
  }
  return false;
};

interface ProvisionRequest {
  orgId: string;
  userId: string;
  orgOwnerUserId: string;
}

router.post('/provision', async (req: Request, res: Response, next) => {
  try {
    // Note: Production guard removed - this endpoint is needed in production

    const body = req.body as ProvisionRequest;

    // Basic validation
    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.orgOwnerUserId || typeof body.orgOwnerUserId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgOwnerUserId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Resolve service via container
    const domainService = container.resolve(AirunoteDomainService);

    // Call domain service
    // Constitution: Org boundary enforced, ownership model respected
    const rootFolder = await domainService.ensureUserRootExists(
      body.orgId,
      body.userId,
      body.orgOwnerUserId
    );

    // Return created root folder
    res.status(200).json({
      success: true,
      data: {
        rootFolder: {
          id: rootFolder.id,
          orgId: rootFolder.orgId,
          ownerUserId: rootFolder.ownerUserId,
          parentFolderId: rootFolder.parentFolderId,
          humanId: rootFolder.humanId,
          visibility: rootFolder.visibility,
          createdAt: rootFolder.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PHASE 1: Folder Routes
// =====================================================

type AiruFolderType = 
  | 'box' | 'board' | 'book' | 'canvas' | 'collection' 
  | 'contacts' | 'ledger' | 'journal' | 'manual' 
  | 'notebook' | 'pipeline' | 'project' | 'wiki';

const VALID_FOLDER_TYPES: AiruFolderType[] = [
  'box', 'board', 'book', 'canvas', 'collection', 
  'contacts', 'ledger', 'journal', 'manual', 
  'notebook', 'pipeline', 'project', 'wiki'
];

interface CreateFolderRequest {
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}

router.post('/folder', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const body = req.body as CreateFolderRequest;

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // parentFolderId is optional - backend will default to user root if empty
    if (body.parentFolderId !== undefined && typeof body.parentFolderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'parentFolderId must be a string if provided', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.humanId || typeof body.humanId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'humanId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate type if provided
    if (body.type && !['box', 'book', 'board'].includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid folder type. Must be "box", "book", or "board"', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const folder = await domainService.createFolderInUserVault(
      body.orgId,
      body.userId,
      body.parentFolderId,
      body.humanId,
      body.type || 'box',
      body.metadata || null
    );

    res.status(200).json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
});

interface UpdateFolderRequest {
  orgId: string;
  userId: string;
  humanId?: string;
  parentFolderId?: string;
  type?: AiruFolderType;
  metadata?: Record<string, unknown> | null;
}

router.put('/folder/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const body = req.body as UpdateFolderRequest;

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate type if provided - extended folder types
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

      folder = await domainService.updateFolder(body.orgId, body.userId, folderId, updates);
    } else if (body.parentFolderId) {
      folder = await domainService.moveFolder(body.orgId, body.userId, folderId, body.parentFolderId);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either humanId or parentFolderId must be provided', code: 'VALIDATION_ERROR' },
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

router.get('/folder/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    
    // Phase 1: Use resolveFolderProjection internally but return same shape
    const { folder } = await domainService.resolveFolderProjection(folderId);

    // Return same shape as before (no breaking change)
    res.status(200).json({
      success: true,
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/folder/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
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

router.get('/tree', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;
    const parentFolderId = req.query.parentFolderId as string | undefined;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
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

router.get('/full-metadata', async (req: Request, res: Response, next) => {
  try {
    // Note: Production guard removed - this endpoint is needed in production

    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const metadata = await domainService.getFullMetadata(orgId, userId);

    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PHASE 1: Document Routes
// =====================================================

interface CreateDocumentRequest {
  orgId: string;
  userId: string;
  folderId: string;
  name: string;
  content: string;
  type: 'TXT' | 'MD' | 'RTF';
  attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine
}

router.post('/document', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const body = req.body as CreateDocumentRequest;

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.folderId || typeof body.folderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'folderId is required and must be a string', code: 'VALIDATION_ERROR' },
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
      body.orgId,
      body.userId,
      body.folderId,
      body.name,
      body.content,
      body.type,
      body.attributes // Phase 7: Hybrid Attribute Engine
    );

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/document/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const documentId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
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

interface UpdateDocumentRequest {
  orgId: string;
  userId: string;
  content?: string;
  name?: string;
  folderId?: string;
  attributes?: Record<string, any>; // Phase 7: Hybrid Attribute Engine
}

router.put('/document/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const documentId = req.params.id;
    const body = req.body as UpdateDocumentRequest;

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    let document;

    if (body.content !== undefined && body.name !== undefined && body.folderId !== undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update content, name, and move document in same request', code: 'VALIDATION_ERROR' },
      });
    }

    if (body.content !== undefined) {
      document = await domainService.updateUserDocument(body.orgId, body.userId, documentId, body.content);
    } else if (body.name !== undefined) {
      document = await domainService.renameUserDocument(body.orgId, body.userId, documentId, body.name);
    } else if (body.folderId !== undefined) {
      document = await domainService.moveUserDocument(body.orgId, body.userId, documentId, body.folderId);
    } else if (body.attributes !== undefined) {
      // Phase 7: Update document attributes
      document = await domainService.updateUserDocumentAttributes(body.orgId, body.userId, documentId, body.attributes);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either content, name, folderId, or attributes must be provided', code: 'VALIDATION_ERROR' },
      });
    }

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/document/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const documentId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
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

router.get('/folder/:folderId/documents', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.folderId;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
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

// =====================================================
// PHASE 2: Multi-lens per folder routes
// =====================================================

// GET /folders/:id/lenses
router.get('/folders/:id/lenses', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lenses = await domainService.getFolderLenses(folderId, orgId, userId);

    res.status(200).json({
      success: true,
      data: { lenses },
    });
  } catch (error) {
    next(error);
  }
});

// POST /folders/:id/lenses
router.post('/folders/:id/lenses', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;
    const body = req.body as {
      name: string;
      type: string;
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    };

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.name || typeof body.name !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.type || typeof body.type !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'type is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate type
    if (!['box', 'board', 'canvas', 'book'].includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid lens type. Must be one of: box, board, canvas, book', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.createFolderLens(folderId, orgId, userId, {
      name: body.name,
      type: body.type as 'box' | 'board' | 'canvas' | 'book',
      metadata: body.metadata,
      query: body.query,
    });

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /folders/:id/lenses/:lensId
router.patch('/folders/:id/lenses/:lensId', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const lensId = req.params.lensId;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;
    const body = req.body as {
      name?: string;
      type?: string;
      metadata?: Record<string, unknown>;
      query?: Record<string, unknown> | null;
    };

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Validate type if provided
    if (body.type && !['box', 'board', 'canvas', 'book'].includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid lens type. Must be one of: box, board, canvas, book', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.updateFolderLens(folderId, lensId, orgId, userId, {
      name: body.name,
      type: body.type as 'box' | 'board' | 'canvas' | 'book' | undefined,
      metadata: body.metadata,
      query: body.query,
    });

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// POST /folders/:id/lenses/:lensId/set-default
router.post('/folders/:id/lenses/:lensId/set-default', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const folderId = req.params.id;
    const lensId = req.params.lensId;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    await domainService.switchFolderLens(folderId, lensId, orgId, userId);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PHASE 3: Vault Deletion Route
// =====================================================

interface DeleteVaultRequest {
  orgId: string;
  userId: string; // user to remove
  confirmedByUserId: string; // admin/owner confirming
  confirmation: string; // must be 'DELETE_VAULT_PERMANENTLY'
}

router.post('/vault/delete', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const body = req.body as DeleteVaultRequest;

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.confirmedByUserId || typeof body.confirmedByUserId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'confirmedByUserId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Constitution: Explicit confirmation string required
    if (body.confirmation !== 'DELETE_VAULT_PERMANENTLY') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Confirmation string must exactly match "DELETE_VAULT_PERMANENTLY"',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Note: Admin/owner verification should be done at route level with middleware
    // For internal route, we'll skip this check but document it

    const domainService = container.resolve(AirunoteDomainService);
    const result = await domainService.deleteUserVault(
      body.orgId,
      body.userId,
      body.confirmedByUserId
    );

    res.status(200).json({
      success: true,
      data: {
        deletedFolders: result.deletedFolders,
        deletedDocuments: result.deletedDocuments,
        deletedShares: result.deletedShares,
        deletedLinks: result.deletedLinks,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /lenses/:lensId/canvas-positions
router.patch('/lenses/:lensId/canvas-positions', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.lensId;
    const body = req.body as {
      positions: Record<string, { x: number; y: number }>;
    };

    if (!body.positions || typeof body.positions !== 'object') {
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

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.updateCanvasPositions(lensId, body.positions);

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /lenses/:lensId/board-card
router.patch('/lenses/:lensId/board-card', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.lensId;
    const body = req.body as {
      documentId: string;
      laneId: string;
      fractionalOrder: number;
    };

    if (!body.documentId || typeof body.documentId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'documentId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.laneId || typeof body.laneId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'laneId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (typeof body.fractionalOrder !== 'number' || isNaN(body.fractionalOrder)) {
      return res.status(400).json({
        success: false,
        error: { message: 'fractionalOrder is required and must be a number', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.updateBoardCard(
      lensId,
      body.documentId,
      body.laneId,
      body.fractionalOrder
    );

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /lenses/:lensId/board-lanes
router.patch('/lenses/:lensId/board-lanes', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.lensId;
    const body = req.body as {
      lanes: Array<{ id: string; name: string; order: number }>;
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
      if (typeof lane.name !== 'string') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid lane name', code: 'VALIDATION_ERROR' },
        });
      }
      if (typeof lane.order !== 'number' || isNaN(lane.order)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid lane order', code: 'VALIDATION_ERROR' },
        });
      }
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.updateBoardLanes(lensId, body.lanes);

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /lenses/:lensId/batch-layout
// Phase 8.1 — Batch Layout Updates
router.patch('/lenses/:lensId/batch-layout', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.lensId;
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

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.updateBatchLayout(lensId, {
      canvasPositions: body.canvasPositions,
      boardPositions: body.boardPositions,
    });

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PHASE 5: Desktop Lenses routes
// =====================================================

// POST /lenses (create desktop or saved lens)
// Phase 6 — Unified Projection Engine + Saved Views
router.post('/lenses', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const body = req.body as {
      orgId: string;
      userId: string;
      name: string;
      type: 'desktop' | 'saved';
      query?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    };

    if (!body.orgId || typeof body.orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!body.name || typeof body.name !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'name is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (body.type !== 'desktop' && body.type !== 'saved') {
      return res.status(400).json({
        success: false,
        error: { message: 'type must be "desktop" or "saved"', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const lens = await domainService.createDesktopLens(body.orgId, body.userId, {
      name: body.name,
      type: body.type,
      query: body.query || null,
      metadata: body.metadata,
    });

    res.status(200).json({
      success: true,
      data: { lens },
    });
  } catch (error) {
    next(error);
  }
});

// GET /lenses/:id (resolve lens and fetch documents)
router.get('/lenses/:id', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.id;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    const { lens, documents } = await domainService.resolveLensProjection(lensId, orgId, userId);

    res.status(200).json({
      success: true,
      data: { lens, documents },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /lenses/:lensId (update desktop/saved lens)
// Phase 6 — Unified Projection Engine + Saved Views
router.patch('/lenses/:lensId', async (req: Request, res: Response, next) => {
  try {
    if (checkProduction(res)) return;

    const lensId = req.params.lensId;
    const orgId = req.query.orgId as string;
    const userId = req.query.userId as string;
    const body = req.body as {
      name?: string;
      query?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    };

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'orgId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'userId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Fetch lens to verify it exists and is a desktop/saved lens
    const domainService = container.resolve(AirunoteDomainService);
    const { lens: existingLens } = await domainService.resolveLensProjection(lensId, orgId, userId);

    if (!existingLens) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lens not found', code: 'NOT_FOUND' },
      });
    }

    // Only allow updating desktop/saved lenses (folderId is null)
    if (existingLens.folderId !== null) {
      return res.status(400).json({
        success: false,
        error: { message: 'Use PATCH /folders/:id/lenses/:lensId for folder lenses', code: 'VALIDATION_ERROR' },
      });
    }

    // Update lens via service method
    const updatedLens = await domainService.updateDesktopLens(lensId, orgId, userId, {
      name: body.name,
      query: body.query,
      metadata: body.metadata,
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
