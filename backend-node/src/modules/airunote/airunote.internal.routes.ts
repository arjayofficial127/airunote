/**
 * Airunote Internal Routes
 * Temporary internal-only endpoint for testing root provisioning
 */
import { Router, Request, Response } from 'express';
import { container } from '../../core/di/container';
import { AirunoteDomainService } from './airunote.domainService';

const router: ReturnType<typeof Router> = Router();

interface ProvisionRequest {
  orgId: string;
  userId: string;
  ownerUserId: string;
}

router.post('/provision', async (req: Request, res: Response, next) => {
  try {
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

    if (!body.ownerUserId || typeof body.ownerUserId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'ownerUserId is required and must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    // Resolve service via container
    const domainService = container.resolve(AirunoteDomainService);

    // Call domain service
    const rootFolder = await domainService.ensureUserRootExists(
      body.orgId,
      body.userId,
      body.ownerUserId
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
