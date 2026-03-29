import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgRepository } from '../../application/interfaces/IOrgRepository';

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

  let event: any;

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (error) {
    console.log('Webhook JSON parse failed:', error);
    res.status(400).send('Invalid payload');
    return;
  }

  console.log('Webhook received:', event);

  const eventName = event?.meta?.event_name;

  if (!VALID_EVENTS.has(eventName)) {
    console.log('Ignoring unsupported webhook event:', eventName ?? null);
    res.status(200).send('Ignored');
    return;
  }

  const orgId = event?.data?.attributes?.custom_data?.orgId;
  const attributes = event?.data?.attributes;

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

  await orgRepository.updateOrgSubscription(orgId, {
    plan: attributes.status === 'active' ? 'pro' : org.plan ?? 'free',
    subscriptionStatus: attributes.status ?? null,
    subscriptionId: event?.data?.id ?? null,
    currentPeriodEnd: attributes.renews_at
      ? new Date(attributes.renews_at)
      : null,
  });

  console.log('Updated org subscription from webhook:', {
    orgId,
    eventName,
    status: attributes.status ?? null,
    subscriptionId: event?.data?.id ?? null,
    renewsAt: attributes.renews_at ?? null,
  });

  res.status(200).send('OK');
});

export default router;