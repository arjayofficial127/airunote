import { NextFunction, Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { ExamService, ExamServiceError } from '../../modules/exams/exam.service';
import { attemptEventSchema, saveAnswerSchema, startAttemptSchema } from '../../modules/exams/exam.types';

const router: ReturnType<typeof Router> = Router();
const service = new ExamService();

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

function attemptToken(req: Request): string {
  const token = req.header('x-exam-attempt-token');
  if (!token) throw new ExamServiceError('Attempt token is required', 401, 'ATTEMPT_TOKEN_REQUIRED');
  return token;
}

router.get('/:publicId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.getPublicOverview(req.params.publicId) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/:publicId/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = startAttemptSchema.parse(req.body);
    const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const ipAddress = forwarded || req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.header('user-agent') || 'unknown';
    res.status(201).json({ success: true, data: await service.startAttempt(req.params.publicId, input, { ipAddress, userAgent }) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/attempts/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.getAttempt(attemptToken(req)) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.put('/attempts/current/answers/:questionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = saveAnswerSchema.parse(req.body);
    res.json({ success: true, data: await service.saveAnswer(attemptToken(req), req.params.questionId, input.answer) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/attempts/current/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = attemptEventSchema.parse(req.body);
    res.json({ success: true, data: await service.recordEvent(attemptToken(req), input.eventType, input.metadata ?? {}) });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/attempts/current/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await service.submit(attemptToken(req)) });
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;
