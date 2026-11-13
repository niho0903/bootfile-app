import { randomUUID, createHash } from 'node:crypto';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { persistedPaidBrandIntake, type PersistedPaidBrandIntake } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION } from '../brand-kit/synthesis';
import { createStudioAccessToken, hashStudioAccessToken, STUDIO_ORDER_ID_PATTERN, studioRequestHash, verifyStudioAccessToken } from './access';
import { assertBrandKitCheckoutConfigured, assertStudioCheckoutConfigured, studioBaseUrl, studioDailyGenerationLimit } from './config';
import { checkStudioProductSchema, studioDb, studioRpc } from './db';
import { StudioError } from './errors';
import { studioModelBudget } from './model-budget';
import { studioProductForVersion } from './products';
import type { StudioIntake, StudioOrderRow } from './types';

const REQUEST_OPTIONS = { timeout: 10_000, maxNetworkRetries: 0 };

/** Price, name and metadata come from the product version persisted on the order, never from the request. */
export function studioCheckoutParameters(order: StudioOrderRow): Stripe.Checkout.SessionCreateParams {
  const product = studioProductForVersion(order.product_version);
  const metadata = { product: product.id, product_version: product.version, studio_order_id: order.id };
  return {
    mode: 'payment',
    adaptive_pricing: { enabled: false },
    client_reference_id: order.id,
    customer_email: order.intake.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: product.currency,
        unit_amount: product.amount,
        product_data: { name: product.name, description: product.description, metadata },
      },
    }],
    metadata,
    payment_intent_data: { metadata, description: product.name },
    success_url: `${studioBaseUrl()}/studio/order/${order.id}`,
    cancel_url: `${studioBaseUrl()}/studio/order/${order.id}`,
    // Fixed from the persisted creation time, so request retries are idempotent.
    expires_at: Math.floor(new Date(order.checkout_expires_at).getTime() / 1000),
  };
}

function sessionMatchesOrder(session: Stripe.Checkout.Session, order: StudioOrderRow): boolean {
  const product = studioProductForVersion(order.product_version);
  return session.client_reference_id === order.id && session.metadata?.studio_order_id === order.id
    && session.metadata?.product === product.id && session.metadata?.product_version === product.version
    && session.expires_at === Math.floor(new Date(order.checkout_expires_at).getTime() / 1000);
}

/** Shared by every product version once its order row exists. No URL is returned before its session is bound. */
async function openCheckoutSession(order: StudioOrderRow) {
  const accessToken = createStudioAccessToken(order.id);
  if (!verifyStudioAccessToken(accessToken, order.access_token_hash)) throw new StudioError('access_key_rotated', 'This checkout needs a private-link recovery. Please start a new setup or contact support@bootfile.ai.');
  if (order.payment_status !== 'awaiting_payment') throw new StudioError('checkout_already_completed', 'This checkout has already completed. Open your private order link.', 409);
  let session: Stripe.Checkout.Session;
  try {
    if (order.stripe_checkout_session_id) {
      session = await getStripe().checkout.sessions.retrieve(order.stripe_checkout_session_id, {}, REQUEST_OPTIONS);
    } else {
      // Do not create a replacement after the original reservation expires.
      if (new Date(order.checkout_expires_at).getTime() - Date.now() < 30 * 60_000 + 15_000) throw new StudioError('checkout_expired', 'This checkout has expired. Please start a new setup.', 409);
      session = await getStripe().checkout.sessions.create(studioCheckoutParameters(order), { ...REQUEST_OPTIONS, idempotencyKey: `studio:checkout:${order.id}:v1` });
      const { error } = await studioDb().from('studio_orders')
        .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
        .eq('id', order.id).is('stripe_checkout_session_id', null);
      if (error) throw new StudioError('checkout_binding_failed', 'Your checkout is saved. Please retry from this form.');
    }
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError('checkout_provider_unavailable', 'Checkout is temporarily unavailable. Please try again.');
  }
  if (!sessionMatchesOrder(session, order)) throw new StudioError('payment_mismatch', 'This checkout could not be matched to the order.', 409);
  if (!session.url || session.status !== 'open' || session.payment_status !== 'unpaid' || session.expires_at * 1000 <= Date.now()) throw new StudioError('checkout_not_open', 'This checkout is already completed or has expired. Open your private order link.', 409);
  return { orderId: order.id, accessToken, checkoutUrl: session.url };
}

export async function createStudioCheckout(intake: StudioIntake, requestKey: string, ip: string) {
  assertStudioCheckoutConfigured();
  if (!STUDIO_ORDER_ID_PATTERN.test(requestKey)) throw new StudioError('idempotency_key_required', 'Please refresh the checkout form and try again.', 400);
  const id = randomUUID();
  const orders = await studioRpc<StudioOrderRow[]>('studio_create_order', {
    p_id: id,
    p_intake: intake,
    p_intake_hash: createHash('sha256').update(JSON.stringify(intake)).digest('hex'),
    p_request_key_hash: createHash('sha256').update(`studio-request:${requestKey}`).digest('hex'),
    p_ip_hash: studioRequestHash(ip, 'ip'),
    p_email_hash: studioRequestHash(intake.email, 'email'),
    p_access_token_hash: hashStudioAccessToken(createStudioAccessToken(id)),
    p_daily_limit: studioDailyGenerationLimit(),
  });
  const order = orders?.[0];
  if (!order) throw new StudioError('order_creation_failed', 'The order could not be saved. Please try again.');
  return openCheckoutSession(order);
}

const BRAND_INTAKE_MESSAGES: Record<string, string> = {
  brand_backbrief_approval_required: 'Your brand summary changed after you approved it. Please review and approve it again.',
  brand_terms_required: 'Please accept the terms to continue.',
  brand_email_invalid: 'Enter a valid delivery email address.',
  brand_intake_incomplete: 'Please finish the remaining questions before checkout.',
  brand_intake_too_large: 'Your answers are too long for one kit. Please shorten the longest ones.',
};

/** The Brand Kit modules signal intake problems with plain codes; the customer gets a 400 they can act on. */
function approvedBrandIntake(raw: unknown): PersistedPaidBrandIntake {
  try {
    return persistedPaidBrandIntake(raw);
  } catch (error) {
    const code = error instanceof Error && /^brand_[a-z_]+$/.test(error.message) ? error.message : 'brand_intake_invalid';
    throw new StudioError(code, BRAND_INTAKE_MESSAGES[code] || 'Please refresh the page and complete your brand brief again.', 400);
  }
}

/**
 * Paid Brand & AI Kit checkout. Closed unless both checkout flags are on and the product-version
 * schema is present. The order binds its product version and model budget before any payable URL exists.
 */
export async function createBrandKitCheckout(raw: unknown, requestKey: string, ip: string) {
  assertBrandKitCheckoutConfigured();
  if (!STUDIO_ORDER_ID_PATTERN.test(requestKey)) throw new StudioError('idempotency_key_required', 'Please refresh the checkout form and try again.', 400);
  const intake = approvedBrandIntake(raw);
  await checkStudioProductSchema();
  const budget = studioModelBudget(PAID_BRAND_KIT_VERSION);
  const id = randomUUID();
  const orders = await studioRpc<StudioOrderRow[]>('studio_create_versioned_order', {
    p_id: id,
    p_product_version: PAID_BRAND_KIT_VERSION,
    p_intake: intake,
    p_intake_hash: createHash('sha256').update(JSON.stringify(intake)).digest('hex'),
    p_request_key_hash: createHash('sha256').update(`studio-request:${requestKey}`).digest('hex'),
    p_ip_hash: studioRequestHash(ip, 'ip'),
    p_email_hash: studioRequestHash(intake.email, 'email'),
    p_access_token_hash: hashStudioAccessToken(createStudioAccessToken(id)),
    p_model_call_limit: budget.maxCalls,
    p_model_cost_limit_microusd: budget.maxCostMicroUsd,
    p_daily_limit: studioDailyGenerationLimit(),
  });
  const order = orders?.[0];
  if (!order) throw new StudioError('order_creation_failed', 'The order could not be saved. Please try again.');
  if (order.product_version !== PAID_BRAND_KIT_VERSION) throw new StudioError('idempotency_conflict', 'This checkout attempt has changed. Please start a new attempt.', 409);
  return openCheckoutSession(order);
}

export async function resumeStudioCheckout(order: StudioOrderRow): Promise<{ checkoutUrl: string }> {
  if (order.product_version === PAID_BRAND_KIT_VERSION) assertBrandKitCheckoutConfigured(); else assertStudioCheckoutConfigured();
  if (order.payment_status !== 'awaiting_payment' || !order.stripe_checkout_session_id) throw new StudioError('checkout_not_open', 'This checkout cannot be resumed. Please check the order status.', 409);
  const session = await getStripe().checkout.sessions.retrieve(order.stripe_checkout_session_id, {}, REQUEST_OPTIONS);
  if (!sessionMatchesOrder(session, order)) throw new StudioError('payment_mismatch', 'This payment could not be matched to the order.', 409);
  if (session.status !== 'open' || !session.url || session.payment_status !== 'unpaid' || session.expires_at * 1000 <= Date.now()) throw new StudioError('checkout_not_open', 'This checkout is completed or expired. Please refresh the order status.', 409);
  return { checkoutUrl: session.url };
}
