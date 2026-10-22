import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getStudioOrder, studioDb, studioRpc } from './db';
import { StudioError, studioErrorCode } from './errors';
import { stripeObjectId } from './payments';
import { STUDIO_PRODUCT, type StudioOrderRow } from './types';

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_OPTIONS = { timeout: 15_000, maxNetworkRetries: 1 };
type ClaimedRefund = StudioOrderRow & { refund_lease_token: string };

export interface StudioRefundView {
  status: 'pending' | 'completed' | 'needs_attention';
  message: string;
  amount: number;
  currency: string;
}

function refundView(order: StudioOrderRow): StudioRefundView {
  const status = order.refund_status === 'completed' ? 'completed'
    : order.refund_status === 'failed' ? 'needs_attention' : 'pending';
  const messages = {
    completed: 'Stripe has processed your full $49 refund to the original payment method. Your bank may take additional time to show it.',
    pending: 'Your refund request is saved. We are checking or processing it with Stripe. Access to the setup from your order page is paused.',
    needs_attention: 'Your refund request needs a service review. Contact support@bootfile.ai with your order ID; do not make another purchase to resolve it.',
  };
  return { status, message: messages[status], amount: STUDIO_PRODUCT.amount, currency: STUDIO_PRODUCT.currency };
}

export function verifyStudioRefundEligibility(order: StudioOrderRow, now = Date.now()): void {
  const paidAt = Date.parse(order.paid_at || '');
  const requestedAt = order.refund_requested_at ? Date.parse(order.refund_requested_at) : now;
  if (order.amount_total !== STUDIO_PRODUCT.amount || order.currency !== STUDIO_PRODUCT.currency
    || order.product_version !== STUDIO_PRODUCT.version || !order.stripe_payment_intent_id
    || order.payment_status !== 'paid' || !Number.isFinite(paidAt) || !Number.isFinite(requestedAt)
    || paidAt > requestedAt || requestedAt > now || requestedAt - paidAt > REFUND_WINDOW_MS) {
    throw new StudioError('refund_not_eligible', 'This order needs a support review for a refund. Contact support@bootfile.ai with your order ID.', 409);
  }
}

/** Only the original, fully captured $49 Studio card payment is eligible for automatic execution. */
export function verifyStudioRefundPayment(order: StudioOrderRow, intent: Stripe.PaymentIntent, charge: Stripe.Charge): void {
  const metadata = intent.metadata;
  if (intent.id !== order.stripe_payment_intent_id || intent.status !== 'succeeded'
    || intent.amount !== STUDIO_PRODUCT.amount || intent.amount_received !== STUDIO_PRODUCT.amount
    || intent.currency !== STUDIO_PRODUCT.currency || metadata?.studio_order_id !== order.id
    || metadata?.product !== STUDIO_PRODUCT.id || metadata?.product_version !== STUDIO_PRODUCT.version
    || stripeObjectId(intent.latest_charge) !== charge.id || stripeObjectId(charge.payment_intent) !== intent.id
    || charge.amount !== STUDIO_PRODUCT.amount || charge.amount_captured !== STUDIO_PRODUCT.amount || charge.currency !== STUDIO_PRODUCT.currency
    || !charge.paid || !charge.captured || charge.disputed
    || charge.amount_refunded < 0 || charge.amount_refunded > STUDIO_PRODUCT.amount) {
    throw new StudioError('refund_payment_mismatch', 'The refund needs a payment review.', 409);
  }
  // Bank debits and other methods can have dispute or additional-action requirements.
  if (charge.payment_method_details?.type !== 'card') {
    throw new StudioError('refund_payment_method_review', 'This payment method needs a support review for its refund.', 409);
  }
}

function verifyRefundObject(refund: Stripe.Refund, order: StudioOrderRow): void {
  if (stripeObjectId(refund.payment_intent) !== order.stripe_payment_intent_id
    || refund.amount !== STUDIO_PRODUCT.amount || refund.currency !== STUDIO_PRODUCT.currency) {
    throw new StudioError('refund_payment_mismatch', 'The refund needs a payment review.', 409);
  }
}

function providerRefundStatus(refund: Stripe.Refund): 'pending' | 'completed' | 'failed' {
  if (refund.status === 'succeeded') return 'completed';
  if (refund.status === 'failed' || refund.status === 'canceled') return 'failed';
  return 'pending';
}

async function finishRefund(order: ClaimedRefund, status: 'pending' | 'completed' | 'failed', providerId: string | null, errorCode: string | null) {
  await studioRpc<boolean>('studio_finish_refund', {
    p_order_id: order.id, p_lease_token: order.refund_lease_token, p_provider_id: providerId,
    p_status: status, p_error_code: errorCode,
  });
}

async function processStudioRefund(orderId: string): Promise<StudioRefundView> {
  const claimed = await studioRpc<ClaimedRefund[]>('studio_claim_refund', { p_order_id: orderId });
  const order = claimed[0];
  if (order) {
    let providerId = order.stripe_refund_id;
    try {
      verifyStudioRefundEligibility(order);
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id!, { expand: ['latest_charge'] }, REQUEST_OPTIONS);
      const latest = intent.latest_charge;
      if (!latest || typeof latest === 'string') throw new StudioError('refund_payment_mismatch', 'Payment details need a service review.', 409);
      verifyStudioRefundPayment(order, intent, latest);

      let refund: Stripe.Refund | undefined;
      if (providerId) {
        refund = await stripe.refunds.retrieve(providerId, {}, REQUEST_OPTIONS);
      } else {
        // Look up provider truth before every create, including after idempotency keys expire.
        const existing = await stripe.refunds.list({ payment_intent: intent.id, limit: 100 }, REQUEST_OPTIONS);
        if (existing.has_more) throw new StudioError('refund_history_review', 'Refund history needs a service review.', 409);
        const active = existing.data.filter(item => item.status !== 'failed' && item.status !== 'canceled');
        if (active.length === 1 && active[0].amount === STUDIO_PRODUCT.amount) refund = active[0];
        else if (existing.data.length || latest.amount_refunded !== 0 || latest.refunded) {
          throw new StudioError('refund_history_review', 'A previous refund requires a service review.', 409);
        }
        if (!refund) {
          refund = await stripe.refunds.create({
            payment_intent: intent.id, amount: STUDIO_PRODUCT.amount, reason: 'requested_by_customer',
            metadata: { product: STUDIO_PRODUCT.id, studio_order_id: order.id, policy: 'seven-day-v1' },
          }, { ...REQUEST_OPTIONS, idempotencyKey: `studio-refund-v1-${order.id}` });
        }
      }
      verifyRefundObject(refund, order);
      providerId = refund.id;
      const status = providerRefundStatus(refund);
      await finishRefund(order, status, providerId, status === 'failed' ? 'provider_refund_failed'
        : refund.status === 'requires_action' ? 'provider_refund_requires_action' : null);
    } catch (error) {
      const requiresReview = error instanceof StudioError && error.status === 409;
      // An uncertain provider response is kept pending. Never try a different idempotency key.
      await finishRefund(order, requiresReview ? 'failed' : 'pending', providerId,
        requiresReview ? error.code : studioErrorCode(error));
    }
  }
  const current = await getStudioOrder(orderId);
  if (!current) throw new StudioError('order_not_found', 'Order not found.', 404);
  return refundView(current);
}

export async function requestStudioRefund(order: StudioOrderRow): Promise<StudioRefundView> {
  if (order.refund_status === 'completed' || order.refund_status === 'failed') return refundView(order);
  if (order.refund_status === 'none') {
    if (process.env.STUDIO_REFUNDS_ENABLED !== 'true' || !process.env.STRIPE_SECRET_KEY) {
      throw new StudioError('refund_service_unavailable', 'Online refunds are being configured. Request your seven-day refund at support@bootfile.ai with your order ID.', 503);
    }
    verifyStudioRefundEligibility(order);
    await studioRpc<StudioOrderRow[]>('studio_request_refund', { p_order_id: order.id });
  }
  return processStudioRefund(order.id);
}

/** Already-requested refunds continue to reconcile even when new requests are paused. */
export async function reconcileStudioRefunds({ limit = 2 }: { limit?: number } = {}) {
  const bounded = Math.max(1, Math.min(3, Math.floor(limit) || 2));
  const { data, error } = await studioDb().from('studio_orders').select('id')
    .eq('refund_status', 'pending').lte('refund_next_attempt_at', new Date().toISOString())
    .order('refund_next_attempt_at').limit(bounded);
  if (error) throw new StudioError('database_unavailable', 'Refund recovery is unavailable.');
  const results = await Promise.allSettled((data || []).map(row => processStudioRefund(String(row.id))));
  return {
    checked: results.length,
    completed: results.filter(result => result.status === 'fulfilled' && result.value.status === 'completed').length,
    needsAttention: results.filter(result => result.status === 'fulfilled' && result.value.status === 'needs_attention').length,
    errors: results.filter(result => result.status === 'rejected').length,
  };
}

/** The shared Stripe webhook verifies the signature before invoking this handler. */
export async function recordStudioRefundEvent(event: Stripe.Event): Promise<boolean> {
  if (!['refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) return false;
  const eventRefund = event.data.object as Stripe.Refund;
  // Retrieve current status because webhook events can arrive out of order.
  const refund = await getStripe().refunds.retrieve(eventRefund.id, {}, REQUEST_OPTIONS);
  const paymentIntentId = stripeObjectId(refund.payment_intent);
  if (!paymentIntentId || refund.amount !== STUDIO_PRODUCT.amount || refund.currency !== STUDIO_PRODUCT.currency) return false;
  return studioRpc<boolean>('studio_record_refund_status', {
    p_event_id: event.id, p_payment_intent_id: paymentIntentId, p_provider_id: refund.id,
    p_status: providerRefundStatus(refund), p_amount: refund.amount,
    p_error_code: refund.status === 'requires_action' ? 'provider_refund_requires_action' : null,
  });
}
