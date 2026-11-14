import { getSupabaseAdmin } from '@/lib/supabase';
import { STUDIO_ORDER_ID_PATTERN, verifyStudioAccessToken } from './access';
import { studioRevisionsEnabled } from './config';
import { StudioError } from './errors';
import { assistantInstructions } from '../brand-kit/kit';
import { PAID_BRAND_KIT_VERSION, publicPaidBrandKit, type PaidBrandKit } from '../brand-kit/synthesis';
import { marketingBundleOf } from './outputs';
import { studioProductOrNull } from './products';
import { currentBrandKit, revisionView } from './revision-state';
import { STUDIO_PRODUCT, type StudioDeliveryRow, type StudioOrderRow, type StudioOrderView, type StudioRevisionRow } from './types';

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
    if (error.message?.includes('studio_revision_not_eligible')) throw new StudioError('revision_not_available', 'A revision is not available for this order. Contact support@bootfile.ai with your order ID if you need help.', 409);
    if (error.message?.includes('studio_revision_already_used')) throw new StudioError('revision_already_used', 'This order has already used its one revision.', 409);
    if (error.message?.includes('studio_revision_unchanged')) throw new StudioError('revision_unchanged', 'Change at least one answer before you send your revision.', 400);
    throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  }
  return data as T;
}

export async function checkStudioSchema(): Promise<void> {
  const health = await studioRpc<{ version?: string }>('studio_health');
  if (health?.version !== 'studio-fulfillment-v1') throw new StudioError('schema_unavailable', 'The setup service is being prepared.');
}

/** Present only after studio_product_versions_v1. Without it a versioned order cannot be saved or fulfilled. */
export async function checkStudioProductSchema(): Promise<void> {
  const contract = await studioRpc<{ version?: string; products?: unknown }>('studio_product_versions');
  if (contract?.version !== 'studio-product-versions-v1' || !Array.isArray(contract.products) || !contract.products.includes('brand-foundation-paid-v1')) {
    throw new StudioError('schema_unavailable', 'The paid Brand & AI Kit is being prepared.');
  }
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

/** The delivery email's state for an order, or null before the kit is ready. */
export async function getStudioDelivery(orderId: string): Promise<Pick<StudioDeliveryRow, 'status' | 'sent_at'> | null> {
  const { data, error } = await studioDb().from('studio_deliveries').select('status,sent_at').eq('order_id', orderId).maybeSingle();
  if (error) throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  return data as Pick<StudioDeliveryRow, 'status' | 'sent_at'> | null;
}

/**
 * The order's one revision, if it has asked for one. Call it only for an order whose
 * revision_requested_at is set: the table exists only after studio_order_revisions_v1.
 */
export async function getStudioRevision(orderId: string): Promise<StudioRevisionRow | null> {
  if (!STUDIO_ORDER_ID_PATTERN.test(orderId)) return null;
  const { data, error } = await studioDb().from('studio_order_revisions').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw new StudioError('database_unavailable', 'The private order service is temporarily unavailable.');
  return data as StudioRevisionRow | null;
}

/** What the owner's order page may hold: the public allowlist and the public instructions. Private preferences are downloaded on request only. */
function brandKitView(kit: PaidBrandKit) {
  return { brandKit: publicPaidBrandKit(kit), brandKitGuide: { assistantInstructions: assistantInstructions(kit.foundation, false), reviewChecklist: [...kit.foundation.reviewChecklist] } };
}

export async function studioOrderView(order: StudioOrderRow): Promise<StudioOrderView> {
  const delivery = await getStudioDelivery(order.id);
  const visible = !!order.output && order.payment_status === 'paid' && order.refund_status === 'none';
  const brandOrder = order.product_version === PAID_BRAND_KIT_VERSION;
  // The marker exists only after the revision migration and is set only once a revision is requested, so an
  // order without one costs no extra query and reads exactly as it did before.
  const revision = brandOrder && order.revision_requested_at ? await getStudioRevision(order.id) : null;
  const revisionsOpen = studioRevisionsEnabled();
  const refundUntil = order.paid_at ? new Date(new Date(order.paid_at).getTime() + 7 * 24 * 3600_000).toISOString() : null;
  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    deliveryStatus: delivery?.status ?? null,
    createdAt: order.created_at,
    refundStatus: order.refund_status,
    refundAvailable: process.env.STUDIO_REFUNDS_ENABLED === 'true' && order.payment_status === 'paid' && order.refund_status === 'none' && order.refund_attempts < 3 && !!refundUntil && new Date(refundUntil).getTime() >= Date.now(),
    refundEligibleUntil: refundUntil,
    refundRequestedAt: order.refund_requested_at,
    product: { version: order.product_version, name: studioProductOrNull(order.product_version)?.name ?? 'Bootfile order' },
    ...(visible && order.product_version === STUDIO_PRODUCT.version ? { result: marketingBundleOf(order) } : {}),
    ...(visible && brandOrder ? brandKitView(currentBrandKit(order, revision)) : {}),
    ...(visible && brandOrder && (revisionsOpen || revision) ? { revision: revisionView({ order, revision, deliverySentAt: delivery?.sent_at, enabled: revisionsOpen }) } : {}),
    ...(order.status === 'needs_attention' ? { error: { code: 'order_needs_attention', message: 'Your order needs a service review. Your payment and submitted details are saved. You can contact support@bootfile.ai with this order ID.' } } : {}),
    retryAfterSeconds: 15,
  };
}
