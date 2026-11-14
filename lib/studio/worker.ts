import { randomUUID } from 'node:crypto';
import { assertStudioWorkerConfigured, studioDailyGenerationLimit, studioRevisionsEnabled } from './config';
import { getStudioOrder, studioRpc } from './db';
import { sendStudioDelivery } from './delivery';
import { studioErrorCode, StudioError } from './errors';
import { generateForOrder, StudioGenerationError, type StudioDispatchResult } from './dispatch';
import { generateRevisionForOrder } from './revisions';
import type { StudioDeliveryRow, StudioOrderRow, StudioRevisionRow } from './types';

export interface StudioWorkerResult {
  claimed: number;
  completed: number;
  retried: number;
  needsAttention: number;
  deliveriesSent: number;
  deliveryFailures: number;
  errors: string[];
  /** Present only while the revision allowance is open. */
  revisions?: { claimed: number; completed: number; retried: number; needsAttention: number };
}

export interface StudioWorkerDependencies {
  rpc: typeof studioRpc;
  getOrder: typeof getStudioOrder;
  generate: (order: StudioOrderRow) => Promise<StudioDispatchResult>;
  deliver: (order: StudioOrderRow) => Promise<string>;
  assertConfigured: () => void;
  /** Both optional: a caller that leaves them out runs no revision work. */
  revisionsEnabled?: () => boolean;
  generateRevision?: (order: StudioOrderRow, revision: StudioRevisionRow) => Promise<Pick<StudioDispatchResult, 'usage'> & { output: StudioDispatchResult['output'] }>;
}

const defaults: StudioWorkerDependencies = {
  rpc: studioRpc, getOrder: getStudioOrder, generate: generateForOrder, deliver: sendStudioDelivery, assertConfigured: assertStudioWorkerConfigured,
  revisionsEnabled: studioRevisionsEnabled, generateRevision: (order, revision) => generateRevisionForOrder(order, revision),
};

/** Durable claims, fenced commits and a receipt ledger; safe to invoke concurrently or after a crash. */
export async function runStudioWorker(
  { limit = 2 }: { limit?: number } = {},
  dependencies: StudioWorkerDependencies = defaults,
): Promise<StudioWorkerResult> {
  const result: StudioWorkerResult = { claimed: 0, completed: 0, retried: 0, needsAttention: 0, deliveriesSent: 0, deliveryFailures: 0, errors: [] };
  try { dependencies.assertConfigured(); } catch (error) { result.errors.push(studioErrorCode(error)); return result; }
  const boundedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 3) : 2;

  for (let i = 0; i < boundedLimit; i += 1) {
    const leaseToken = randomUUID();
    let order: StudioOrderRow | undefined;
    try {
      order = (await dependencies.rpc<StudioOrderRow[]>('studio_claim_order', { p_lease_token: leaseToken, p_daily_limit: studioDailyGenerationLimit() }))?.[0];
      if (!order) break;
      result.claimed += 1;
      const generated = await dependencies.generate(order);
      const committed = await dependencies.rpc<boolean>('studio_finish_generation', { p_order_id: order.id, p_lease_token: leaseToken, p_output: generated.output, p_usage: generated.usage });
      if (!committed) throw new StudioError('generation_lease_lost', 'This worker no longer owns the order.');
      result.completed += 1;
    } catch (error) {
      const code = studioErrorCode(error);
      result.errors.push(order ? `${order.id}:${code}` : code);
      if (!order) break;
      try {
        // An attempt that reached the provider is recorded in the order's usage ledger together with its failure.
        const status = error instanceof StudioGenerationError
          ? await dependencies.rpc<string>('studio_fail_metered_generation', { p_order_id: order.id, p_lease_token: leaseToken, p_error_code: code, p_usage: error.usage })
          : await dependencies.rpc<string>('studio_fail_generation', { p_order_id: order.id, p_lease_token: leaseToken, p_error_code: code });
        if (status === 'needs_attention') result.needsAttention += 1;
        if (status === 'queued') result.retried += 1;
      } catch (persistenceError) {
        // Do not fake success. The expired lease makes this job recoverable next run.
        result.errors.push(`${order.id}:${studioErrorCode(persistenceError)}`);
      }
    }
  }

  // The one revision a Brand & AI Kit order may use. Closed unless its own flag is on. The same durable
  // pattern as an order: claim under a lease, generate, commit under the lease, or record the failure.
  const generateRevision = dependencies.generateRevision;
  if (generateRevision && dependencies.revisionsEnabled?.()) {
    const revisions = { claimed: 0, completed: 0, retried: 0, needsAttention: 0 };
    result.revisions = revisions;
    // One per run: a revision is a full provider call, and an order may already have used this run's time.
    for (let i = 0; i < 1; i += 1) {
      const leaseToken = randomUUID();
      let revision: StudioRevisionRow | undefined;
      try {
        revision = (await dependencies.rpc<StudioRevisionRow[]>('studio_claim_revision', { p_lease_token: leaseToken, p_daily_limit: studioDailyGenerationLimit() }))?.[0];
        if (!revision) break;
        revisions.claimed += 1;
        const order = await dependencies.getOrder(revision.order_id);
        if (!order || !order.output || order.payment_status !== 'paid' || order.refund_status !== 'none') throw new StudioError('revision_order_not_ready', 'The order cannot be revised.');
        const generated = await generateRevision(order, revision);
        const committed = await dependencies.rpc<boolean>('studio_finish_revision', { p_order_id: revision.order_id, p_lease_token: leaseToken, p_output: generated.output, p_usage: generated.usage });
        if (!committed) throw new StudioError('revision_lease_lost', 'This worker no longer owns the revision.');
        revisions.completed += 1;
      } catch (error) {
        const code = studioErrorCode(error);
        result.errors.push(revision ? `${revision.order_id}:revision:${code}` : `revision:${code}`);
        if (!revision) break;
        try {
          const status = await dependencies.rpc<string>('studio_fail_revision', {
            p_order_id: revision.order_id, p_lease_token: leaseToken, p_error_code: code,
            p_usage: error instanceof StudioGenerationError ? error.usage : null,
          });
          if (status === 'needs_attention') revisions.needsAttention += 1;
          if (status === 'queued') revisions.retried += 1;
        } catch (persistenceError) {
          // Do not fake success. The expired lease makes this revision recoverable next run.
          result.errors.push(`${revision.order_id}:revision:${studioErrorCode(persistenceError)}`);
        }
      }
    }
  }

  // Output was committed before a send is claimed. A failed email never causes regeneration.
  for (let i = 0; i < boundedLimit; i += 1) {
    const leaseToken = randomUUID();
    let delivery: StudioDeliveryRow | undefined;
    try {
      delivery = (await dependencies.rpc<StudioDeliveryRow[]>('studio_claim_delivery', { p_lease_token: leaseToken }))?.[0];
      if (!delivery) break;
      const order = await dependencies.getOrder(delivery.order_id);
      if (!order || !order.output || order.payment_status !== 'paid' || order.refund_status !== 'none') throw new StudioError('delivery_not_ready', 'The order cannot be delivered.');
      const messageId = await dependencies.deliver(order);
      const committed = await dependencies.rpc<boolean>('studio_finish_delivery', { p_order_id: order.id, p_lease_token: leaseToken, p_provider_message_id: messageId });
      if (!committed) throw new StudioError('delivery_lease_lost', 'The email receipt needs reconciliation.');
      result.deliveriesSent += 1;
    } catch (error) {
      const code = studioErrorCode(error);
      result.errors.push(delivery ? `${delivery.order_id}:${code}` : code);
      if (!delivery) break;
      try {
        const status = await dependencies.rpc<string>('studio_fail_delivery', { p_order_id: delivery.order_id, p_lease_token: leaseToken, p_error_code: code });
        if (status === 'failed') result.deliveryFailures += 1;
      } catch (persistenceError) { result.errors.push(`${delivery.order_id}:${studioErrorCode(persistenceError)}`); }
    }
  }
  return result;
}
