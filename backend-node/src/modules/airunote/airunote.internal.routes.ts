/**
 * Airunote Internal Routes
 * Temporary internal-only endpoint for testing root provisioning
 * 
 * TODO: Remove after Phase 2 integration
 * This route is for development/testing only
 */
import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { AirunoteDomainService } from './airunote.domainService';

const router: ReturnType<typeof Router> = Router();

interface ProvisionRequest {
  orgId: string;
  userId: string;
  orgOwnerUserId: string;
}

router.post('/provision', async (req: Request, res: Response, next) => {
  try {
    // Production safety guard
    // Constitution: No accidental exposure of internal routes
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: { message: 'Internal route disabled in production', code: 'FORBIDDEN' },
      });
    }

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

export default router;
