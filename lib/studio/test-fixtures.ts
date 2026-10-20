import type Stripe from 'stripe';
import { STUDIO_DEMO_BUNDLE, STUDIO_DEMO_INTAKE } from './demo';
import { STUDIO_PRODUCT, type StudioDeliveryRow, type StudioOrderRow } from './types';

export const STUDIO_TEST_ORDER_ID = '11111111-1111-4111-8111-111111111111';

export function studioOrderFixture(overrides: Partial<StudioOrderRow> = {}): StudioOrderRow {
  return {
    id: STUDIO_TEST_ORDER_ID, created_at: '2026-10-20T12:00:00.000Z', updated_at: '2026-10-20T12:00:00.000Z',
    checkout_expires_at: '2026-10-20T13:00:00.000Z',
    intake: structuredClone(STUDIO_DEMO_INTAKE), access_token_hash: 'a'.repeat(64),
    product_version: STUDIO_PRODUCT.version, amount_total: STUDIO_PRODUCT.amount, currency: STUDIO_PRODUCT.currency,
    stripe_checkout_session_id: 'cs_test_studio', stripe_payment_intent_id: 'pi_test_studio',
    payment_status: 'paid', status: 'queued', generation_attempts: 0, lease_token: null, lease_expires_at: null,
    next_attempt_at: '2026-10-20T12:00:00.000Z', last_error_code: null, error_detail: null, output: null,
    paid_at: '2026-10-20T12:00:00.000Z', ready_at: null, refund_status: 'none', refund_requested_at: null,
    stripe_refund_id: null, refunded_amount: 0, refund_attempts: 0, refund_next_attempt_at: '2026-10-20T12:00:00.000Z', refund_last_error_code: null,
    ...overrides,
  };
}

export function studioDeliveryFixture(): StudioDeliveryRow {
  return { order_id: STUDIO_TEST_ORDER_ID, status: 'sending', attempts: 1, lease_token: STUDIO_TEST_ORDER_ID,
    lease_expires_at: '2026-10-20T12:01:30.000Z', next_attempt_at: '2026-10-20T12:00:00.000Z', first_attempt_at: '2026-10-20T12:00:00.000Z',
    provider_message_id: null, last_error_code: null, sent_at: null };
}

export function studioSessionFixture(): Stripe.Checkout.Session {
  const metadata = { product: STUDIO_PRODUCT.id, product_version: STUDIO_PRODUCT.version, studio_order_id: STUDIO_TEST_ORDER_ID };
  return {
    id: 'cs_test_studio', object: 'checkout.session', client_reference_id: STUDIO_TEST_ORDER_ID,
    mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 4900, currency: 'usd',
    expires_at: Date.parse('2026-10-20T13:00:00.000Z') / 1000,
    metadata, payment_intent: {
      id: 'pi_test_studio', object: 'payment_intent', status: 'succeeded', amount: 4900, amount_received: 4900, currency: 'usd', metadata,
      latest_charge: { id: 'ch_test_studio', object: 'charge', payment_intent: 'pi_test_studio', amount: 4900, amount_captured: 4900, currency: 'usd', paid: true, captured: true, disputed: false, amount_refunded: 0, created: Date.parse('2026-10-20T12:00:00.000Z') / 1000 },
    },
    line_items: { object: 'list', has_more: false, url: '/test', data: [{ id: 'li_test_studio', object: 'item', amount_total: 4900, quantity: 1,
      price: { id: 'price_test_studio', unit_amount: 4900, currency: 'usd', product: { id: 'prod_test_studio', object: 'product', metadata } } }] },
  } as unknown as Stripe.Checkout.Session;
}

export function readyStudioOrderFixture(): StudioOrderRow {
  return studioOrderFixture({ output: structuredClone(STUDIO_DEMO_BUNDLE), status: 'ready', ready_at: '2026-10-20T12:01:00.000Z' });
}
