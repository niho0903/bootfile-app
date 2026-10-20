import { getSupabaseAdmin } from '@/lib/supabase';
import { STUDIO_ORDER_ID_PATTERN, verifyStudioAccessToken } from './access';
import { StudioError } from './errors';
import type { StudioDeliveryRow, StudioOrderRow, StudioOrderView } from './types';

export function studioDb() {
  const db = getSupabaseAdmin();
  if (!db) throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  return db;
}

export async function studioRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await studioDb().rpc(name, args);
  if (error) {
    if (error.message?.includes('studio_temporarily_full')) throw new StudioError('temporarily_full', 'We are temporarily at capacity. Your brief is saved in this browser; please check back shortly.', 503);
    if (error.message?.includes('studio_refund_not_eligible')) throw new StudioError('refund_not_eligible', 'This order needs a support review for a refund. Contact support@bootfile.ai with your order ID.', 409);
    if (error.message?.includes('studio_rate_limited')) throw new StudioError('order_rate_limited', 'Too many checkout attempts. Please return to an existing order or try again later.', 429);
    if (error.message?.includes('studio_idempotency_conflict')) throw new StudioError('idempotency_conflict', 'This checkout attempt has changed. Please start a new attempt.', 409);
    if (error.message?.includes('studio_payment_mismatch')) throw new StudioError('payment_mismatch', 'The payment could not be matched to this order.', 409);
    throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  }
  return data as T;
}

export async function checkStudioSchema(): Promise<void> {
  const health = await studioRpc<{ version?: string }>('studio_health');
  if (health?.version !== 'studio-fulfillment-v1') throw new StudioError('schema_unavailable', 'The setup service is being prepared.');
}

export interface StudioCapacity { limit: number; spent: number; reserved: number; remaining: number; checkout_available: boolean }

export async function studioCapacity(dailyLimit: number): Promise<StudioCapacity> {
  return studioRpc<StudioCapacity>('studio_capacity_status', { p_daily_limit: dailyLimit });
}

export async function getStudioOrder(id: string): Promise<StudioOrderRow | null> {
  if (!STUDIO_ORDER_ID_PATTERN.test(id)) return null;
  const { data, error } = await studioDb().from('studio_orders').select('*').eq('id', id).maybeSingle();
  if (error) throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  return data as StudioOrderRow | null;
}

export async function requireStudioOrderAccess(id: string, token: string): Promise<StudioOrderRow> {
  const order = await getStudioOrder(id);
  if (!order || !verifyStudioAccessToken(token, order.access_token_hash)) throw new StudioError('order_not_found', 'This private order link is not valid.', 404);
  return order;
}

export async function studioOrderView(order: StudioOrderRow): Promise<StudioOrderView> {
  const { data, error } = await studioDb().from('studio_deliveries').select('status').eq('order_id', order.id).maybeSingle();
  if (error) throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  const refundUntil = order.paid_at ? new Date(new Date(order.paid_at).getTime() + 7 * 24 * 3600_000).toISOString() : null;
  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    deliveryStatus: (data as Pick<StudioDeliveryRow, 'status'> | null)?.status ?? null,
    createdAt: order.created_at,
    refundStatus: order.refund_status,
    refundAvailable: process.env.STUDIO_REFUNDS_ENABLED === 'true' && order.payment_status === 'paid' && order.refund_status === 'none' && order.refund_attempts < 3 && !!refundUntil && new Date(refundUntil).getTime() >= Date.now(),
    refundEligibleUntil: refundUntil,
    refundRequestedAt: order.refund_requested_at,
    ...(order.output && order.payment_status === 'paid' && order.refund_status === 'none' ? { result: order.output } : {}),
    ...(order.status === 'needs_attention' ? { error: { code: 'order_needs_attention', message: 'Your order needs a service review. Your payment and submitted details are saved. You can contact support@bootfile.ai with this order ID.' } } : {}),
    retryAfterSeconds: 15,
  };
}
