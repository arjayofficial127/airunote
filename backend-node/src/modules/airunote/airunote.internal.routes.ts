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

interface CreateFolderRequest {
  orgId: string;
  userId: string;
  parentFolderId: string;
  humanId: string;
  type?: 'box' | 'book' | 'board';
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
  type?: 'box' | 'book' | 'board';
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

    // Validate type if provided
    if (body.type && !['box', 'book', 'board'].includes(body.type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid folder type. Must be "box", "book", or "board"', code: 'VALIDATION_ERROR' },
      });
    }

    const domainService = container.resolve(AirunoteDomainService);
    let folder;

    // If updating name, type, or metadata, use updateFolder
    if (body.humanId || body.type !== undefined || body.metadata !== undefined) {
      const updates: {
        humanId?: string;
        type?: 'box' | 'book' | 'board';
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
      body.type
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
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Either content, name, or folderId must be provided', code: 'VALIDATION_ERROR' },
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

export default router;
