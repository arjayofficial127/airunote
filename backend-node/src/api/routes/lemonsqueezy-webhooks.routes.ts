import { Request, Response, Router } from 'express';
import { container } from '../../core/di/container';
import { TYPES } from '../../core/di/types';
import { IOrgRepository } from '../../application/interfaces/IOrgRepository';

const router: ReturnType<typeof Router> = Router();

router.post('/', async (req: Request, res: Response) => {
  console.log('Webhook received:', req.body);

  const event = req.body;
  const orgId = event?.data?.attributes?.custom_data?.orgId;

  if (!orgId) {
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
    plan: 'pro',
    subscriptionStatus: 'active',
    subscriptionId: event?.data?.id ?? null,
    currentPeriodEnd: event?.data?.attributes?.renews_at
      ? new Date(event.data.attributes.renews_at)
      : null,
  });

  console.log('Updated org subscription from webhook:', {
    orgId,
    subscriptionId: event?.data?.id ?? null,
    renewsAt: event?.data?.attributes?.renews_at ?? null,
  });

  res.status(200).send('OK');
});

export default router;