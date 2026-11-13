import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GET as brandConfigRoute } from '@/app/api/studio/brand-config/route';
import { BrandKitPurchase } from '@/components/brand/BrandKitPurchase';
import { BRAND_KIT_PRODUCT } from '../studio/products';
import { FICTIONAL_BRAND_INPUT, brandBackbriefSnapshot, type BrandInput } from './kit';
import {
  BRAND_KIT_CHECKOUT_CLOSED, BrandCheckoutError, PAID_BRAND_KIT_CHECKOUT_VERSION, brandKitCheckoutPayload,
  loadBrandKitCheckoutConfig, parseBrandKitCheckoutConfig, requestBrandKitCheckout, trustedBrandKitCheckout,
} from './paid-checkout';
import { brandBackbriefSnapshot as serverSnapshot, validatePaidBrandIntake } from './paid-intake';
import { PAID_BRAND_KIT_VERSION } from './synthesis';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_KEY = '99999999-9999-4999-8999-999999999999';
const TOKEN = 't'.repeat(43);
const openAnswer = { checkoutEnabled: true, price: { amount: 4900, currency: 'usd', formatted: '$49' }, productName: BRAND_KIT_PRODUCT.name, productDescription: BRAND_KIT_PRODUCT.description, productVersion: PAID_BRAND_KIT_VERSION };
const openConfig = parseBrandKitCheckoutConfig(openAnswer);
const answers = () => structuredClone(FICTIONAL_BRAND_INPUT);
const approved = (input: BrandInput, email = 'owner@example.com', acceptedTerms = true) => brandKitCheckoutPayload({ input, approvalSnapshot: brandBackbriefSnapshot(input), email, acceptedTerms });
const refusal = (run: () => unknown) => { try { run(); } catch (error) { return error instanceof BrandCheckoutError ? error.message : `plain:${String(error)}`; } return 'no_error'; };
const answering = (status: number, body: unknown) => vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;
const rpc = vi.fn();
const openEnvironment = () => {
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'CRON_SECRET']) vi.stubEnv(key, key === 'NEXT_PUBLIC_SUPABASE_URL' ? 'https://example.supabase.co' : 'test-only');
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'brand-page-secret-'.repeat(3));
  vi.stubEnv('STUDIO_FULFILLMENT_ENABLED', 'true');
  vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('BRAND_KIT_CHECKOUT_ENABLED', 'true');
};

beforeEach(() => {
  rpc.mockImplementation(async (name: string) => name === 'studio_product_versions'
    ? { data: { version: 'studio-product-versions-v1', products: ['marketing-setup-v1', PAID_BRAND_KIT_VERSION] }, error: null }
    : { data: { limit: 20, spent: 0, reserved: 0, remaining: 20, checkout_available: true }, error: null });
  vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as unknown as ReturnType<typeof getSupabaseAdmin>);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('whether the page may offer the paid kit', () => {
  it('reads anything unexpected as closed', () => {
    expect(BRAND_KIT_CHECKOUT_CLOSED.checkoutEnabled).toBe(false);
    for (const answer of [null, 'open', [], {}, { checkoutEnabled: 'true' }, { ...openAnswer, checkoutEnabled: 1 }]) expect(parseBrandKitCheckoutConfig(answer).checkoutEnabled).toBe(false);
    // Open without the wording, price or version the customer would be shown is still closed.
    for (const missing of ['productName', 'productDescription', 'price', 'productVersion'] as const) expect(parseBrandKitCheckoutConfig({ ...openAnswer, [missing]: undefined }).checkoutEnabled).toBe(false);
    expect(parseBrandKitCheckoutConfig({ ...openAnswer, productVersion: 'marketing-setup-v1' }).checkoutEnabled).toBe(false);
    expect(parseBrandKitCheckoutConfig({ ...openAnswer, productDescription: 'x'.repeat(301) }).checkoutEnabled).toBe(false);
  });

  it('opens only on a complete answer and keeps a capacity pause distinct from closed', () => {
    expect(openConfig).toEqual({ checkoutEnabled: true, productName: 'Bootfile Brand & AI Kit', productDescription: BRAND_KIT_PRODUCT.description, priceFormatted: '$49' });
    expect(parseBrandKitCheckoutConfig({ ...openAnswer, checkoutEnabled: false, reasonCode: 'temporarily_full' }).reasonCode).toBe('temporarily_full');
    expect(parseBrandKitCheckoutConfig({ ...openAnswer, checkoutEnabled: false, reasonCode: 'anything' }).reasonCode).toBe('checkout_unavailable');
  });

  it('stays closed when the readiness request fails, and sends nothing about the customer', async () => {
    expect(await loadBrandKitCheckoutConfig(vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toEqual(BRAND_KIT_CHECKOUT_CLOSED);
    expect(await loadBrandKitCheckoutConfig(answering(503, openAnswer))).toEqual(BRAND_KIT_CHECKOUT_CLOSED);
    expect(await loadBrandKitCheckoutConfig(answering(200, '<html>'))).toEqual(BRAND_KIT_CHECKOUT_CLOSED);
    const fetcher = answering(200, openAnswer);
    expect(await loadBrandKitCheckoutConfig(fetcher)).toEqual(openConfig);
    expect(vi.mocked(fetcher).mock.calls[0][0]).toBe('/api/studio/brand-config');
    expect(vi.mocked(fetcher).mock.calls[0][1]).not.toHaveProperty('body');
    expect(vi.mocked(fetcher).mock.calls[0][1]).not.toHaveProperty('method');
  });
});

describe('GET /api/studio/brand-config', () => {
  it('is closed by default without asking the database anything', async () => {
    const response = await brandConfigRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ checkoutEnabled: false, reasonCode: 'checkout_unavailable', price: { amount: 4900, currency: 'usd', formatted: '$49' }, productVersion: PAID_BRAND_KIT_VERSION });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('stays closed when either flag is off or the product schema is missing', async () => {
    openEnvironment();
    vi.stubEnv('BRAND_KIT_CHECKOUT_ENABLED', 'false');
    expect((await (await brandConfigRoute()).json()).checkoutEnabled).toBe(false);
    openEnvironment();
    vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'false');
    expect((await (await brandConfigRoute()).json()).checkoutEnabled).toBe(false);
    openEnvironment();
    rpc.mockImplementation(async () => ({ data: null, error: { message: 'function studio_product_versions() does not exist' } }));
    expect((await (await brandConfigRoute()).json()).checkoutEnabled).toBe(false);
    rpc.mockImplementation(async () => ({ data: { version: 'studio-product-versions-v1', products: ['marketing-setup-v1'] }, error: null }));
    expect((await (await brandConfigRoute()).json()).checkoutEnabled).toBe(false);
  });

  it('opens with both flags and the schema, and reports a capacity pause', async () => {
    openEnvironment();
    const open = await (await brandConfigRoute()).json();
    // 'test-only' is not a Stripe key shape, so the mode is reported as unset, never guessed.
    expect(open).toEqual({ ...openAnswer, paymentMode: 'unset', deployment: 'local' });
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await (await brandConfigRoute()).json()).toMatchObject({ checkoutEnabled: true, paymentMode: 'test', deployment: 'preview' });
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_placeholder');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(await (await brandConfigRoute()).json()).toMatchObject({ paymentMode: 'live', deployment: 'production' });
    vi.stubEnv('STRIPE_SECRET_KEY', 'test-only');
    vi.stubEnv('VERCEL_ENV', '');
    expect(parseBrandKitCheckoutConfig(open)).toEqual(openConfig);
    rpc.mockImplementation(async (name: string) => name === 'studio_product_versions'
      ? { data: { version: 'studio-product-versions-v1', products: [PAID_BRAND_KIT_VERSION] }, error: null }
      : { data: { limit: 20, spent: 20, reserved: 0, remaining: 0, checkout_available: false }, error: null });
    expect(await (await brandConfigRoute()).json()).toMatchObject({ checkoutEnabled: false, reasonCode: 'temporarily_full' });
  });
});

describe('what the browser sends to buy the kit', () => {
  it('builds an intake the paid server contract accepts, whatever order the answers were given in', () => {
    expect(PAID_BRAND_KIT_CHECKOUT_VERSION).toBe(PAID_BRAND_KIT_VERSION);
    expect(brandBackbriefSnapshot).toBe(serverSnapshot);
    const payload = approved(answers(), '  Owner@Example.com ');
    expect(validatePaidBrandIntake(JSON.parse(JSON.stringify(payload)))).toMatchObject({ productVersion: PAID_BRAND_KIT_VERSION, email: 'owner@example.com', acceptedTerms: true, approvedBackbrief: true });
    const shuffled = Object.fromEntries(Object.entries(answers()).reverse()) as unknown as BrandInput;
    shuffled.answers = Object.fromEntries(Object.entries(shuffled.answers).reverse());
    expect(JSON.stringify(shuffled)).not.toBe(JSON.stringify(answers()));
    expect(validatePaidBrandIntake(JSON.parse(JSON.stringify(approved(shuffled)))).brand).toEqual(validatePaidBrandIntake(JSON.parse(JSON.stringify(payload))).brand);
  });

  it('refuses answers edited after approval, a missing approval, a bad email and unaccepted terms', () => {
    const input = answers();
    const approvalSnapshot = brandBackbriefSnapshot(input);
    const edited = { ...input, offer: `${input.offer} at half price` };
    expect(refusal(() => brandKitCheckoutPayload({ input: edited, approvalSnapshot, email: 'owner@example.com', acceptedTerms: true }))).toContain('changed after you approved');
    expect(refusal(() => brandKitCheckoutPayload({ input, approvalSnapshot: '', email: 'owner@example.com', acceptedTerms: true }))).toContain('changed after you approved');
    for (const email of ['', 'owner', 'owner@example', 'a b@example.com', `${'x'.repeat(250)}@example.com`]) expect(refusal(() => approved(input, email))).toBe('Enter a valid delivery email address.');
    expect(refusal(() => approved(input, 'owner@example.com', false))).toBe('Please accept the Terms to continue.');
    // The server makes the same decision on its own if a browser skips the check.
    expect(() => validatePaidBrandIntake({ ...approved(input), brand: edited })).toThrow('brand_backbrief_approval_required');
  });

  it('posts once to the paid intake with the request key and returns only a verified Stripe address', async () => {
    const payload = approved(answers());
    const fetcher = answering(201, { orderId: ORDER_ID, accessToken: TOKEN, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123' });
    expect(await requestBrandKitCheckout(payload, REQUEST_KEY, fetcher)).toEqual({ orderId: ORDER_ID, accessToken: TOKEN, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [path, init] = vi.mocked(fetcher).mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/studio/brand-orders');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', 'Idempotency-Key': REQUEST_KEY });
    expect(JSON.parse(init.body as string)).toEqual(JSON.parse(JSON.stringify(payload)));
  });

  it('never redirects anywhere but Stripe checkout over https', () => {
    const answer = (checkoutUrl: unknown, extra: Record<string, unknown> = {}) => ({ orderId: ORDER_ID, accessToken: TOKEN, checkoutUrl, ...extra });
    for (const url of ['http://checkout.stripe.com/c/pay/x', 'https://checkout.stripe.com.evil.example/c/pay/x', 'https://evil.example/checkout.stripe.com', 'https://user:pw@checkout.stripe.com/x', 'https://checkout.stripe.com:8443/x', 'javascript:alert(1)', '/studio/order/x', '', null, 7]) {
      expect(refusal(() => trustedBrandKitCheckout(answer(url)))).toContain('haven’t been charged');
    }
    expect(refusal(() => trustedBrandKitCheckout(answer('https://checkout.stripe.com/x', { orderId: 'not-an-order' })))).toContain('haven’t been charged');
    expect(refusal(() => trustedBrandKitCheckout(answer('https://checkout.stripe.com/x', { accessToken: '' })))).toContain('haven’t been charged');
    expect(refusal(() => trustedBrandKitCheckout(null))).toContain('haven’t been charged');
  });

  it('shows the server’s own reason when checkout is refused and a plain one when it cannot be read', async () => {
    const payload = approved(answers());
    const message = async (fetcher: typeof fetch) => requestBrandKitCheckout(payload, REQUEST_KEY, fetcher).then(() => 'no_error', error => error instanceof BrandCheckoutError ? error.message : 'plain');
    expect(await message(answering(503, { error: { code: 'checkout_unavailable', message: 'The paid Brand & AI Kit is not open yet. You can keep exploring the preview while we finish testing.' } }))).toContain('not open yet');
    expect(await message(answering(400, { error: { code: 'brand_backbrief_approval_required', message: 'Your brand summary changed after you approved it. Please review and approve it again.' } }))).toContain('approve it again');
    expect(await message(answering(500, '<html>proxy error</html>'))).toContain('haven’t been charged');
    expect(await message(answering(500, { error: { message: 'x'.repeat(400) } }))).toContain('haven’t been charged');
    expect(await message(answering(201, { orderId: ORDER_ID, accessToken: TOKEN, checkoutUrl: 'https://evil.example/pay' }))).toContain('haven’t been charged');
    expect(await message(vi.fn(async () => { throw new TypeError('network'); }) as unknown as typeof fetch)).toContain('couldn’t reach checkout');
  });
});

describe('the purchase panel', () => {
  const render = (config = openConfig) => renderToStaticMarkup(createElement(BrandKitPurchase, { config, input: answers(), approvalSnapshot: brandBackbriefSnapshot(answers()) }));

  it('renders nothing while checkout is closed', () => {
    expect(render(BRAND_KIT_CHECKOUT_CLOSED)).toBe('');
    expect(render(parseBrandKitCheckoutConfig({ ...openAnswer, checkoutEnabled: false }))).toBe('');
  });

  it('says only that the kit is at capacity when it is, with no way to pay', () => {
    const html = render(parseBrandKitCheckoutConfig({ ...openAnswer, checkoutEnabled: false, reasonCode: 'temporarily_full' }));
    expect(html).toContain('at capacity');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Continue to payment');
  });

  it('shows the server’s price and description, the terms, and a payment button that starts disabled', () => {
    const html = render();
    for (const expected of ['$49 ONCE', 'A brand foundation, voice guide, visual starter kit, AI working instructions, and a first campaign.', 'href="/terms"', 'href="/privacy"', 'Continue to payment · $49', 'Payment is handled by Stripe', 'not independently verified strategy', 'no subscription']) expect(html).toContain(expected);
    expect(html).toMatch(/<button type="submit"[^>]*disabled=""/);
    expect(html).not.toMatch(/<input type="checkbox"[^>]*checked/);
    expect(html).not.toContain('Juniper');
    expect(html).not.toContain('Test mode');
  });

  it('labels a test checkout, and only when the server reports Stripe test keys', () => {
    expect(parseBrandKitCheckoutConfig({ ...openAnswer, paymentMode: 'test' }).testMode).toBe(true);
    for (const mode of ['live', 'unset', undefined, true]) expect(parseBrandKitCheckoutConfig({ ...openAnswer, paymentMode: mode })).not.toHaveProperty('testMode');
    expect(render(parseBrandKitCheckoutConfig({ ...openAnswer, paymentMode: 'test' }))).toContain('Test mode. This checkout uses Stripe test keys and takes no real payment.');
  });
});
