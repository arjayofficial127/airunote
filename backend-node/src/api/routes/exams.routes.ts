import { NextFunction, Request, Response, Router } from 'express';
import { ZodError, ZodType } from 'zod';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireOrgRole } from '../middleware/requireOrgRole';
import { ExamService, ExamServiceError } from '../../modules/exams/exam.service';
import {
  continueAttemptSchema,
  createExamSchema,
  examOrgSettingsSchema,
  updateExamSchema,
  updateQuestionGradingSchema,
  voidAttemptSchema,
} from '../../modules/exams/exam.types';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });
const service = new ExamService();

router.use(authMiddleware);
router.use(requireOrgRole(['admin', 'superadmin', 'member']));

function parse<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request', issues: error.issues } });
    return;
  }
  if (error instanceof ExamServiceError) {
    res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}

router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.getOrgSettings(req.params.orgId) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parse(examOrgSettingsSchema, req.body);
    res.json({ success: true, data: await service.updateOrgSettings(req.params.orgId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.list(req.params.orgId, req.query.archived === 'true') });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    const input = parse(createExamSchema, req.body);
    res.status(201).json({ success: true, data: await service.create(req.params.orgId, userId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    const input = parse(createExamSchema, req.body);
    res.status(201).json({ success: true, data: await service.create(req.params.orgId, userId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/:examId/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.report(req.params.orgId, req.params.examId) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/attempts/:attemptId/continue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parse(continueAttemptSchema, req.body);
    res.json({
      success: true,
      data: await service.continueAttempt(req.params.orgId, req.params.examId, req.params.attemptId, input.additionalMinutes ?? 0),
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/attempts/:attemptId/void', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    const input = parse(voidAttemptSchema, req.body);
    res.json({ success: true, data: await service.voidAttempt(req.params.orgId, req.params.examId, req.params.attemptId, userId, input.reason) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    res.status(201).json({ success: true, data: await service.startPreview(req.params.orgId, req.params.examId, req.user) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    res.status(201).json({ success: true, data: await service.duplicate(req.params.orgId, req.params.examId, userId) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    await service.archive(req.params.orgId, req.params.examId, userId);
    res.json({ success: true, data: { archived: true } });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:examId/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.restore(req.params.orgId, req.params.examId);
    res.json({ success: true, data: { archived: false } });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.patch('/:examId/questions/:questionId/grading', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parse(updateQuestionGradingSchema, req.body);
    res.json({ success: true, data: await service.updateQuestionGrading(req.params.orgId, req.params.examId, req.params.questionId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.put('/:examId/definition', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parse(createExamSchema, req.body);
    res.json({ success: true, data: await service.replaceDefinition(req.params.orgId, req.params.examId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/:examId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.get(req.params.orgId, req.params.examId) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.patch('/:examId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parse(updateExamSchema, req.body);
    res.json({ success: true, data: await service.update(req.params.orgId, req.params.examId, input) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.delete('/:examId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ExamServiceError('Authentication required', 401, 'UNAUTHORIZED');
    await service.archive(req.params.orgId, req.params.examId, userId);
    res.json({ success: true, data: { archived: true } });
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;
