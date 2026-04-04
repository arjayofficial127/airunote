import { inject, injectable } from 'tsyringe';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/AppError';
import { Result } from '../../core/result/Result';
import {
  BillingIntentRecord,
  BillingIntentStatus,
  IBillingIntentRepository,
} from '../interfaces/IBillingIntentRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IWebhookEventRepository } from '../interfaces/IWebhookEventRepository';
import { TYPES } from '../../core/di/types';

const ACTIVE_PENDING_WINDOW_MS = 30 * 60 * 1000;
const EMAIL_FALLBACK_WINDOW_MS = 30 * 60 * 1000;
const SUPPORTED_TARGET_PLANS = new Set(['pro']);

type BillingWebhookStatus = 'active' | 'cancelled' | 'expired';
type ReconciliationPath = 'billingIntentId' | 'subscriptionId' | 'orderId' | 'customerId' | 'email' | 'orgId' | 'none';

export interface PrepareCheckoutIntentInput {
  orgId: string;
  userId: string;
  userEmail: string;
  targetPlan: string;
  source: string;
}

export interface PrepareCheckoutIntentResult {
  billingIntentId: string;
  reused: boolean;
}

export interface ProcessBillingWebhookInput {
  eventKey: string;
  eventName: string;
  billingIntentId?: string | null;
  orgId?: string | null;
  subscriptionId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  status?: string | null;
  renewsAt?: string | null;
}

export interface ProcessBillingWebhookResult {
  duplicate: boolean;
  action: 'ignored' | 'noop' | 'updated' | 'duplicate';
  reconciliation: ReconciliationPath;
  orgId: string | null;
  billingIntentId: string | null;
}

export interface ManualRecoverBillingInput {
  orgId: string;
  actorUserId: string;
  actorEmail: string;
  targetPlan: string;
  source: string;
  subscriptionId?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
}

export interface ManualRecoverBillingResult {
  billingIntentId: string;
  orgId: string;
  subscriptionId: string | null;
}

export interface IBillingUseCase {
  prepareCheckoutIntent(input: PrepareCheckoutIntentInput): Promise<Result<PrepareCheckoutIntentResult, Error>>;
  processWebhook(input: ProcessBillingWebhookInput): Promise<Result<ProcessBillingWebhookResult, Error>>;
  manualRecover(input: ManualRecoverBillingInput): Promise<Result<ManualRecoverBillingResult, Error>>;
}

type ReconciliationResult = {
  billingIntent: BillingIntentRecord | null;
  orgId: string | null;
  path: ReconciliationPath;
};

@injectable()
export class BillingUseCase implements IBillingUseCase {
  constructor(
    @inject(TYPES.IBillingIntentRepository) private readonly billingIntentRepository: IBillingIntentRepository,
    @inject(TYPES.IOrgRepository) private readonly orgRepository: IOrgRepository,
    @inject(TYPES.IWebhookEventRepository) private readonly webhookEventRepository: IWebhookEventRepository,
  ) {}

  async prepareCheckoutIntent(input: PrepareCheckoutIntentInput): Promise<Result<PrepareCheckoutIntentResult, Error>> {
    const targetPlan = this.normalizeTargetPlan(input.targetPlan);
    if (!SUPPORTED_TARGET_PLANS.has(targetPlan)) {
      return Result.err(new BadRequestError(`Unsupported billing target plan: ${targetPlan}`));
    }

    const source = this.normalizeSource(input.source);
    const userEmail = this.normalizeEmail(input.userEmail);
    const staleBoundary = new Date(Date.now() - ACTIVE_PENDING_WINDOW_MS);
    const pending = await this.billingIntentRepository.findPendingByOrgUserPlan(input.orgId, input.userId, targetPlan);
    const fresh = pending.find((intent) => intent.createdAt >= staleBoundary) ?? null;

    if (fresh) {
      await this.resolveRedundantPending(pending.filter((intent) => intent.id !== fresh.id));
      this.log('info', 'Checkout intent reused', { orgId: input.orgId, billingIntentId: fresh.id, targetPlan, source });
      return Result.ok({ billingIntentId: fresh.id, reused: true });
    }

    await this.expirePending(pending);

    try {
      const created = await this.billingIntentRepository.createPending({
        orgId: input.orgId,
        createdByUserId: input.userId,
        userEmail,
        targetPlan,
        source,
      });

      this.log('info', 'Checkout intent created', { orgId: input.orgId, billingIntentId: created.id, targetPlan, source });
      return Result.ok({ billingIntentId: created.id, reused: false });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const concurrent = await this.billingIntentRepository.findPendingByOrgUserPlan(input.orgId, input.userId, targetPlan);
        const latest = concurrent[0] ?? null;
        if (latest) {
          return Result.ok({ billingIntentId: latest.id, reused: true });
        }
      }

      throw error;
    }
  }

  async processWebhook(input: ProcessBillingWebhookInput): Promise<Result<ProcessBillingWebhookResult, Error>> {
    const accepted = await this.webhookEventRepository.create(input.eventKey);
    if (!accepted) {
      return Result.ok({
        duplicate: true,
        action: 'duplicate',
        reconciliation: 'none',
        orgId: null,
        billingIntentId: null,
      });
    }

    const reconciliation = await this.reconcile(input);
    if (!reconciliation.orgId) {
      this.log('warn', 'Webhook could not be reconciled', {
        eventName: input.eventName,
        eventKey: input.eventKey,
        billingIntentId: input.billingIntentId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        customerEmail: input.customerEmail ?? null,
      });

      return Result.ok({
        duplicate: false,
        action: 'ignored',
        reconciliation: reconciliation.path,
        orgId: null,
        billingIntentId: reconciliation.billingIntent?.id ?? null,
      });
    }

    const org = await this.orgRepository.findById(reconciliation.orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', reconciliation.orgId));
    }

    const correlationData = {
      subscriptionId: this.normalizeNullableString(input.subscriptionId),
      orderId: this.normalizeNullableString(input.orderId),
      customerId: this.normalizeNullableString(input.customerId),
      customerEmail: this.normalizeOptionalEmail(input.customerEmail),
      lastEventName: input.eventName,
      failureReason: null,
    };

    if (reconciliation.billingIntent) {
      await this.billingIntentRepository.recordEvent(reconciliation.billingIntent.id, correlationData);
    }

    const webhookStatus = this.normalizeWebhookStatus(input.status);
    const decision = this.getOrgUpdateDecision({
      currentSubscriptionId: org.subscriptionId ?? null,
      currentStatus: org.subscriptionStatus ?? null,
      incomingSubscriptionId: correlationData.subscriptionId,
      incomingStatus: webhookStatus,
    });

    if (decision.apply) {
      await this.orgRepository.updateOrgSubscription(org.id, {
        plan: decision.plan,
        subscriptionStatus: decision.subscriptionStatus,
        subscriptionId: correlationData.subscriptionId ?? org.subscriptionId ?? null,
        currentPeriodEnd: input.renewsAt ? new Date(input.renewsAt) : null,
      });
    }

    if (reconciliation.billingIntent) {
      await this.applyIntentTransition(reconciliation.billingIntent, webhookStatus, correlationData);
    }

    this.log('info', 'Webhook processed', {
      eventName: input.eventName,
      eventKey: input.eventKey,
      orgId: org.id,
      billingIntentId: reconciliation.billingIntent?.id ?? null,
      reconciliation: reconciliation.path,
      action: decision.apply ? 'updated' : 'noop',
    });

    return Result.ok({
      duplicate: false,
      action: decision.apply ? 'updated' : 'noop',
      reconciliation: reconciliation.path,
      orgId: org.id,
      billingIntentId: reconciliation.billingIntent?.id ?? null,
    });
  }

  async manualRecover(input: ManualRecoverBillingInput): Promise<Result<ManualRecoverBillingResult, Error>> {
    const targetPlan = this.normalizeTargetPlan(input.targetPlan);
    if (!SUPPORTED_TARGET_PLANS.has(targetPlan)) {
      return Result.err(new BadRequestError(`Unsupported billing target plan: ${targetPlan}`));
    }

    const org = await this.orgRepository.findById(input.orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', input.orgId));
    }

    let billingIntent = await this.findManualIntent(input);
    const subscriptionId = this.normalizeNullableString(input.subscriptionId) ?? billingIntent?.lemonSubscriptionId ?? null;
    if (!billingIntent && !subscriptionId) {
      return Result.err(new BadRequestError('Manual recovery requires a subscription id when no existing billing intent can be found'));
    }

    if (subscriptionId) {
      const existingOrg = await this.orgRepository.findBySubscriptionId(subscriptionId);
      if (existingOrg && existingOrg.id !== input.orgId) {
        return Result.err(new ConflictError('This Lemon subscription is already attached to a different organization'));
      }
    }

    if (billingIntent && billingIntent.orgId !== input.orgId) {
      return Result.err(new ConflictError('The matched billing intent belongs to a different organization'));
    }

    const customerEmail = this.normalizeOptionalEmail(input.customerEmail) ?? this.normalizeEmail(input.actorEmail);
    if (!billingIntent) {
      billingIntent = await this.billingIntentRepository.createPending({
        orgId: input.orgId,
        createdByUserId: input.actorUserId,
        userEmail: customerEmail,
        targetPlan,
        source: this.normalizeSource(input.source),
      });
    }

    await this.billingIntentRepository.resolve(billingIntent.id, 'completed', {
      subscriptionId,
      orderId: this.normalizeNullableString(input.orderId),
      customerId: this.normalizeNullableString(input.customerId),
      customerEmail,
      lastEventName: 'manual_recovery',
      failureReason: null,
    });

    await this.orgRepository.updateOrgSubscription(input.orgId, {
      plan: targetPlan,
      subscriptionStatus: 'active',
      subscriptionId,
      currentPeriodEnd: org.currentPeriodEnd ?? null,
    });

    this.log('info', 'Manual billing recovery applied', { orgId: input.orgId, billingIntentId: billingIntent.id, subscriptionId });
    return Result.ok({ billingIntentId: billingIntent.id, orgId: input.orgId, subscriptionId });
  }

  private async findManualIntent(input: ManualRecoverBillingInput): Promise<BillingIntentRecord | null> {
    const subscriptionId = this.normalizeNullableString(input.subscriptionId);
    if (subscriptionId) {
      const bySubscription = await this.billingIntentRepository.findBySubscriptionId(subscriptionId);
      if (bySubscription) {
        return bySubscription;
      }
    }

    const orderId = this.normalizeNullableString(input.orderId);
    if (orderId) {
      const byOrder = await this.billingIntentRepository.findByOrderId(orderId);
      if (byOrder) {
        return byOrder;
      }
    }

    const customerId = this.normalizeNullableString(input.customerId);
    if (customerId) {
      const byCustomer = await this.billingIntentRepository.findByCustomerId(customerId);
      if (byCustomer) {
        return byCustomer;
      }
    }

    return null;
  }

  private async reconcile(input: ProcessBillingWebhookInput): Promise<ReconciliationResult> {
    const billingIntentId = this.normalizeNullableString(input.billingIntentId);
    if (billingIntentId) {
      const intent = await this.billingIntentRepository.findById(billingIntentId);
      if (intent) {
        return { billingIntent: intent, orgId: intent.orgId, path: 'billingIntentId' };
      }
    }

    const subscriptionId = this.normalizeNullableString(input.subscriptionId);
    if (subscriptionId) {
      const intent = await this.billingIntentRepository.findBySubscriptionId(subscriptionId);
      if (intent) {
        return { billingIntent: intent, orgId: intent.orgId, path: 'subscriptionId' };
      }

      const org = await this.orgRepository.findBySubscriptionId(subscriptionId);
      if (org) {
        return { billingIntent: null, orgId: org.id, path: 'subscriptionId' };
      }
    }

    const orderId = this.normalizeNullableString(input.orderId);
    if (orderId) {
      const intent = await this.billingIntentRepository.findByOrderId(orderId);
      if (intent) {
        return { billingIntent: intent, orgId: intent.orgId, path: 'orderId' };
      }
    }

    const customerId = this.normalizeNullableString(input.customerId);
    if (customerId) {
      const intent = await this.billingIntentRepository.findByCustomerId(customerId);
      if (intent) {
        return { billingIntent: intent, orgId: intent.orgId, path: 'customerId' };
      }
    }

    const customerEmail = this.normalizeOptionalEmail(input.customerEmail);
    if (customerEmail) {
      const pending = await this.billingIntentRepository.findRecentPendingByEmail(
        customerEmail,
        new Date(Date.now() - EMAIL_FALLBACK_WINDOW_MS),
      );

      if (pending.length === 1) {
        return { billingIntent: pending[0], orgId: pending[0].orgId, path: 'email' };
      }

      if (pending.length > 1) {
        this.log('warn', 'Ambiguous email fallback skipped', { customerEmail, billingIntentIds: pending.map((item) => item.id) });
      }
    }

    const orgId = this.normalizeNullableString(input.orgId);
    if (orgId) {
      return { billingIntent: null, orgId, path: 'orgId' };
    }

    return { billingIntent: null, orgId: null, path: 'none' };
  }

  private getOrgUpdateDecision(input: {
    currentSubscriptionId: string | null;
    currentStatus: string | null;
    incomingSubscriptionId: string | null;
    incomingStatus: BillingWebhookStatus | null;
  }): { apply: boolean; plan: string; subscriptionStatus: string | null } {
    if (!input.incomingStatus) {
      return { apply: false, plan: 'free', subscriptionStatus: input.currentStatus };
    }

    if (input.incomingStatus === 'active') {
      if (input.currentStatus === 'active' && input.currentSubscriptionId === input.incomingSubscriptionId) {
        return { apply: false, plan: 'pro', subscriptionStatus: 'active' };
      }

      return { apply: true, plan: 'pro', subscriptionStatus: 'active' };
    }

    if (
      input.currentSubscriptionId
      && input.incomingSubscriptionId
      && input.currentSubscriptionId !== input.incomingSubscriptionId
    ) {
      return { apply: false, plan: 'free', subscriptionStatus: input.currentStatus };
    }

    return {
      apply: true,
      plan: 'free',
      subscriptionStatus: input.incomingStatus === 'cancelled' ? 'cancelled' : 'expired',
    };
  }

  private async applyIntentTransition(
    billingIntent: BillingIntentRecord,
    webhookStatus: BillingWebhookStatus | null,
    correlationData: {
      subscriptionId: string | null;
      orderId: string | null;
      customerId: string | null;
      customerEmail: string | null;
      lastEventName: string;
      failureReason: string | null;
    },
  ): Promise<void> {
    if (webhookStatus === 'active') {
      await this.billingIntentRepository.resolve(billingIntent.id, 'completed', correlationData);
      return;
    }

    if (webhookStatus === 'cancelled' && billingIntent.status !== 'completed') {
      await this.billingIntentRepository.resolve(billingIntent.id, 'cancelled', {
        ...correlationData,
        failureReason: 'subscription_cancelled',
      });
      return;
    }

    if (webhookStatus === 'expired' && billingIntent.status !== 'completed') {
      await this.billingIntentRepository.resolve(billingIntent.id, 'expired', {
        ...correlationData,
        failureReason: 'subscription_expired',
      });
      return;
    }

    await this.billingIntentRepository.recordEvent(billingIntent.id, correlationData);
  }

  private async expirePending(intents: BillingIntentRecord[]): Promise<void> {
    await Promise.all(intents.map((intent) => this.billingIntentRepository.resolve(intent.id, 'expired', {
      subscriptionId: intent.lemonSubscriptionId,
      orderId: intent.lemonOrderId,
      customerId: intent.lemonCustomerId,
      customerEmail: intent.lemonCustomerEmail,
      lastEventName: 'pending_intent_expired',
      failureReason: 'stale_pending_intent',
    })));
  }

  private async resolveRedundantPending(intents: BillingIntentRecord[]): Promise<void> {
    await Promise.all(intents.map((intent) => this.billingIntentRepository.resolve(intent.id, 'cancelled', {
      subscriptionId: intent.lemonSubscriptionId,
      orderId: intent.lemonOrderId,
      customerId: intent.lemonCustomerId,
      customerEmail: intent.lemonCustomerEmail,
      lastEventName: 'checkout_reused',
      failureReason: 'superseded_by_repeated_checkout',
    })));
  }

  private normalizeTargetPlan(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeSource(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized.slice(0, 100) : 'unknown';
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeOptionalEmail(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private normalizeNullableString(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private normalizeWebhookStatus(value: string | null | undefined): BillingWebhookStatus | null {
    const normalized = value?.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'cancelled' || normalized === 'expired') {
      return normalized;
    }

    return null;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === '23505';
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data: Record<string, unknown>): void {
    const logger = level === 'warn' ? console.warn : level === 'error' ? console.error : console.info;
    logger(`[Billing] ${message}`, data);
  }
}