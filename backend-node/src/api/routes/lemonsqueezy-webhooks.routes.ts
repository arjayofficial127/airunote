import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IBillingUseCase } from '../../application/use-cases/BillingUseCase';

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
    custom_data?: {
      orgId?: string;
      billingIntentId?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      custom_data?: {
        orgId?: string;
        billingIntentId?: string;
      };
      status?: string;
      renews_at?: string | null;
      order_id?: number | string | null;
      first_order_item?: {
        order_id?: number | string | null;
      } | null;
      customer_id?: number | string | null;
      user_email?: string | null;
      customer_email?: string | null;
      email?: string | null;
    };
  };
};

function asNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = asNullableString(value);
  return normalized ? normalized.toLowerCase() : null;
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

    const webhookEventKey = crypto
      .createHash('sha256')
      .update(rawBody)
      .digest('hex');

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
    const resourceId = event?.data?.id ?? null;
    const attributes = event?.data?.attributes;
    const status = attributes?.status;
    const renewsAt = attributes?.renews_at;
    const billingIntentId = event?.meta?.custom_data?.billingIntentId
      ?? event?.data?.attributes?.custom_data?.billingIntentId
      ?? null;
    const customDataOrgId = event?.meta?.custom_data?.orgId ?? event?.data?.attributes?.custom_data?.orgId ?? null;
    const subscriptionId = asNullableString(resourceId);
    const orderId = asNullableString(attributes?.order_id) ?? asNullableString(attributes?.first_order_item?.order_id);
    const customerId = asNullableString(attributes?.customer_id);
    const customerEmail = normalizeEmail(attributes?.customer_email)
      ?? normalizeEmail(attributes?.user_email)
      ?? normalizeEmail(attributes?.email);

    if (!eventName || !VALID_EVENTS.has(eventName)) {
      console.log('Webhook event ignored', {
        eventName: eventName ?? null,
      });
      sendResponse(200, 'OK');
      return;
    }

    const billingUseCase = container.resolve<IBillingUseCase>(TYPES.IBillingUseCase);
    const result = await billingUseCase.processWebhook({
      eventKey: webhookEventKey,
      eventName,
      billingIntentId,
      orgId: customDataOrgId,
      subscriptionId,
      orderId,
      customerId,
      customerEmail,
      status,
      renewsAt,
    });

    if (result.isErr()) {
      throw result.error;
    }

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