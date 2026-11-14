import { PAID_BRAND_KIT_VERSION, type PaidBrandKit } from '../brand-kit/synthesis';
import { brandKitOf } from './outputs';
import type { StudioOrderRow, StudioRevisionRow, StudioRevisionView } from './types';

/**
 * Pure rules for the one revision a paid Brand & AI Kit order may use. No database and no provider.
 * The database function studio_request_revision enforces the same window; this copy only decides
 * what the order page may offer.
 */
export const STUDIO_REVISION_WINDOW_DAYS = 7;

type OrderFacts = Pick<StudioOrderRow, 'product_version' | 'status' | 'output' | 'payment_status' | 'refund_status' | 'ready_at' | 'model_call_limit' | 'revision_requested_at'>;

/** Seven days from the delivery email when one was sent, otherwise from the moment the kit was ready. */
export function revisionWindowEnd(order: Pick<StudioOrderRow, 'ready_at'>, deliverySentAt: string | null | undefined): string | null {
  const from = new Date(deliverySentAt || order.ready_at || '').getTime();
  return Number.isFinite(from) ? new Date(from + STUDIO_REVISION_WINDOW_DAYS * 24 * 3600_000).toISOString() : null;
}

/** The kit the customer should see and download: the revised one once it is saved, otherwise the first. */
export function currentBrandKit(order: Pick<StudioOrderRow, 'product_version' | 'output'>, revision: Pick<StudioRevisionRow, 'status' | 'output'> | null): PaidBrandKit {
  if (revision && revision.status === 'ready' && revision.output) return brandKitOf({ product_version: order.product_version, output: revision.output });
  return brandKitOf(order);
}

export function revisionView(facts: { order: OrderFacts; revision: Pick<StudioRevisionRow, 'status' | 'created_at' | 'ready_at'> | null; deliverySentAt: string | null | undefined; enabled: boolean; now?: number }): StudioRevisionView {
  const { order, revision, deliverySentAt, enabled, now = Date.now() } = facts;
  const until = revisionWindowEnd(order, deliverySentAt);
  const delivered = order.product_version === PAID_BRAND_KIT_VERSION && order.status === 'ready' && !!order.output
    && order.payment_status === 'paid' && order.refund_status === 'none' && order.model_call_limit != null;
  return {
    status: revision ? revision.status : 'none',
    canRequest: enabled && delivered && !revision && !order.revision_requested_at && !!until && new Date(until).getTime() >= now,
    availableUntil: until,
    requestedAt: revision ? revision.created_at : null,
    readyAt: revision ? revision.ready_at : null,
  };
}
