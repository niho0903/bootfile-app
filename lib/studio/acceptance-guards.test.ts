import { describe, expect, it } from 'vitest';
import {
  AcceptanceRefusal, PRODUCTION_HOSTS, SYNTHETIC_BRAND_SNAPSHOT, acceptanceTarget, assertEvidenceClean, isProtectionWall,
  preflightRefusals, requireFlag, statePathAllowed, syntheticIntake, testCheckout,
} from '../../scripts/lib/acceptance-guards.mjs';
import { brandBackbriefSnapshot } from '../brand-kit/kit';
import { validatePaidBrandIntake } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION } from '../brand-kit/synthesis';

const PREVIEW = 'https://bootfile-app-git-rebuild-acceptance-example-projects.vercel.app';
const refusal = (run: () => unknown) => { try { run(); } catch (error) { return error instanceof AcceptanceRefusal ? error.code : `plain:${String(error)}`; } return 'no_refusal'; };
const previewConfig = { checkoutEnabled: true, price: { amount: 4900, currency: 'usd', formatted: '$49' }, productVersion: PAID_BRAND_KIT_VERSION, paymentMode: 'test', deployment: 'preview' };
const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 't'.repeat(43);

describe('hosted acceptance may only ever touch a test deployment', () => {
  it('refuses every production address and anything that is not local or a Vercel-generated host', () => {
    for (const host of PRODUCTION_HOSTS) expect(refusal(() => acceptanceTarget(`https://${host}`))).toBe('target_is_production');
    expect(refusal(() => acceptanceTarget('https://staging.bootfile.ai'))).toBe('target_is_production');
    expect(refusal(() => acceptanceTarget('https://bootfile-app-git-master-example-projects.vercel.app'))).toBe('target_is_production_branch');
    expect(refusal(() => acceptanceTarget('https://example.com'))).toBe('target_host_not_allowed');
    expect(refusal(() => acceptanceTarget('https://bootfile.ai.vercel.app.evil.example'))).toBe('target_host_not_allowed');
    expect(refusal(() => acceptanceTarget('http://bootfile-preview.vercel.app'))).toBe('target_must_use_https');
    for (const shaped of [`${PREVIEW}/brand`, `${PREVIEW}/?x-vercel-protection-bypass=secret`, 'https://user:pw@preview.vercel.app', `${PREVIEW}/#x`]) expect(refusal(() => acceptanceTarget(shaped))).toBe('target_must_be_a_bare_origin');
    expect(refusal(() => acceptanceTarget('not a url'))).toBe('target_url_invalid');
    expect(acceptanceTarget(PREVIEW)).toEqual({ origin: PREVIEW, host: new URL(PREVIEW).hostname, local: false });
    expect(acceptanceTarget('http://localhost:3000')).toMatchObject({ local: true });
  });

  it('refuses unless the server itself reports a preview on Stripe test keys at the fixed price', () => {
    const target = acceptanceTarget(PREVIEW);
    expect(preflightRefusals(target, previewConfig, { needsOpenCheckout: true })).toEqual([]);
    expect(preflightRefusals(target, { ...previewConfig, deployment: 'production' }, { needsOpenCheckout: false })).toEqual(['deployment_is_production']);
    expect(preflightRefusals(target, { ...previewConfig, paymentMode: 'live' }, { needsOpenCheckout: false })).toEqual(['payment_mode_is_live']);
    expect(preflightRefusals(target, { ...previewConfig, paymentMode: 'unset' }, { needsOpenCheckout: false })).toEqual(['payment_mode_is_unset']);
    expect(preflightRefusals(target, { ...previewConfig, deployment: undefined, paymentMode: undefined }, { needsOpenCheckout: false })).toEqual(['deployment_is_undefined', 'payment_mode_is_undefined']);
    expect(preflightRefusals(target, { ...previewConfig, price: { amount: 4999, currency: 'usd' } }, { needsOpenCheckout: false })).toEqual(['price_mismatch']);
    expect(preflightRefusals(target, { ...previewConfig, productVersion: 'marketing-setup-v1' }, { needsOpenCheckout: false })).toEqual(['product_version_mismatch']);
    expect(preflightRefusals(target, { ...previewConfig, checkoutEnabled: false, reasonCode: 'checkout_unavailable' }, { needsOpenCheckout: true })).toEqual(['checkout_closed_checkout_unavailable']);
    expect(preflightRefusals(target, { ...previewConfig, checkoutEnabled: false }, { needsOpenCheckout: false })).toEqual([]);
    expect(preflightRefusals(target, null, { needsOpenCheckout: false })).toEqual(['config_unreadable']);
    // A local server must say it is local; a preview claim from localhost is not accepted either way round.
    expect(preflightRefusals(acceptanceTarget('http://localhost:3000'), previewConfig, { needsOpenCheckout: false })).toEqual(['deployment_is_preview']);
    expect(preflightRefusals(target, { ...previewConfig, deployment: 'local' }, { needsOpenCheckout: false })).toEqual(['deployment_is_local']);
  });

  it('accepts only a Stripe test session after the order exists', () => {
    const answer = (checkoutUrl: unknown) => ({ orderId: ORDER_ID, accessToken: TOKEN, checkoutUrl });
    expect(testCheckout(answer('https://checkout.stripe.com/c/pay/cs_test_a1B2'))).toMatchObject({ orderId: ORDER_ID });
    expect(refusal(() => testCheckout(answer('https://checkout.stripe.com/c/pay/cs_live_a1B2')))).toBe('live_checkout_session');
    expect(refusal(() => testCheckout(answer('https://checkout.stripe.com/c/pay/unknown')))).toBe('checkout_session_not_test');
    expect(refusal(() => testCheckout(answer('https://evil.example/c/pay/cs_test_a1B2')))).toBe('checkout_url_not_stripe');
    expect(refusal(() => testCheckout(answer('http://checkout.stripe.com/c/pay/cs_test_a1B2')))).toBe('checkout_url_not_stripe');
    expect(refusal(() => testCheckout({ ...answer('https://checkout.stripe.com/c/pay/cs_test_x'), orderId: 'nope' }))).toBe('checkout_answer_invalid');
    expect(refusal(() => testCheckout(null))).toBe('checkout_answer_invalid');
  });

  it('needs an explicit confirmation and a delivery address before it will create anything', () => {
    expect(refusal(() => requireFlag(['create', '--url', PREVIEW], '--confirm-test-order'))).toBe('confirmation_required');
    expect(refusal(() => requireFlag(['create', '--confirm-test-order'], '--confirm-test-order'))).toBe('no_refusal');
    expect(refusal(() => requireFlag(['refund', '--confirm-test-order'], '--confirm-test-refund'))).toBe('confirmation_required');
    for (const email of ['', 'owner', 'a b@example.com']) expect(refusal(() => syntheticIntake(email))).toBe('delivery_email_required');
  });
});

describe('the synthetic order and its evidence', () => {
  it('sends a fictional brief that the paid contract accepts as approved', () => {
    const intake = syntheticIntake(' Owner@Example.com ');
    expect(intake.approvalSnapshot).toBe(SYNTHETIC_BRAND_SNAPSHOT);
    expect(brandBackbriefSnapshot(intake.brand)).toBe(SYNTHETIC_BRAND_SNAPSHOT);
    expect(intake.brand.businessName).toContain('acceptance test');
    expect(validatePaidBrandIntake(JSON.parse(JSON.stringify(intake)))).toMatchObject({ productVersion: PAID_BRAND_KIT_VERSION, email: 'owner@example.com' });
  });

  it('tells a Vercel sign-in wall from an application answer', () => {
    expect(isProtectionWall(401, 'text/html; charset=utf-8', '<title>Authentication Required</title><script src="https://vercel.com/sso"></script>')).toBe(true);
    expect(isProtectionWall(401, 'application/json', '{"error":{"code":"order_not_found"}}')).toBe(false);
    expect(isProtectionWall(200, 'text/html', 'vercel')).toBe(false);
  });

  it('refuses to write evidence that carries a token, an address, a payment link or a key', () => {
    const clean = { host: 'preview.vercel.app', orderId: ORDER_ID, steps: [{ name: 'order', status: 'ready' }] };
    expect(assertEvidenceClean(clean, [TOKEN, 'owner@example.com'])).toBe(clean);
    expect(refusal(() => assertEvidenceClean({ ...clean, note: TOKEN }, [TOKEN]))).toBe('evidence_contains_private_value');
    for (const leak of ['owner@example.com', 'https://checkout.stripe.com/c/pay/cs_test_a1', 'whsec_abc', 'sk_test_abc', '#access_token=abc']) expect(refusal(() => assertEvidenceClean({ ...clean, note: leak }, []))).toBe('evidence_contains_private_pattern');
  });

  it('keeps the private state file out of the repository', () => {
    expect(statePathAllowed('/tmp/bootfile-acceptance/abc.json', '/work/bootfile-app')).toBe(true);
    expect(statePathAllowed('/work/bootfile-app/state.json', '/work/bootfile-app')).toBe(false);
    expect(statePathAllowed('/work/bootfile-app/artifacts/acceptance/state.json', '/work/bootfile-app/')).toBe(false);
    expect(statePathAllowed('/work/bootfile-app-other/state.json', '/work/bootfile-app')).toBe(true);
  });
});
