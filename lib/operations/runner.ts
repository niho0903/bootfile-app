import { getSupabaseAdmin } from '@/lib/supabase';
import { reconcileStudioPayments } from '@/lib/studio/reconcile';
import { runStudioWorker } from '@/lib/studio/worker';
import { reconcileStudioRefunds } from '@/lib/studio/refunds';
import { syncOperationsDecisions } from './decisions';
import { getOperationsSnapshot } from './health';
import { isOperationsPaused, ORDER_BATCH_LIMIT } from './policy';

export interface OperationsRunResult {
  status: 'completed' | 'partial' | 'failed' | 'paused' | 'skipped';
  runId?: string;
  reason?: string;
  summary?: Record<string, unknown>;
}

/** Only these deterministic tasks can be dispatched. No model-selected tools or arbitrary URLs. */
export async function runOperations(source: 'cron' | 'owner'): Promise<OperationsRunResult> {
  const client = getSupabaseAdmin();
  if (!client) return { status: 'failed', reason: 'database_not_configured' };

  // Database time, a serialized claim, and a six-minute lease cover adjacent windows too.
  // Refuse all paid dispatch unless the durable claim positively confirms ownership.
  const { data: claim, error: beginError } = await client.rpc('claim_operations_run', { p_source: source });
  if (beginError) return { status: 'failed', reason: 'run_ledger_unavailable' };
  if (claim?.status === 'skipped' && ['run_already_active', 'run_already_recorded_for_window'].includes(claim.reason)) {
    return { status: 'skipped', reason: claim.reason };
  }
  if (claim?.status !== 'claimed' || typeof claim.runId !== 'string') {
    return { status: 'failed', reason: 'run_ledger_unavailable' };
  }

  const runId = claim.runId as string;
  const summary: Record<string, unknown> = { orderBatchLimit: ORDER_BATCH_LIMIT, paidAcquisitionBudgetCents: 0 };
  const errorCodes: string[] = [];
  let status: OperationsRunResult['status'] = 'completed';

  try {
    if (isOperationsPaused()) {
      status = 'paused';
      summary.work = 'Paused by BOOTFILE_OPERATIONS_PAUSED';
    } else {
      if (process.env.STRIPE_SECRET_KEY) {
        try {
          const result = await reconcileStudioPayments({ limit: ORDER_BATCH_LIMIT });
          summary.payments = { checked: result.checked, paid: result.paid, expired: result.expired, errorCount: result.errors.length };
          if (result.errors.length) errorCodes.push('payment_reconciliation_failed');
        } catch {
          errorCodes.push('payment_reconciliation_failed');
        }
      } else {
        errorCodes.push('payment_configuration_missing');
      }

      // Refund and order claims have independent durable leases. Pending refunds block
      // fulfillment. Running these lanes together avoids stacking provider timeout budgets.
      const refunds = async () => {
        if (!process.env.STRIPE_SECRET_KEY) return;
        try {
          const result = await reconcileStudioRefunds({ limit: ORDER_BATCH_LIMIT });
          summary.refunds = result;
          if (result.errors || result.needsAttention) errorCodes.push('refund_reconciliation_requires_review');
        } catch {
          errorCodes.push('refund_reconciliation_failed');
        }
      };
      // Missing provider credentials should not exhaust a customer's paid generation attempts.
      const fulfillment = async () => {
        if (!process.env.ANTHROPIC_API_KEY || !process.env.RESEND_API_KEY) {
          errorCodes.push('fulfillment_configuration_missing');
          return;
        }
        try {
          const result = await runStudioWorker({ limit: ORDER_BATCH_LIMIT });
          summary.fulfillment = {
            claimed: result.claimed, completed: result.completed, retried: result.retried,
            needsAttention: result.needsAttention, deliveriesSent: result.deliveriesSent,
            deliveryFailures: result.deliveryFailures, errorCount: result.errors.length,
          };
          if (result.errors.length || result.needsAttention || result.deliveryFailures) errorCodes.push('fulfillment_requires_review');
        } catch {
          errorCodes.push('fulfillment_run_failed');
        }
      };
      await Promise.all([refunds(), fulfillment()]);
    }

    const snapshot = await getOperationsSnapshot(client, new Date());
    summary.health = snapshot.health.map(check => ({ id: check.id, status: check.status }));
    summary.decisions = await syncOperationsDecisions(client, snapshot);
    if (snapshot.health.some(check => ['database', 'audit'].includes(check.id) && check.status === 'unavailable')) {
      errorCodes.push('measurement_unavailable');
    }
    if (status !== 'paused' && errorCodes.length) status = 'partial';
  } catch {
    status = 'failed';
    errorCodes.push('operations_run_failed');
  }

  summary.errorCodes = [...new Set(errorCodes)];
  const { data: finished, error: finishError } = await client.rpc('finish_operations_run', {
    p_run_id: runId, p_status: status, p_summary: summary, p_error_code: errorCodes[0] || null,
  });
  if (finishError || finished !== true) return { status: 'failed', runId, reason: 'run_completion_not_persisted', summary };
  return { status, runId, summary };
}
