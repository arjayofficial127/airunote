import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { eq } from 'drizzle-orm';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgRepository } from '../../application/interfaces/IOrgRepository';
import { db } from '../../infrastructure/db/drizzle/client';
import { webhookEventsTable } from '../../infrastructure/db/drizzle/schema';

const router: ReturnType<typeof Router> = Router();
const WEBHOOK_TIMEOUT_MS = 5000;
const VALID_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_expired',
]);

type LemonWebhookRequest = Request & {
  body: Buffer;
};

type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
  };
  data?: {
    id?: string;
    attributes?: {
      custom_data?: {
        orgId?: string;
      };
      status?: string;
      renews_at?: string | null;
    };
  };
};

type DatabaseErrorLike = {
  code?: string;
  message?: string;
};

function isDuplicateKeyError(error: unknown): error is DatabaseErrorLike {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as DatabaseErrorLike).code === '23505';
}

async function withDatabaseRetry<T>(
  operation: string,
  task: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.error('Webhook database operation failed', {
        operation,
        attempt,
        retries,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (attempt > retries) {
        break;
      }
    }
  }

  throw lastError;
}

router.post('/', async (req: LemonWebhookRequest, res: Response) => {
  let didRespond = false;

  const sendResponse = (status: number, body: string) => {
    if (didRespond || res.headersSent) {
      return;
    }

    didRespond = true;
    res.status(status).send(body);
  };

  const processWebhook = async () => {
    try {
    const rawBody = req.body;
    const signatureHeader = req.headers['x-signature'];

    console.log('Webhook received', {
      ip: req.ip,
      hasSignature: !!signatureHeader,
    });

    if (!signatureHeader || Array.isArray(signatureHeader)) {
      console.warn('Webhook missing signature header', {
        ip: req.ip,
      });
      sendResponse(401, 'Missing signature');
      return;
    }

    const webhookSecret = process.env.LEMON_WEBHOOK_SECRET;

    if (!webhookSecret || !Buffer.isBuffer(rawBody)) {
      console.warn('Webhook secret or raw body missing', {
        ip: req.ip,
      });
      sendResponse(401, 'Invalid signature');
      return;
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
    const computedBuffer = Buffer.from(computedSignature, 'utf8');

    if (
      signatureBuffer.length !== computedBuffer.length
      || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
    ) {
      console.warn('Webhook signature verification failed', {
        ip: req.ip,
      });
      sendResponse(401, 'Invalid signature');
      return;
    }

    console.log('Webhook verified', {
      valid: true,
    });

    let event: LemonWebhookEvent;

    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (error) {
      console.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      sendResponse(400, 'Invalid payload');
      return;
    }

    const eventName = event?.meta?.event_name;
    const eventId = event?.data?.id;
    const orgId = event?.data?.attributes?.custom_data?.orgId;

    console.log('Webhook event parsed', {
      eventName: eventName ?? null,
      eventId: eventId ?? null,
      orgId: orgId ?? null,
    });

    if (!eventId) {
      console.log('Webhook missing event id', {
        eventName: eventName ?? null,
      });
      sendResponse(200, 'OK');
      return;
    }

    const existing = await withDatabaseRetry('find processed webhook event', async () => db
      .select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.id, eventId))
      .limit(1));

    if (existing.length > 0) {
      console.warn('Duplicate webhook ignored', {
        eventId,
      });
      sendResponse(200, 'OK');
      return;
    }

    try {
      await withDatabaseRetry('insert processed webhook event', async () => db
        .insert(webhookEventsTable)
        .values({ id: eventId }));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        console.warn('Duplicate webhook ignored', {
          eventId,
        });
        sendResponse(200, 'OK');
        return;
      }

      throw error;
    }

    if (!eventName || !VALID_EVENTS.has(eventName)) {
      console.log('Webhook event ignored', {
        eventName: eventName ?? null,
      });
      sendResponse(200, 'OK');
      return;
    }

    const attributes = event?.data?.attributes;
    const status = attributes?.status;
    const renewsAt = attributes?.renews_at;

    if (!event?.data || !attributes || !orgId) {
      console.log('Webhook missing orgId', {
        eventId,
        eventName,
      });
      sendResponse(200, 'OK');
      return;
    }

    const orgRepository = container.resolve<IOrgRepository>(TYPES.IOrgRepository);
    const org = await withDatabaseRetry('find organization for webhook', async () => orgRepository.findById(orgId));

    if (!org) {
      console.log('Invalid orgId', {
        orgId,
        eventId,
      });
      sendResponse(200, 'OK');
      return;
    }

    let plan = org.plan ?? 'free';
    let subscriptionStatus = status ?? org.subscriptionStatus ?? null;

    if (status === 'active') {
      plan = 'pro';
      subscriptionStatus = 'active';
    } else if (status === 'cancelled') {
      plan = 'free';
      subscriptionStatus = 'cancelled';
    } else if (status === 'expired') {
      plan = 'free';
      subscriptionStatus = 'expired';
    } else {
      console.log('Webhook received unhandled subscription status', {
        orgId,
        eventName,
        status: status ?? null,
      });
    }

    console.log('Updating org subscription', {
      orgId,
      status: status ?? null,
      renewsAt: renewsAt ?? null,
    });

    await withDatabaseRetry('update organization subscription from webhook', async () => orgRepository.updateOrgSubscription(orgId, {
      plan,
      subscriptionStatus,
      subscriptionId: event?.data?.id ?? null,
      currentPeriodEnd: renewsAt
        ? new Date(renewsAt)
        : null,
    }));

    console.log('Org subscription updated', {
      orgId,
      plan,
      subscriptionStatus,
    });

      sendResponse(200, 'OK');
    } catch (error) {
      console.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      sendResponse(500, 'Internal Server Error');
    }
  };

  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      processWebhook(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Timeout')), WEBHOOK_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Timeout') {
      console.error('Webhook processing error', {
        error: error.message,
        stack: error.stack,
      });
      sendResponse(200, 'OK');
      return;
    }

    console.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    sendResponse(500, 'Internal Server Error');
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
});

export default router;