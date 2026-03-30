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
  const rawBody = req.body;
  const signatureHeader = req.headers['x-signature'];

  if (!signatureHeader || Array.isArray(signatureHeader)) {
    console.log('Webhook missing signature header');
    res.status(401).send('Missing signature');
    return;
  }

  const webhookSecret = process.env.LEMON_WEBHOOK_SECRET;

  if (!webhookSecret || !Buffer.isBuffer(rawBody)) {
    console.log('Webhook secret or raw body missing');
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
    console.log('Webhook signature verification failed');
    res.status(401).send('Invalid signature');
    return;
  }

  let event: LemonWebhookEvent;

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (error) {
    console.log('Webhook JSON parse failed:', error);
    res.status(400).send('Invalid payload');
    return;
  }

  console.log('Webhook received:', event);

  const eventName = event?.meta?.event_name;
  const eventId = event?.data?.id;

  if (!eventId) {
    console.log('Webhook missing event id');
    res.status(200).send('OK');
    return;
  }

  const existing = await db
    .select()
    .from(webhookEventsTable)
    .where(eq(webhookEventsTable.id, eventId))
    .limit(1);

  if (existing.length > 0) {
    console.log('Duplicate webhook ignored', { eventId, eventName: eventName ?? null });
    res.status(200).send('OK');
    return;
  }

  await db.insert(webhookEventsTable).values({ id: eventId });

  if (!eventName || !VALID_EVENTS.has(eventName)) {
    console.log('Ignoring unsupported webhook event:', eventName ?? null);
    res.status(200).send('Ignored');
    return;
  }

  const orgId = event?.data?.attributes?.custom_data?.orgId;
  const attributes = event?.data?.attributes;
  const status = attributes?.status;
  const renewsAt = attributes?.renews_at;

  if (!event?.data || !attributes || !orgId) {
    console.log('Webhook missing orgId:', req.body);
    res.status(200).send('OK');
    return;
  }

  const orgRepository = container.resolve<IOrgRepository>(TYPES.IOrgRepository);
  const org = await orgRepository.findById(orgId);

  if (!org) {
    console.log('invalid orgId', { orgId });
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
    console.log('Webhook received unhandled subscription status:', {
      orgId,
      eventName,
      status: status ?? null,
    });
  }

  await orgRepository.updateOrgSubscription(orgId, {
    plan,
    subscriptionStatus,
    subscriptionId: event?.data?.id ?? null,
    currentPeriodEnd: renewsAt
      ? new Date(renewsAt)
      : null,
  });

  console.log('Updated org subscription from webhook:', {
    orgId,
    eventName,
    plan,
    status: subscriptionStatus,
    subscriptionId: event?.data?.id ?? null,
    renewsAt: renewsAt ?? null,
  });

  res.status(200).send('OK');
});

export default router;