import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { eq } from 'drizzle-orm';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgRepository } from '../../application/interfaces/IOrgRepository';
import { db } from '../../infrastructure/db/drizzle/client';
import { webhookEventsTable } from '../../infrastructure/db/drizzle/schema';

const router: ReturnType<typeof Router> = Router();
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

router.post('/', async (req: LemonWebhookRequest, res: Response) => {
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
      res.status(401).send('Missing signature');
      return;
    }

    const webhookSecret = process.env.LEMON_WEBHOOK_SECRET;

    if (!webhookSecret || !Buffer.isBuffer(rawBody)) {
      console.warn('Webhook secret or raw body missing', {
        ip: req.ip,
      });
      res.status(401).send('Invalid signature');
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
      res.status(401).send('Invalid signature');
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
      res.status(400).send('Invalid payload');
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
      res.status(200).send('OK');
      return;
    }

    const existing = await db
      .select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.id, eventId))
      .limit(1);

    if (existing.length > 0) {
      console.warn('Duplicate webhook ignored', {
        eventId,
      });
      res.status(200).send('OK');
      return;
    }

    await db.insert(webhookEventsTable).values({ id: eventId });

    if (!eventName || !VALID_EVENTS.has(eventName)) {
      console.log('Webhook event ignored', {
        eventName: eventName ?? null,
      });
      res.status(200).send('Ignored');
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
      res.status(200).send('OK');
      return;
    }

    const orgRepository = container.resolve<IOrgRepository>(TYPES.IOrgRepository);
    const org = await orgRepository.findById(orgId);

    if (!org) {
      console.log('Invalid orgId', {
        orgId,
        eventId,
      });
      res.status(200).send('OK');
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

    await orgRepository.updateOrgSubscription(orgId, {
      plan,
      subscriptionStatus,
      subscriptionId: event?.data?.id ?? null,
      currentPeriodEnd: renewsAt
        ? new Date(renewsAt)
        : null,
    });

    console.log('Org subscription updated', {
      orgId,
      plan,
      subscriptionStatus,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).send('Internal Server Error');
  }
});

export default router;