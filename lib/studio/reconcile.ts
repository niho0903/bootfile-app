import { studioDb, studioRpc } from './db';
import { studioErrorCode, StudioError } from './errors';
import { reconcileStudioSession } from './payments';

export interface StudioReconciliationResult { checked: number; paid: number; expired: number; errors: string[] }

/** Recovers missed webhooks and expires overdue open checkouts; never initiates a charge or refund. */
export async function reconcileStudioPayments({ limit = 10 }: { limit?: number } = {}): Promise<StudioReconciliationResult> {
  const result: StudioReconciliationResult = { checked: 0, paid: 0, expired: 0, errors: [] };
  if (!process.env.STRIPE_SECRET_KEY) { result.errors.push('payment_configuration_missing'); return result; }
  result.expired += await studioRpc<number>('studio_release_expired_drafts');
  const { data, error } = await studioDb().from('studio_orders').select('id,stripe_checkout_session_id')
    .eq('payment_status', 'awaiting_payment').not('stripe_checkout_session_id', 'is', null)
    .order('created_at', { ascending: true }).limit(Math.min(Math.max(Math.floor(limit), 1), 20));
  if (error) throw new StudioError('database_unavailable', 'Payment reconciliation is unavailable.');
  for (const order of data || []) {
    result.checked += 1;
    try {
      const outcome = await reconcileStudioSession(String(order.stripe_checkout_session_id));
      if (outcome.paid) result.paid += 1;
      if (outcome.expired) result.expired += 1;
    } catch (err) { result.errors.push(`${order.id}:${studioErrorCode(err)}`); }
  }
  return result;
}
