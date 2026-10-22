import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { STUDIO_ORDER_ID_PATTERN } from './access';
import { getStudioOrder, studioRpc } from './db';
import { StudioError } from './errors';
import { STUDIO_PRODUCT, type StudioOrderRow } from './types';

const REQUEST_OPTIONS = { timeout: 10_000, maxNetworkRetries: 0 };

export function stripeObjectId(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : value?.id ?? null;
}

export function verifyStudioPaidSession(session: Stripe.Checkout.Session, order: StudioOrderRow): string {
  const line = session.line_items?.data?.[0];
  const paymentIntentId = stripeObjectId(session.payment_intent);
  const price = line?.price;
  const product = price?.product && typeof price.product !== 'string' && !price.product.deleted ? price.product : null;
  const metadata = session.metadata;
  const intent = session.payment_intent && typeof session.payment_intent !== 'string' ? session.payment_intent : null;
  const charge = intent?.latest_charge && typeof intent.latest_charge !== 'string' ? intent.latest_charge : null;
  if (session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid'
    || session.client_reference_id !== order.id || metadata?.studio_order_id !== order.id
    || metadata?.product !== STUDIO_PRODUCT.id || metadata?.product_version !== STUDIO_PRODUCT.version
    || session.amount_total !== STUDIO_PRODUCT.amount || session.currency !== STUDIO_PRODUCT.currency
    || session.expires_at !== Math.floor(new Date(order.checkout_expires_at).getTime() / 1000)
    || order.amount_total !== STUDIO_PRODUCT.amount || order.currency !== STUDIO_PRODUCT.currency || order.product_version !== STUDIO_PRODUCT.version
    || (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id)
    || !paymentIntentId || (order.stripe_payment_intent_id && order.stripe_payment_intent_id !== paymentIntentId)
    || session.line_items?.has_more || session.line_items?.data?.length !== 1 || line?.quantity !== 1
    || line.amount_total !== STUDIO_PRODUCT.amount || price?.unit_amount !== STUDIO_PRODUCT.amount || price.currency !== STUDIO_PRODUCT.currency
    || product?.metadata?.product !== STUDIO_PRODUCT.id || product?.metadata?.product_version !== STUDIO_PRODUCT.version
    || product?.metadata?.studio_order_id !== order.id
    || !intent || intent.status !== 'succeeded' || intent.amount !== STUDIO_PRODUCT.amount || intent.amount_received !== STUDIO_PRODUCT.amount
    || intent.currency !== STUDIO_PRODUCT.currency || intent.metadata?.studio_order_id !== order.id
    || intent.metadata?.product !== STUDIO_PRODUCT.id || intent.metadata?.product_version !== STUDIO_PRODUCT.version
    || !charge || stripeObjectId(charge.payment_intent) !== intent.id || !charge.paid || !charge.captured
    || charge.amount !== STUDIO_PRODUCT.amount || charge.amount_captured !== STUDIO_PRODUCT.amount || charge.currency !== STUDIO_PRODUCT.currency
    || !Number.isInteger(charge.created) || charge.created <= 0) {
    throw new StudioError('payment_mismatch', 'The payment could not be matched to this order.', 409);
  }
  return paymentIntentId;
}

export interface StudioRefundObservation {
  status: StudioOrderRow['refund_status'];
  refundId: string | null;
  amountSucceeded: number;
  errorCode: string | null;
}

/** Refund totals mean provider-confirmed success; pending or failed requests do not count as returned money. */
export function studioRefundObservation(refunds: Stripe.ApiList<Stripe.Refund>, paymentIntentId: string): StudioRefundObservation {
  if (refunds.has_more || refunds.data.some(refund => stripeObjectId(refund.payment_intent) !== paymentIntentId || refund.currency !== STUDIO_PRODUCT.currency || !Number.isInteger(refund.amount) || refund.amount < 0 || refund.amount > STUDIO_PRODUCT.amount)) {
    throw new StudioError('refund_history_review', 'The payment history needs a service review.', 409);
  }
  const amountSucceeded = refunds.data.filter(refund => refund.status === 'succeeded').reduce((sum, refund) => sum + refund.amount, 0);
  if (amountSucceeded > STUDIO_PRODUCT.amount) throw new StudioError('refund_history_review', 'The payment history needs a service review.', 409);
  const full = refunds.data.find(refund => refund.amount === STUDIO_PRODUCT.amount && !['failed', 'canceled'].includes(refund.status || ''));
  if (amountSucceeded === STUDIO_PRODUCT.amount) return { status: 'completed', refundId: full?.id ?? null, amountSucceeded, errorCode: null };
  if (full) return { status: 'pending', refundId: full.id, amountSucceeded, errorCode: full.status === 'requires_action' ? 'provider_refund_requires_action' : null };
  if (refunds.data.length) return { status: 'failed', refundId: refunds.data.find(refund => refund.amount === STUDIO_PRODUCT.amount)?.id ?? null, amountSucceeded, errorCode: 'refund_history_review' };
  return { status: 'none', refundId: null, amountSucceeded: 0, errorCode: null };
}

export async function reconcileStudioSession(sessionId: string, eventId?: string): Promise<{ paid: boolean; expired: boolean; orderId?: string }> {
  let session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price.product', 'payment_intent.latest_charge'] }, REQUEST_OPTIONS);
  if (session.metadata?.product !== STUDIO_PRODUCT.id) return { paid: false, expired: false };
  const orderId = session.metadata.studio_order_id;
  if (!orderId || !STUDIO_ORDER_ID_PATTERN.test(orderId)) throw new StudioError('payment_mismatch', 'Payment metadata is incomplete.', 409);
  const order = await getStudioOrder(orderId);
  if (!order) throw new StudioError('order_not_found', 'The paid order is not yet available.');
  if (session.client_reference_id !== order.id || session.metadata?.product_version !== STUDIO_PRODUCT.version
    || session.expires_at !== Math.floor(new Date(order.checkout_expires_at).getTime() / 1000)
    || (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id)) throw new StudioError('payment_mismatch', 'Checkout metadata does not match.', 409);
  if (session.status === 'open' && session.payment_status === 'unpaid' && new Date(order.checkout_expires_at).getTime() <= Date.now()) {
    // Release capacity only after Stripe confirms it can no longer accept this checkout.
    session = await getStripe().checkout.sessions.expire(session.id, {}, REQUEST_OPTIONS);
  }
  if (session.status === 'expired') {
    const expired = await studioRpc<boolean>('studio_record_expired', { p_order_id: order.id, p_session_id: session.id, p_event_id: eventId || `reconcile:expired:${session.id}` });
    return { paid: false, expired, orderId };
  }
  if (session.payment_status !== 'paid') {
    const pendingIntent = session.payment_intent && typeof session.payment_intent !== 'string' ? session.payment_intent : null;
    const pendingCharge = pendingIntent?.latest_charge && typeof pendingIntent.latest_charge !== 'string' ? pendingIntent.latest_charge : null;
    if (session.status === 'complete' && (pendingIntent?.status === 'canceled' || (pendingIntent?.status === 'requires_payment_method' && pendingCharge?.status === 'failed'))) {
      const expired = await studioRpc<boolean>('studio_record_expired', { p_order_id: order.id, p_session_id: session.id, p_event_id: eventId || `reconcile:async_failed:${session.id}` });
      return { paid: false, expired, orderId };
    }
    // A delayed payment still owns its reservation even after nominal checkout expiry.
    return { paid: false, expired: false, orderId };
  }
  const paymentIntentId = verifyStudioPaidSession(session, order);
  const intent = session.payment_intent as Stripe.PaymentIntent;
  const charge = intent.latest_charge as Stripe.Charge;
  const refundHistory = await getStripe().refunds.list({ payment_intent: paymentIntentId, limit: 100 }, REQUEST_OPTIONS);
  const refunds = studioRefundObservation(refundHistory, paymentIntentId);
  const paid = await studioRpc<boolean>('studio_record_payment', {
    p_order_id: order.id, p_event_id: eventId || `reconcile:paid:${session.id}`, p_session_id: session.id,
    p_payment_intent_id: paymentIntentId, p_amount: session.amount_total, p_currency: session.currency,
    p_product_version: STUDIO_PRODUCT.version,
    p_paid_at: new Date(charge.created * 1000).toISOString(),
    p_refund_status: refunds.status, p_refund_id: refunds.refundId,
    p_refunded_amount: refunds.amountSucceeded, p_refund_error_code: refunds.errorCode,
    p_disputed: charge.disputed,
  });
  return { paid, expired: false, orderId };
}

export async function recordStudioReversal(eventId: string, paymentIntentId: string, kind: 'refund' | 'dispute', amountRefunded = 0): Promise<boolean> {
  return studioRpc<boolean>('studio_record_reversal', { p_payment_intent_id: paymentIntentId, p_event_id: eventId, p_kind: kind, p_amount_refunded: amountRefunded });
}

/** Called only after the existing endpoint verifies Stripe's raw-body signature. */
export async function handleStudioStripeEvent(event: Stripe.Event): Promise<{ handled: boolean; queued: boolean }> {
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.product !== STUDIO_PRODUCT.id) return { handled: false, queued: false };
    const result = await reconcileStudioSession(session.id, event.id);
    return { handled: true, queued: result.paid };
  }
  if (event.type === 'charge.refunded') {
    const eventCharge = event.data.object as Stripe.Charge;
    const charge = await getStripe().charges.retrieve(eventCharge.id, {}, REQUEST_OPTIONS);
    const paymentIntentId = stripeObjectId(charge.payment_intent);
    if (!paymentIntentId || charge.metadata?.product !== STUDIO_PRODUCT.id) return { handled: false, queued: false };
    const refunds = studioRefundObservation(await getStripe().refunds.list({ payment_intent: paymentIntentId, limit: 100 }, REQUEST_OPTIONS), paymentIntentId);
    // Full-refund lifecycle is handled by refund.* notifications. Never equate a requested refund with success.
    const handled = refunds.amountSucceeded > 0 ? await recordStudioReversal(event.id, paymentIntentId, 'refund', refunds.amountSucceeded) : true;
    return { handled, queued: false };
  }
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    let paymentIntentId = stripeObjectId(dispute.payment_intent);
    if (!paymentIntentId) {
      const chargeId = stripeObjectId(dispute.charge);
      if (chargeId) paymentIntentId = stripeObjectId((await getStripe().charges.retrieve(chargeId, {}, REQUEST_OPTIONS)).payment_intent);
    }
    const handled = paymentIntentId ? await recordStudioReversal(event.id, paymentIntentId, 'dispute') : false;
    return { handled, queued: false };
  }
  return { handled: false, queued: false };
}
