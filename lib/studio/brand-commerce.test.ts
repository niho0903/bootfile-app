import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { POST as brandOrdersRoute } from '@/app/api/studio/brand-orders/route';
import { FICTIONAL_BRAND_INPUT } from '../brand-kit/kit';
import { brandBackbriefSnapshot } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION } from '../brand-kit/synthesis';
import { createBrandKitCheckout, resumeStudioCheckout, studioCheckoutParameters } from './checkout';
import { assertBrandKitCheckoutConfigured } from './config';
import { checkStudioProductSchema, studioDb, studioRpc } from './db';
import { StudioError } from './errors';
import { verifyStudioPaidSession } from './payments';
import { BRAND_KIT_PRODUCT, STUDIO_PRODUCT_DEFINITIONS, studioProductById, studioProductForVersion, studioProductOrNull } from './products';
import { verifyStudioRefundEligibility, verifyStudioRefundPayment } from './refunds';
import { studioOrderFixture, studioSessionFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import { STUDIO_PRODUCT, type StudioIntake, type StudioOrderRow } from './types';

vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }));
vi.mock('./db', () => ({ studioRpc: vi.fn(), studioDb: vi.fn(), checkStudioProductSchema: vi.fn() }));

const REQUEST_KEY = '99999999-9999-4999-8999-999999999999';
const stripe = { checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } } };
const brandOrder = (overrides: Partial<StudioOrderRow> = {}) => studioOrderFixture({ product_version: PAID_BRAND_KIT_VERSION, ...overrides });
const browserIntake = () => {
  const brand = structuredClone(FICTIONAL_BRAND_INPUT);
  return { productVersion: PAID_BRAND_KIT_VERSION, brand, email: 'Customer@Example.com', acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(brand) };
};
const code = async (run: Promise<unknown> | (() => unknown)) => {
  try { await (typeof run === 'function' ? run() : run); } catch (error) { return error instanceof StudioError ? `${error.code}:${error.status}` : `plain:${String(error)}`; }
  return 'no_error';
};
const openCheckout = () => {
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'CRON_SECRET']) vi.stubEnv(key, key === 'NEXT_PUBLIC_SUPABASE_URL' ? 'https://example.supabase.co' : 'test-only');
  vi.stubEnv('STUDIO_FULFILLMENT_ENABLED', 'true');
  vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('BRAND_KIT_CHECKOUT_ENABLED', 'true');
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T12:00:30.000Z'));
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'brand-checkout-secret-'.repeat(3));
  vi.mocked(getStripe).mockReturnValue(stripe as unknown as Stripe);
  vi.mocked(checkStudioProductSchema).mockResolvedValue(undefined);
  vi.mocked(studioDb).mockReturnValue({ from: () => ({ update: () => ({ eq: () => ({ is: async () => ({ error: null }) }) }) }) } as unknown as ReturnType<typeof studioDb>);
  vi.mocked(studioRpc).mockImplementation((async (_name: string, args: Record<string, unknown>) => [studioOrderFixture({
    id: args.p_id as string, product_version: args.p_product_version as string, intake: args.p_intake as StudioIntake,
    access_token_hash: args.p_access_token_hash as string, payment_status: 'awaiting_payment', status: 'awaiting_payment',
    stripe_checkout_session_id: null, stripe_payment_intent_id: null, paid_at: null,
  })]) as unknown as typeof studioRpc);
  stripe.checkout.sessions.create.mockImplementation(async (parameters: Stripe.Checkout.SessionCreateParams) => ({
    id: 'cs_test_brand', url: 'https://checkout.stripe.test/brand', status: 'open', payment_status: 'unpaid',
    client_reference_id: parameters.client_reference_id, metadata: parameters.metadata, expires_at: parameters.expires_at,
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('product registry', () => {
  it('sells every version at the one fixed price the database enforces, under distinct ids', () => {
    expect(STUDIO_PRODUCT_DEFINITIONS.map(product => product.version)).toEqual([STUDIO_PRODUCT.version, PAID_BRAND_KIT_VERSION]);
    expect(new Set(STUDIO_PRODUCT_DEFINITIONS.map(product => product.id)).size).toBe(2);
    for (const product of STUDIO_PRODUCT_DEFINITIONS) expect([product.amount, product.currency, product.formatted]).toEqual([4900, 'usd', '$49']);
    expect(studioProductForVersion(STUDIO_PRODUCT.version)).toMatchObject({ id: STUDIO_PRODUCT.id, name: STUDIO_PRODUCT.name });
    expect(studioProductById('bootfile_brand_ai_kit')).toBe(BRAND_KIT_PRODUCT);
    expect(studioProductById('bootfile')).toBeNull();
    expect(studioProductOrNull('brand-foundation-paid-v2')).toBeNull();
    expect(() => studioProductForVersion('brand-foundation-paid-v2')).toThrow(expect.objectContaining({ code: 'product_version_unsupported', status: 409 }));
  });
});

describe('payment and refund binding follow the order’s persisted version', () => {
  it('builds the Brand Kit checkout from the order, not from a default', () => {
    const parameters = studioCheckoutParameters(brandOrder());
    expect(parameters.line_items?.[0].price_data).toMatchObject({ unit_amount: 4900, currency: 'usd', product_data: { name: 'Bootfile Brand & AI Kit' } });
    expect(parameters.metadata).toEqual({ product: 'bootfile_brand_ai_kit', product_version: PAID_BRAND_KIT_VERSION, studio_order_id: STUDIO_TEST_ORDER_ID });
    expect(parameters.payment_intent_data?.metadata).toEqual(parameters.metadata);
    expect(parameters).not.toHaveProperty('subscription_data');
    expect(studioCheckoutParameters(studioOrderFixture()).metadata).toMatchObject({ product: STUDIO_PRODUCT.id, product_version: STUDIO_PRODUCT.version });
  });

  it('accepts a paid session only for the product the order was created for', () => {
    expect(verifyStudioPaidSession(studioSessionFixture(BRAND_KIT_PRODUCT), brandOrder())).toBe('pi_test_studio');
    expect(() => verifyStudioPaidSession(studioSessionFixture(), brandOrder())).toThrow(expect.objectContaining({ code: 'payment_mismatch' }));
    expect(() => verifyStudioPaidSession(studioSessionFixture(BRAND_KIT_PRODUCT), studioOrderFixture())).toThrow(expect.objectContaining({ code: 'payment_mismatch' }));
    expect(() => verifyStudioPaidSession(studioSessionFixture(BRAND_KIT_PRODUCT), brandOrder({ product_version: 'brand-foundation-paid-v2' }))).toThrow(expect.objectContaining({ code: 'product_version_unsupported' }));
  });

  it('refunds a Brand Kit order inside the seven-day window against its own payment only', () => {
    const order = brandOrder({ paid_at: '2026-10-20T12:00:00.000Z' });
    expect(() => verifyStudioRefundEligibility(order, Date.parse('2026-10-27T12:00:00.000Z'))).not.toThrow();
    expect(() => verifyStudioRefundEligibility(order, Date.parse('2026-10-27T12:00:01.000Z'))).toThrow(expect.objectContaining({ code: 'refund_not_eligible' }));
    expect(() => verifyStudioRefundEligibility(brandOrder({ product_version: 'brand-foundation-paid-v2' }), Date.parse('2026-10-21T12:00:00.000Z'))).toThrow(expect.objectContaining({ code: 'refund_not_eligible' }));
    const payment = (sku: { id: string; version: string }) => {
      const intent = studioSessionFixture(sku).payment_intent as Stripe.PaymentIntent;
      const charge = Object.assign(intent.latest_charge as Stripe.Charge, { payment_method_details: { type: 'card' } });
      return [intent, charge] as const;
    };
    expect(() => verifyStudioRefundPayment(order, ...payment(BRAND_KIT_PRODUCT))).not.toThrow();
    expect(() => verifyStudioRefundPayment(order, ...payment(STUDIO_PRODUCT))).toThrow(expect.objectContaining({ code: 'refund_payment_mismatch' }));
    expect(() => verifyStudioRefundPayment(studioOrderFixture(), ...payment(BRAND_KIT_PRODUCT))).toThrow(expect.objectContaining({ code: 'refund_payment_mismatch' }));
  });
});

describe('Brand Kit checkout is closed unless both flags are on', () => {
  it('refuses with either flag off and opens only when both are on with complete configuration', async () => {
    expect(await code(() => assertBrandKitCheckoutConfigured())).toBe('checkout_unavailable:503');
    openCheckout();
    expect(await code(() => assertBrandKitCheckoutConfigured())).toBe('no_error');
    vi.stubEnv('BRAND_KIT_CHECKOUT_ENABLED', 'false');
    expect(await code(() => assertBrandKitCheckoutConfigured())).toBe('checkout_unavailable:503');
    vi.stubEnv('BRAND_KIT_CHECKOUT_ENABLED', 'true');
    vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'false');
    expect(await code(() => assertBrandKitCheckoutConfigured())).toBe('checkout_unavailable:503');
  });

  it('answers 503 from the route without reading the request or touching the database or Stripe', async () => {
    const request = new NextRequest('https://bootfile.ai/api/studio/brand-orders', { method: 'POST', body: JSON.stringify(browserIntake()), headers: { 'idempotency-key': REQUEST_KEY } });
    const response = await brandOrdersRoute(request);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'checkout_unavailable' } });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(request.bodyUsed).toBe(false);
    expect(studioRpc).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(await code(createBrandKitCheckout(browserIntake(), REQUEST_KEY, 'test-ip'))).toBe('checkout_unavailable:503');
  });
});

describe('Brand Kit checkout when open', () => {
  beforeEach(openCheckout);

  it('saves the approved intake with its version and model budget before any payable session exists', async () => {
    const result = await createBrandKitCheckout(browserIntake(), REQUEST_KEY, 'test-ip');
    expect(vi.mocked(studioRpc)).toHaveBeenCalledTimes(1);
    const [name, args] = vi.mocked(studioRpc).mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('studio_create_versioned_order');
    expect(args).toMatchObject({ p_product_version: PAID_BRAND_KIT_VERSION, p_model_call_limit: 3, p_model_cost_limit_microusd: 350_000 });
    expect(args.p_intake).toMatchObject({ productVersion: PAID_BRAND_KIT_VERSION, email: 'customer@example.com', acceptedTerms: true, approvedBackbrief: true });
    expect(args.p_intake).not.toHaveProperty('approvalSnapshot');
    expect((args.p_intake as { approvalSnapshotSha256: string }).approvalSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(String(args.p_intake_hash)).toMatch(/^[a-f0-9]{64}$/);
    const [parameters, options] = stripe.checkout.sessions.create.mock.calls[0] as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }];
    expect(parameters.metadata).toMatchObject({ product: 'bootfile_brand_ai_kit', product_version: PAID_BRAND_KIT_VERSION, studio_order_id: args.p_id });
    expect(JSON.stringify(parameters.metadata)).not.toContain('example.com');
    expect(options.idempotencyKey).toBe(`studio:checkout:${args.p_id}:v1`);
    expect(result).toMatchObject({ orderId: args.p_id, checkoutUrl: 'https://checkout.stripe.test/brand' });
    expect(vi.mocked(checkStudioProductSchema).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(studioRpc).mock.invocationCallOrder[0]);
  });

  it('stops before the database and Stripe on an edited brief, a missing schema or a missing request key', async () => {
    const edited = browserIntake();
    edited.brand.offer = 'An offer the customer never approved.';
    expect(await code(createBrandKitCheckout(edited, REQUEST_KEY, 'test-ip'))).toBe('brand_backbrief_approval_required:400');
    expect(await code(createBrandKitCheckout({ ...browserIntake(), email: 'not-an-email' }, REQUEST_KEY, 'test-ip'))).toBe('brand_email_invalid:400');
    expect(await code(createBrandKitCheckout('not json', REQUEST_KEY, 'test-ip'))).toBe('brand_intake_invalid:400');
    expect(await code(createBrandKitCheckout(browserIntake(), 'not-a-request-key', 'test-ip'))).toBe('idempotency_key_required:400');
    vi.mocked(checkStudioProductSchema).mockRejectedValue(new StudioError('schema_unavailable', 'Not migrated.'));
    expect(await code(createBrandKitCheckout(browserIntake(), REQUEST_KEY, 'test-ip'))).toBe('schema_unavailable:503');
    expect(studioRpc).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('never opens a Brand Kit checkout on an order saved as another product', async () => {
    vi.mocked(studioRpc).mockResolvedValue([studioOrderFixture({ payment_status: 'awaiting_payment', status: 'awaiting_payment' })]);
    expect(await code(createBrandKitCheckout(browserIntake(), REQUEST_KEY, 'test-ip'))).toBe('idempotency_conflict:409');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('resumes only a session that carries the order’s own product', async () => {
    const order = brandOrder({ payment_status: 'awaiting_payment', status: 'awaiting_payment', stripe_checkout_session_id: 'cs_test_brand', checkout_expires_at: '2026-10-20T13:00:00.000Z' });
    const session = (sku: { id: string; version: string }) => ({ id: 'cs_test_brand', url: 'https://checkout.stripe.test/brand', status: 'open', payment_status: 'unpaid', client_reference_id: order.id,
      metadata: { product: sku.id, product_version: sku.version, studio_order_id: order.id }, expires_at: Date.parse(order.checkout_expires_at) / 1000 });
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(session(BRAND_KIT_PRODUCT));
    await expect(resumeStudioCheckout(order)).resolves.toEqual({ checkoutUrl: 'https://checkout.stripe.test/brand' });
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(session(STUDIO_PRODUCT));
    expect(await code(resumeStudioCheckout(order))).toBe('payment_mismatch:409');
  });
});
