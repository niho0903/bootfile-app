import { randomUUID } from 'node:crypto';
import { assertStudioWorkerConfigured, studioDailyGenerationLimit } from './config';
import { getStudioOrder, studioRpc } from './db';
import { sendStudioDelivery } from './delivery';
import { studioErrorCode, StudioError } from './errors';
import { generateStudioBundle, type StudioGeneratedResult } from './generation';
import type { StudioDeliveryRow, StudioIntake, StudioOrderRow } from './types';

export interface StudioWorkerResult {
  claimed: number;
  completed: number;
  retried: number;
  needsAttention: number;
  deliveriesSent: number;
  deliveryFailures: number;
  errors: string[];
}

export interface StudioWorkerDependencies {
  rpc: typeof studioRpc;
  getOrder: typeof getStudioOrder;
  generate: (intake: StudioIntake) => Promise<StudioGeneratedResult>;
  deliver: (order: StudioOrderRow) => Promise<string>;
  assertConfigured: () => void;
}

const defaults: StudioWorkerDependencies = { rpc: studioRpc, getOrder: getStudioOrder, generate: generateStudioBundle, deliver: sendStudioDelivery, assertConfigured: assertStudioWorkerConfigured };

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
      const generated = await dependencies.generate(order.intake);
      const committed = await dependencies.rpc<boolean>('studio_finish_generation', { p_order_id: order.id, p_lease_token: leaseToken, p_output: generated.bundle, p_usage: generated.usage });
      if (!committed) throw new StudioError('generation_lease_lost', 'This worker no longer owns the order.');
      result.completed += 1;
    } catch (error) {
      const code = studioErrorCode(error);
      result.errors.push(order ? `${order.id}:${code}` : code);
      if (!order) break;
      try {
        const status = await dependencies.rpc<string>('studio_fail_generation', { p_order_id: order.id, p_lease_token: leaseToken, p_error_code: code });
        if (status === 'needs_attention') result.needsAttention += 1;
        if (status === 'queued') result.retried += 1;
      } catch (persistenceError) {
        // Do not fake success. The expired lease makes this job recoverable next run.
        result.errors.push(`${order.id}:${studioErrorCode(persistenceError)}`);
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
