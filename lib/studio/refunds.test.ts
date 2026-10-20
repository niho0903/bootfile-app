import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { STUDIO_PRODUCT, type StudioOrderRow } from './types';
import { requestStudioRefund, verifyStudioRefundEligibility, verifyStudioRefundPayment } from './refunds';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), order: vi.fn(), intent: vi.fn(), list: vi.fn(), create: vi.fn(), retrieve: vi.fn(),
}));
vi.mock('./db', () => ({ studioRpc: mocks.rpc, getStudioOrder: mocks.order, studioDb: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({
  paymentIntents: { retrieve: mocks.intent },
  refunds: { list: mocks.list, create: mocks.create, retrieve: mocks.retrieve },
}) }));

const NOW = Date.UTC(2026, 9, 20, 12);
const DAY = 86_400_000;

function orderFixture(): StudioOrderRow {
  return {
    id: '3919c984-6f92-4c68-906e-545a22b175d7', product_version: STUDIO_PRODUCT.version,
    amount_total: 4900, currency: 'usd', stripe_payment_intent_id: 'pi_studio_fixture',
    stripe_checkout_session_id: 'cs_studio_fixture', payment_status: 'paid', status: 'ready',
    paid_at: new Date(NOW - DAY).toISOString(), created_at: new Date(NOW - DAY).toISOString(),
    updated_at: new Date(NOW - DAY).toISOString(), refund_status: 'none', refund_requested_at: null,
    stripe_refund_id: null, refunded_amount: 0, refund_attempts: 0,
    refund_next_attempt_at: new Date(NOW).toISOString(), refund_last_error_code: null,
  } as StudioOrderRow;
}

function chargeFixture(): Stripe.Charge {
  return {
    id: 'ch_studio_fixture', payment_intent: 'pi_studio_fixture', amount: 4900, amount_captured: 4900,
    currency: 'usd', paid: true, captured: true, disputed: false, refunded: false,
    amount_refunded: 0, payment_method_details: { type: 'card' },
  } as unknown as Stripe.Charge;
}

function intentFixture(charge = chargeFixture()): Stripe.PaymentIntent {
  return {
    id: 'pi_studio_fixture', status: 'succeeded', amount: 4900, amount_received: 4900,
    currency: 'usd', latest_charge: charge,
    metadata: { studio_order_id: orderFixture().id, product: STUDIO_PRODUCT.id, product_version: STUDIO_PRODUCT.version },
  } as unknown as Stripe.PaymentIntent;
}

function refundFixture(status: Stripe.Refund['status'] = 'succeeded'): Stripe.Refund {
  return { id: 're_studio_fixture', payment_intent: 'pi_studio_fixture', amount: 4900, currency: 'usd', status } as Stripe.Refund;
}

let current: StudioOrderRow;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  vi.stubEnv('STUDIO_REFUNDS_ENABLED', 'true');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder_for_mock_only');
  current = orderFixture();
  mocks.order.mockImplementation(async () => ({ ...current }));
  mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name === 'studio_request_refund') {
      current = { ...current, refund_status: 'pending', status: 'cancelled', refund_requested_at: new Date().toISOString() };
      return [{ ...current }];
    }
    if (name === 'studio_claim_refund') return [{ ...current, refund_lease_token: 'claim-fixture' }];
    if (name === 'studio_finish_refund') {
      const status = args.p_status as StudioOrderRow['refund_status'];
      current = { ...current, refund_status: status, stripe_refund_id: args.p_provider_id as string | null,
        refund_last_error_code: args.p_error_code as string | null,
        payment_status: status === 'completed' ? 'refunded' : current.payment_status };
      return true;
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
  mocks.intent.mockResolvedValue(intentFixture());
  mocks.list.mockResolvedValue({ data: [], has_more: false });
  mocks.create.mockResolvedValue(refundFixture());
  mocks.retrieve.mockResolvedValue(refundFixture());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('published seven-day refund boundary', () => {
  it('accepts a paid order exactly at the seven-day boundary', () => {
    expect(() => verifyStudioRefundEligibility({ ...current, paid_at: new Date(NOW - 7 * DAY).toISOString() }, NOW)).not.toThrow();
  });
  it.each([
    { paid_at: new Date(NOW - 7 * DAY - 1).toISOString() },
    { paid_at: new Date(NOW + 1).toISOString() },
    { paid_at: null }, { payment_status: 'disputed' }, { payment_status: 'awaiting_payment' },
    { amount_total: 499 }, { currency: 'eur' }, { product_version: 'other-product' },
  ])('rejects an ineligible order: %j', patch => {
    expect(() => verifyStudioRefundEligibility({ ...current, ...patch } as StudioOrderRow, NOW)).toThrow();
  });
  it('preserves the date of a valid request during later recovery', () => {
    expect(() => verifyStudioRefundEligibility({ ...current, paid_at: new Date(NOW - 12 * DAY).toISOString(),
      refund_status: 'pending', refund_requested_at: new Date(NOW - 6 * DAY).toISOString() }, NOW)).not.toThrow();
  });
});

describe('refund payment binding', () => {
  it('accepts only the correctly bound captured card payment', () => {
    expect(() => verifyStudioRefundPayment(current, intentFixture(), chargeFixture())).not.toThrow();
  });
  it.each([
    { amount: 499 }, { amount_captured: 2000 }, { currency: 'eur' }, { disputed: true }, { captured: false },
    { payment_intent: 'pi_different_order' }, { payment_method_details: { type: 'us_bank_account' } },
  ])('stops before a refund for charge mismatch: %j', patch => {
    const charge = { ...chargeFixture(), ...patch } as Stripe.Charge;
    expect(() => verifyStudioRefundPayment(current, intentFixture(charge), charge)).toThrow();
  });
  it('rejects a payment from a different Studio order even when amount matches', () => {
    const intent = intentFixture();
    intent.metadata.studio_order_id = 'another-order';
    expect(() => verifyStudioRefundPayment(current, intent, chargeFixture())).toThrow();
  });
});

describe('refund execution and uncertain responses', () => {
  it('uses the original payment, fixed amount, and stable idempotency key', async () => {
    const result = await requestStudioRefund(current);
    expect(result.status).toBe('completed');
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
      payment_intent: 'pi_studio_fixture', amount: 4900, reason: 'requested_by_customer',
      metadata: { product: STUDIO_PRODUCT.id, studio_order_id: current.id, policy: 'seven-day-v1' },
    }, expect.objectContaining({ idempotencyKey: `studio-refund-v1-${current.id}` }));
    expect(mocks.rpc.mock.calls[0][0]).toBe('studio_request_refund');
  });
  it('reconciles a refund after a lost response without creating another', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Connection interrupted after provider accepted request'));
    expect((await requestStudioRefund(current)).status).toBe('pending');
    vi.setSystemTime(NOW + 25 * 60 * 60 * 1000);
    mocks.list.mockResolvedValue({ data: [refundFixture()], has_more: false });
    expect((await requestStudioRefund(current)).status).toBe('completed');
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('does not describe a provider-pending refund as completed', async () => {
    mocks.list.mockResolvedValue({ data: [refundFixture('pending')], has_more: false });
    const result = await requestStudioRefund(current);
    expect(result.status).toBe('pending');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('escalates a prior partial refund without submitting a second full refund', async () => {
    mocks.list.mockResolvedValue({ data: [{ ...refundFixture(), amount: 1000 }], has_more: false });
    expect((await requestStudioRefund(current)).status).toBe('needs_attention');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(current.status).toBe('cancelled');
  });
  it('persists additional-action evidence for the operating queue', async () => {
    mocks.create.mockResolvedValue(refundFixture('requires_action'));
    expect((await requestStudioRefund(current)).status).toBe('pending');
    expect(current.refund_last_error_code).toBe('provider_refund_requires_action');
  });
  it('fails closed when new refund execution is disabled', async () => {
    vi.stubEnv('STUDIO_REFUNDS_ENABLED', 'false');
    await expect(requestStudioRefund(current)).rejects.toMatchObject({ code: 'refund_service_unavailable' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('continues a previously requested refund after new requests are disabled', async () => {
    current = { ...current, refund_status: 'pending', refund_requested_at: new Date(NOW).toISOString() };
    vi.stubEnv('STUDIO_REFUNDS_ENABLED', 'false');
    expect((await requestStudioRefund(current)).status).toBe('completed');
    expect(mocks.rpc.mock.calls.some(call => call[0] === 'studio_request_refund')).toBe(false);
  });
  it('never automatically reopens a failed or completed refund', async () => {
    expect((await requestStudioRefund({ ...current, refund_status: 'failed' })).status).toBe('needs_attention');
    expect((await requestStudioRefund({ ...current, refund_status: 'completed' })).status).toBe('completed');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
