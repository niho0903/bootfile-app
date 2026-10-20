import { afterEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { createStudioAccessToken, hashStudioAccessToken, verifyStudioAccessToken } from './access';
import { studioCheckoutParameters } from './checkout';
import { studioRefundObservation, verifyStudioPaidSession } from './payments';
import { studioOrderFixture, studioSessionFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';

afterEach(() => vi.unstubAllEnvs());

describe('studio private access and fixed paid SKU', () => {
  it('stores a hash, rejects another order token and can regenerate the delivery capability', () => {
    vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'a'.repeat(48));
    const token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
    expect(createStudioAccessToken(STUDIO_TEST_ORDER_ID)).toBe(token);
    expect(hashStudioAccessToken(token)).not.toBe(token);
    expect(verifyStudioAccessToken(token, hashStudioAccessToken(token))).toBe(true);
    const other = createStudioAccessToken('22222222-2222-4222-8222-222222222222');
    expect(verifyStudioAccessToken(other, hashStudioAccessToken(token))).toBe(false);
    expect(verifyStudioAccessToken('', hashStudioAccessToken(token))).toBe(false);
    vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'b'.repeat(48));
    expect(verifyStudioAccessToken(createStudioAccessToken(STUDIO_TEST_ORDER_ID), hashStudioAccessToken(token))).toBe(false);
  });

  it('fails closed without a capability secret', () => {
    vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', '');
    expect(() => createStudioAccessToken(STUDIO_TEST_ORDER_ID)).toThrow();
  });

  it('creates only the server-fixed one-time SKU and keeps the secret out of Stripe metadata and redirects', () => {
    const parameters = studioCheckoutParameters(studioOrderFixture());
    expect(parameters.mode).toBe('payment');
    expect(parameters.line_items?.[0].price_data?.unit_amount).toBe(4900);
    expect(parameters.line_items?.[0].quantity).toBe(1);
    expect(parameters.expires_at).toBe(Date.parse(studioOrderFixture().checkout_expires_at) / 1000);
    expect(parameters.success_url).toBe(`https://bootfile.ai/studio/order/${STUDIO_TEST_ORDER_ID}`);
    expect(parameters).not.toHaveProperty('subscription_data');
    expect(parameters).not.toHaveProperty('payment_method_types');
    expect(JSON.stringify(parameters.metadata)).not.toContain('email');
    expect(parameters.success_url).not.toContain('token');
  });

  it('accepts only a complete paid session with matching order, SKU, amount and line item', () => {
    expect(verifyStudioPaidSession(studioSessionFixture(), studioOrderFixture())).toBe('pi_test_studio');
  });

  it.each(['amount', 'currency', 'metadata', 'order', 'payment', 'session', 'expiry', 'quantity', 'price', 'product', 'extra_line'])('rejects mismatched %s even when Stripe says paid', mismatch => {
    const session = studioSessionFixture();
    if (mismatch === 'amount') session.amount_total = 499;
    if (mismatch === 'currency') session.currency = 'eur';
    if (mismatch === 'metadata') session.metadata!.product = 'bootfile';
    if (mismatch === 'order') session.client_reference_id = 'another-order';
    if (mismatch === 'payment') session.payment_status = 'unpaid';
    if (mismatch === 'session') session.id = 'cs_test_different';
    if (mismatch === 'expiry') session.expires_at += 3600;
    if (mismatch === 'quantity') session.line_items!.data[0].quantity = 2;
    if (mismatch === 'price') session.line_items!.data[0].price!.unit_amount = 499;
    if (mismatch === 'product') session.line_items!.data[0].price!.product = 'prod_unexpanded';
    if (mismatch === 'extra_line') session.line_items!.data.push(session.line_items!.data[0]);
    expect(() => verifyStudioPaidSession(session, studioOrderFixture())).toThrow();
  });

  it('requires an authoritative captured charge and rejects a reused payment intent from another product', () => {
    const session = studioSessionFixture();
    const intent = session.payment_intent as Stripe.PaymentIntent;
    intent.metadata = { ...intent.metadata, product: 'bootfile' };
    expect(() => verifyStudioPaidSession(session, studioOrderFixture())).toThrow();
    const unpaidCapture = studioSessionFixture();
    const charge = (unpaidCapture.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge;
    charge.amount_captured = 100;
    expect(() => verifyStudioPaidSession(unpaidCapture, studioOrderFixture())).toThrow();
  });

  it.each(['pending', 'requires_action', 'failed', 'canceled'] as const)('does not count a %s refund as returned money', status => {
    const observation = studioRefundObservation({ has_more: false, data: [{ id: 're_test_studio', payment_intent: 'pi_test_studio', amount: 4900, currency: 'usd', status }] } as Stripe.ApiList<Stripe.Refund>, 'pi_test_studio');
    expect(observation.amountSucceeded).toBe(0);
    expect(observation.status).not.toBe('completed');
    if (status === 'requires_action') expect(observation.errorCode).toBe('provider_refund_requires_action');
  });

  it('records a successful refund before making a late-reconciled payment claimable', () => {
    const observation = studioRefundObservation({ has_more: false, data: [{ id: 're_test_studio', payment_intent: 'pi_test_studio', amount: 4900, currency: 'usd', status: 'succeeded' }] } as Stripe.ApiList<Stripe.Refund>, 'pi_test_studio');
    expect(observation).toEqual({ status: 'completed', refundId: 're_test_studio', amountSucceeded: 4900, errorCode: null });
  });

  it('refuses incomplete or cross-payment refund histories', () => {
    expect(() => studioRefundObservation({ has_more: true, data: [] } as unknown as Stripe.ApiList<Stripe.Refund>, 'pi_test_studio')).toThrow();
    expect(() => studioRefundObservation({ has_more: false, data: [{ id: 're_test_other', payment_intent: 'pi_other', amount: 4900, currency: 'usd', status: 'succeeded' }] } as Stripe.ApiList<Stripe.Refund>, 'pi_test_studio')).toThrow();
  });
});
