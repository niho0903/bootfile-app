import type { SupabaseClient } from '@supabase/supabase-js';
import { databaseErrorMessage } from './health';
import type { DecisionCategory, OperationsDecision, OperationsSnapshot } from './types';

interface ObservedIssue {
  decision_key: string;
  category: DecisionCategory;
  severity: 'critical' | 'review';
  title: string;
  detail: string;
  recommended_action: string;
  evidence: Record<string, string | number | boolean | null>;
}

export function observedOperationsIssues(snapshot: OperationsSnapshot): ObservedIssue[] {
  const issues: ObservedIssue[] = [];
  const affected = snapshot.health.filter(check => check.status === 'attention' || check.status === 'unavailable');
  for (const check of affected) {
    // A pause is an operator control, not a fresh incident to reopen every run.
    if (check.id === 'scheduler' && snapshot.policy.paused) continue;
    issues.push({
      decision_key: `health:${check.id}`,
      category: ['fulfillment', 'refunds'].includes(check.id) ? 'reliability' : 'configuration',
      severity: ['database', 'audit', 'fulfillment', 'refunds'].includes(check.id) ? 'critical' : 'review',
      title: check.label,
      detail: check.detail,
      recommended_action: check.id === 'refunds'
        ? 'Inspect the original payment and saved refund state. Reconcile an existing provider refund before attempting another. Apply the seven-day policy automatically when eligible; disputes, partial/prior refunds, non-card methods, and provider-action exceptions need a service review.'
        : check.id === 'fulfillment'
        ? 'Inspect the recorded failure, repair the cause, and resume eligible work. Apply the existing refund policy to a customer-requested eligible refund; escalate only an exception.'
        : check.id === 'scheduler'
          ? 'Verify the production schedule and its secret, then confirm a completed run in this ledger.'
          : check.id === 'growth'
            ? 'An agent should inspect the private publication record, repair provider or source-check failures, and preserve the exact review evidence. Ordinary editorial rejections remain unpublished without a daily owner queue. Escalate only a policy, product, security, or spending change.'
          : 'Repair the missing configuration or database access, verify it with a live read or bounded run, and let the next run close this issue.',
      evidence: { check: check.id, status: check.status, observed_at: snapshot.generatedAt },
    });
  }
  const unfinishedCount = snapshot.metrics.find(metric => metric.id === 'unfinished_runs')?.value;
  if (unfinishedCount !== null && unfinishedCount !== undefined && unfinishedCount > 0) {
    issues.push({
      decision_key: 'health:unfinished-runs', category: 'reliability', severity: 'review',
      title: 'An operating run did not finish',
      detail: `${unfinishedCount} run records are still running after ten minutes. Their final outcome is unknown.`,
      recommended_action: 'Inspect the deployment logs and order leases. Resume through the normal scheduler; do not assume a timed-out response means a payment or email was never processed.',
      evidence: { count: unfinishedCount, observed_at: snapshot.generatedAt },
    });
  }
  return issues;
}

/** Synchronizes only health issues. Product, budget and policy decisions are never auto-resolved. */
export async function syncOperationsDecisions(client: SupabaseClient, snapshot: OperationsSnapshot): Promise<{ opened: number; resolved: number }> {
  const issues = observedOperationsIssues(snapshot);
  const { data, error } = await client.from('operations_decisions')
    .select('id,decision_key,status')
    .like('decision_key', 'health:%');
  if (error) throw new Error(databaseErrorMessage(error));
  const existing = (data || []) as Pick<OperationsDecision, 'id' | 'decision_key' | 'status'>[];
  let opened = 0;
  let resolved = 0;

  for (const issue of issues) {
    const prior = existing.find(decision => decision.decision_key === issue.decision_key);
    const record = { ...issue, last_seen_at: snapshot.generatedAt };
    if (prior) {
      const { error: updateError } = await client.from('operations_decisions').update({
        ...record,
        status: prior.status === 'resolved' ? 'open' : prior.status,
        resolved_at: null,
      }).eq('id', prior.id);
      if (updateError) throw new Error(databaseErrorMessage(updateError));
      if (prior.status === 'resolved') opened += 1;
    } else {
      const { error: insertError } = await client.from('operations_decisions').upsert({
        ...record, status: 'open',
      }, { onConflict: 'decision_key', ignoreDuplicates: true });
      if (insertError) throw new Error(databaseErrorMessage(insertError));
      opened += 1;
    }
  }

  // Missing measurements must never close a delivery incident as though its count were zero.
  for (const prior of existing) {
    if (prior.status === 'resolved' || issues.some(issue => issue.decision_key === prior.decision_key)) continue;
    const healthId = prior.decision_key.slice('health:'.length);
    const correspondingCheck = snapshot.health.find(check => check.id === healthId);
    const isVerifiedResolved = correspondingCheck
      ? correspondingCheck.status === 'ready' || correspondingCheck.status === 'unverified'
      : healthId === 'unfinished-runs' && snapshot.metrics.find(metric => metric.id === 'unfinished_runs')?.value === 0;
    if (!isVerifiedResolved) continue;
    const { error: updateError } = await client.from('operations_decisions').update({
      status: 'resolved', resolved_at: snapshot.generatedAt, last_seen_at: snapshot.generatedAt,
    }).eq('id', prior.id);
    if (updateError) throw new Error(databaseErrorMessage(updateError));
    resolved += 1;
  }
  return { opened, resolved };
}
