import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BillingUseCase } from '../../src/application/use-cases/BillingUseCase';
import { IBillingIntentRepository } from '../../src/application/interfaces/IBillingIntentRepository';
import { IOrgRepository } from '../../src/application/interfaces/IOrgRepository';
import { IWebhookEventRepository } from '../../src/application/interfaces/IWebhookEventRepository';
import { BadRequestError, ConflictError } from '../../src/core/errors/AppError';

describe('BillingUseCase', () => {
  let billingUseCase: BillingUseCase;
  let mockBillingIntentRepository: jest.Mocked<IBillingIntentRepository>;
  let mockOrgRepository: jest.Mocked<IOrgRepository>;
  let mockWebhookEventRepository: jest.Mocked<IWebhookEventRepository>;

  const now = new Date('2025-01-01T12:00:00.000Z');

  const makeIntent = (overrides: Partial<ReturnType<typeof baseIntent>> = {}) => ({
    ...baseIntent(),
    ...overrides,
  });

  function baseIntent() {
    return {
      id: 'intent-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      userEmail: 'owner@example.com',
      targetPlan: 'pro',
      source: 'org_settings',
      status: 'pending' as const,
      lemonSubscriptionId: null,
      lemonOrderId: null,
      lemonCustomerId: null,
      lemonCustomerEmail: null,
      lastEventName: null,
      failureReason: null,
      completedAt: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    mockBillingIntentRepository = {
      createPending: jest.fn(),
      findById: jest.fn(),
      findBySubscriptionId: jest.fn(),
      findByOrderId: jest.fn(),
      findByCustomerId: jest.fn(),
      findPendingByOrgUserPlan: jest.fn(),
      findRecentPendingByEmail: jest.fn(),
      recordEvent: jest.fn(),
      resolve: jest.fn(),
    } as any;

    mockOrgRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findBySubscriptionId: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      updateOrgSubscription: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockWebhookEventRepository = {
      create: jest.fn(),
    };

    billingUseCase = new BillingUseCase(
      mockBillingIntentRepository,
      mockOrgRepository,
      mockWebhookEventRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses a fresh pending checkout intent', async () => {
    mockBillingIntentRepository.findPendingByOrgUserPlan.mockResolvedValue([makeIntent()]);

    const result = await billingUseCase.prepareCheckoutIntent({
      orgId: 'org-1',
      userId: 'user-1',
      userEmail: 'OWNER@example.com',
      targetPlan: 'pro',
      source: 'org_settings',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ billingIntentId: 'intent-1', reused: true });
    }
    expect(mockBillingIntentRepository.createPending).not.toHaveBeenCalled();
  });

  it('creates a new checkout intent when only stale pending intents exist', async () => {
    const staleIntent = makeIntent({
      id: 'intent-stale',
      createdAt: new Date(now.getTime() - (31 * 60 * 1000)),
    });

    mockBillingIntentRepository.findPendingByOrgUserPlan.mockResolvedValue([staleIntent]);
    mockBillingIntentRepository.createPending.mockResolvedValue(makeIntent({ id: 'intent-new' }));

    const result = await billingUseCase.prepareCheckoutIntent({
      orgId: 'org-1',
      userId: 'user-1',
      userEmail: 'owner@example.com',
      targetPlan: 'pro',
      source: 'org_settings',
    });

    expect(result.isOk()).toBe(true);
    expect(mockBillingIntentRepository.resolve).toHaveBeenCalledWith('intent-stale', 'expired', expect.objectContaining({
      failureReason: 'stale_pending_intent',
    }));
    expect(mockBillingIntentRepository.createPending).toHaveBeenCalledWith(expect.objectContaining({
      targetPlan: 'pro',
      source: 'org_settings',
    }));
  });

  it('treats duplicate webhook delivery as a no-op', async () => {
    mockWebhookEventRepository.create.mockResolvedValue(false);

    const result = await billingUseCase.processWebhook({
      eventKey: 'event-1',
      eventName: 'subscription_updated',
      subscriptionId: 'sub-1',
      status: 'active',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        duplicate: true,
        action: 'duplicate',
        reconciliation: 'none',
        orgId: null,
        billingIntentId: null,
      });
    }
    expect(mockOrgRepository.updateOrgSubscription).not.toHaveBeenCalled();
  });

  it('skips ambiguous email fallback during webhook reconciliation', async () => {
    mockWebhookEventRepository.create.mockResolvedValue(true);
    mockBillingIntentRepository.findById.mockResolvedValue(null);
    mockBillingIntentRepository.findBySubscriptionId.mockResolvedValue(null);
    mockBillingIntentRepository.findByOrderId.mockResolvedValue(null);
    mockBillingIntentRepository.findByCustomerId.mockResolvedValue(null);
    mockBillingIntentRepository.findRecentPendingByEmail.mockResolvedValue([
      makeIntent({ id: 'intent-1' }),
      makeIntent({ id: 'intent-2', orgId: 'org-2' }),
    ]);

    const result = await billingUseCase.processWebhook({
      eventKey: 'event-2',
      eventName: 'subscription_updated',
      customerEmail: 'owner@example.com',
      status: 'active',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.action).toBe('ignored');
      expect(result.value.reconciliation).toBe('none');
    }
    expect(mockOrgRepository.findById).not.toHaveBeenCalled();
  });

  it('completes an intent and upgrades the org on active subscription webhook', async () => {
    const intent = makeIntent();

    mockWebhookEventRepository.create.mockResolvedValue(true);
    mockBillingIntentRepository.findById.mockResolvedValue(intent);
    mockOrgRepository.findById.mockResolvedValue({
      id: 'org-1',
      name: 'Org One',
      slug: 'org-one',
      description: null,
      plan: 'free',
      subscriptionStatus: null,
      subscriptionId: null,
      currentPeriodEnd: null,
      isActive: true,
      createdAt: now,
    } as any);

    const result = await billingUseCase.processWebhook({
      eventKey: 'event-3',
      eventName: 'subscription_created',
      billingIntentId: 'intent-1',
      subscriptionId: 'sub-1',
      orderId: 'order-1',
      customerId: 'cust-1',
      customerEmail: 'owner@example.com',
      status: 'active',
      renewsAt: '2025-02-01T00:00:00.000Z',
    });

    expect(result.isOk()).toBe(true);
    expect(mockOrgRepository.updateOrgSubscription).toHaveBeenCalledWith('org-1', {
      plan: 'pro',
      subscriptionStatus: 'active',
      subscriptionId: 'sub-1',
      currentPeriodEnd: new Date('2025-02-01T00:00:00.000Z'),
    });
    expect(mockBillingIntentRepository.resolve).toHaveBeenCalledWith('intent-1', 'completed', expect.objectContaining({
      subscriptionId: 'sub-1',
      orderId: 'order-1',
      customerId: 'cust-1',
    }));
  });

  it('rejects manual recovery if the subscription belongs to another org', async () => {
    mockOrgRepository.findById.mockResolvedValue({
      id: 'org-1',
      name: 'Org One',
      slug: 'org-one',
      description: null,
      plan: 'free',
      subscriptionStatus: null,
      subscriptionId: null,
      currentPeriodEnd: null,
      isActive: true,
      createdAt: now,
    } as any);
    mockBillingIntentRepository.findBySubscriptionId.mockResolvedValue(null);
    mockOrgRepository.findBySubscriptionId.mockResolvedValue({ id: 'org-2' } as any);

    const result = await billingUseCase.manualRecover({
      orgId: 'org-1',
      actorUserId: 'user-1',
      actorEmail: 'owner@example.com',
      targetPlan: 'pro',
      source: 'manual_recovery',
      subscriptionId: 'sub-1',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ConflictError);
    }
  });

  it('rejects unsupported checkout plan targets', async () => {
    const result = await billingUseCase.prepareCheckoutIntent({
      orgId: 'org-1',
      userId: 'user-1',
      userEmail: 'owner@example.com',
      targetPlan: 'enterprise',
      source: 'org_settings',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(BadRequestError);
    }
  });
});