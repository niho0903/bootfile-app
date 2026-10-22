import { randomUUID, createHash } from 'node:crypto';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createStudioAccessToken, hashStudioAccessToken, STUDIO_ORDER_ID_PATTERN, studioRequestHash, verifyStudioAccessToken } from './access';
import { assertStudioCheckoutConfigured, studioBaseUrl, studioDailyGenerationLimit } from './config';
import { studioDb, studioRpc } from './db';
import { StudioError } from './errors';
import { STUDIO_PRODUCT, type StudioIntake, type StudioOrderRow } from './types';

const REQUEST_OPTIONS = { timeout: 10_000, maxNetworkRetries: 0 };

export function studioCheckoutParameters(order: StudioOrderRow): Stripe.Checkout.SessionCreateParams {
  const metadata = { product: STUDIO_PRODUCT.id, product_version: STUDIO_PRODUCT.version, studio_order_id: order.id };
  return {
    mode: 'payment',
    adaptive_pricing: { enabled: false },
    client_reference_id: order.id,
    customer_email: order.intake.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: STUDIO_PRODUCT.currency,
        unit_amount: STUDIO_PRODUCT.amount,
        product_data: { name: STUDIO_PRODUCT.name, description: 'One promotional email, three social posts, an approved business brief, and a reusable AI workflow.', metadata },
      },
    }],
    metadata,
    payment_intent_data: { metadata, description: STUDIO_PRODUCT.name },
    success_url: `${studioBaseUrl()}/studio/order/${order.id}`,
    cancel_url: `${studioBaseUrl()}/studio/order/${order.id}`,
    // Fixed from the persisted creation time, so request retries are idempotent.
    expires_at: Math.floor(new Date(order.checkout_expires_at).getTime() / 1000),
  };
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
  if (session.client_reference_id !== order.id || session.metadata?.studio_order_id !== order.id
    || session.metadata?.product !== STUDIO_PRODUCT.id || session.metadata?.product_version !== STUDIO_PRODUCT.version
    || session.expires_at !== Math.floor(new Date(order.checkout_expires_at).getTime() / 1000)) throw new StudioError('payment_mismatch', 'This checkout could not be matched to the order.', 409);
  if (!session.url || session.status !== 'open' || session.payment_status !== 'unpaid' || session.expires_at * 1000 <= Date.now()) throw new StudioError('checkout_not_open', 'This checkout is already completed or has expired. Open your private order link.', 409);
  return { orderId: order.id, accessToken, checkoutUrl: session.url };
}

export async function resumeStudioCheckout(order: StudioOrderRow): Promise<{ checkoutUrl: string }> {
  assertStudioCheckoutConfigured();
  if (order.payment_status !== 'awaiting_payment' || !order.stripe_checkout_session_id) throw new StudioError('checkout_not_open', 'This checkout cannot be resumed. Please check the order status.', 409);
  const session = await getStripe().checkout.sessions.retrieve(order.stripe_checkout_session_id, {}, REQUEST_OPTIONS);
  if (session.client_reference_id !== order.id || session.metadata?.studio_order_id !== order.id
    || session.metadata?.product !== STUDIO_PRODUCT.id || session.metadata?.product_version !== STUDIO_PRODUCT.version
    || session.expires_at !== Math.floor(new Date(order.checkout_expires_at).getTime() / 1000)) throw new StudioError('payment_mismatch', 'This payment could not be matched to the order.', 409);
  if (session.status !== 'open' || !session.url || session.payment_status !== 'unpaid' || session.expires_at * 1000 <= Date.now()) throw new StudioError('checkout_not_open', 'This checkout is completed or expired. Please refresh the order status.', 409);
  return { checkoutUrl: session.url };
}
