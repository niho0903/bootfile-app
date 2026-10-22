import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  isOperationsPaused,
  OPERATIONS_PERMISSIONS,
  OPERATIONS_STALE_MINUTES,
  OPERATIONS_WINDOW_MINUTES,
  ORDER_BATCH_LIMIT,
} from './policy';
import type { HealthCheck, OperationsDecision, OperationsMetric, OperationsRun, OperationsSnapshot } from './types';

const RUN_COLUMNS = 'id,run_key,source,status,started_at,finished_at,summary,error_code';
const DECISION_COLUMNS = 'id,decision_key,category,severity,title,detail,recommended_action,evidence,status,owner_note,created_at,last_seen_at,resolved_at';

export function databaseErrorMessage(error: { code?: string } | null | undefined): string {
  const code = error?.code?.replace(/[^A-Z0-9_]/gi, '').slice(0, 30);
  if (code && ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(code)) {
    return `Required schema is unavailable (${code}). Apply the reviewed Studio and operations migrations, then refresh the API schema cache.`;
  }
  if (code === '42501') return 'The database role lacks the required operations permissions (42501). Check service-role grants.';
  return code ? `Database request failed (${code}). Check database access and the server logs.` : 'Database request failed. Check the connection and server logs.';
}

function numericValue(data: unknown, key: string): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function buildOperationsMetrics(data: unknown): OperationsMetric[] {
  const count = (id: string, label: string, detail: string, period: OperationsMetric['period']): OperationsMetric => ({
    id, label, value: numericValue(data, id), format: 'count', detail, period,
  });
  return [
    count('paid_orders', 'Confirmed purchases', 'Orders first confirmed paid during the last seven days, including later refunded or disputed orders.', '7 days'),
    { id: 'gross_paid_cents', label: 'Gross checkout value', value: numericValue(data, 'gross_paid_cents'), format: 'currency', detail: 'Confirmed checkout amounts before fees, refunds, disputes, or operating costs. This is not profit.', period: '7 days' },
    count('ready_orders', 'Setups ready', 'Orders with a generated setup saved successfully during the last seven days.', '7 days'),
    count('deliveries_sent', 'Delivery emails accepted', 'Receipts accepted by the email provider during the last seven days. Inbox arrival and customer use are not confirmed.', '7 days'),
    count('queued_orders', 'Paid work in progress', 'Currently paid orders waiting for generation or holding a generation lease.', 'current'),
    count('needs_attention', 'Orders needing attention', 'Currently paid orders where automatic generation recovery stopped.', 'current'),
    count('delivery_failures', 'Failed email deliveries', 'Current delivery records in failed state. These do not mean the saved setup is missing.', 'current'),
    count('refunded_orders', 'Fully refunded orders', 'Current orders with a provider-confirmed full refund observed through a Stripe API response or signed webhook. Partial refunds are not counted.', 'current'),
    { id: 'refunded_cents', label: 'Recorded refunds', value: numericValue(data, 'refunded_cents'), format: 'currency', detail: 'Cumulative recorded refund amounts across all Studio orders, including partial refunds. This has a different period from seven-day gross checkout value.', period: 'current' },
    count('disputed_orders', 'Disputed orders', 'Current orders marked disputed by an observed Stripe event.', 'current'),
    count('failed_refunds', 'Refunds needing review', 'Current refund requests in failed state. The original payment and exception evidence must be reviewed before another money movement.', 'current'),
    count('refund_requires_action', 'Refunds requiring action', 'Refunds whose observed provider state requires additional action.', 'current'),
    count('stale_refunds', 'Refunds pending over a day', 'Requests still pending more than 24 hours after the saved customer request. Provider timing and status need review.', 'current'),
    count('unfinished_runs', 'Runs with an unknown outcome', 'Run records still marked running more than ten minutes after they started. This count covers the full ledger.', 'current'),
    { id: 'first_task_use', label: 'First task actually used', value: null, format: 'count', detail: 'Customer use is not yet measured. A saved setup or an accepted email is not evidence of use.', period: 'not measured' },
    { id: 'repeat_use', label: 'Repeat task use', value: null, format: 'count', detail: 'Repeat use in another AI tool is not observable yet. Do not infer retention from purchases or downloads.', period: 'not measured' },
    { id: 'support_requests', label: 'Open support requests', value: null, format: 'count', detail: 'No support inbox connection is installed in this operating loop.', period: 'not measured' },
  ];
}

export function buildFeedbackMetrics(data: unknown): OperationsMetric[] {
  const required = ['ready_orders','feedback_orders','usefulness_responses','useful_orders','not_useful_orders','first_use_orders','reuse_orders'];
  const ready = required.every(key => numericValue(data, key) !== null);
  const value = (key: string) => ready ? numericValue(data, key) : null;
  const cohort = 'Current explicit reports from orders first marked ready in the last seven days, including later refunds. A report is not independently observed use.';
  const metric = (id: string, key: string, label: string, detail: string): OperationsMetric => ({ id, label, value: value(key), format: 'count', period: ready ? '7 days' : 'not measured', detail: ready ? `${detail} ${cohort}` : 'The customer-report aggregate is unavailable; no use or satisfaction is inferred.' });
  return [
    metric('first_task_use','first_use_orders','Customer-reported first use','Unique orders whose customer explicitly reported using the setup.'),
    metric('repeat_use','reuse_orders','Customer-reported reuse','Unique orders whose customer explicitly reported using the setup again; this is not a retention rate.'),
    metric('feedback_ready_orders','ready_orders','Ready-order feedback cohort','Denominator: all orders first marked ready in this seven-day cohort.'),
    metric('feedback_orders','feedback_orders','Orders with any feedback','Orders in the cohort with at least one explicit report.'),
    metric('usefulness_responses','usefulness_responses','Usefulness responses','Denominator for usefulness: orders that answered useful or not useful.'),
    metric('useful_orders','useful_orders','Reported useful','Orders whose current explicit usefulness response is useful.'),
    metric('not_useful_orders','not_useful_orders','Reported not useful','Orders whose current explicit usefulness response is not useful.'),
  ];
}

function providerCheck(id: string, label: string, names: string[], purpose: string): HealthCheck {
  const variables = names.map(name => ({ name, present: Boolean(process.env[name]) }));
  const missing = variables.filter(variable => !variable.present);
  return {
    id, label, variables,
    status: missing.length ? 'attention' : 'unverified',
    detail: missing.length
      ? `${purpose} is blocked by missing configuration: ${missing.map(variable => variable.name).join(', ')}.`
      : `Required configuration is present. Provider access and successful ${purpose.toLowerCase()} are not verified by an environment check.`,
  };
}

export async function getOperationsSnapshot(
  client: SupabaseClient | null = getSupabaseAdmin(),
  now = new Date(),
): Promise<OperationsSnapshot> {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  let metricsData: unknown = null;
  let metricError = 'Database configuration is missing.';
  let metricReady = false;
  let feedbackData: unknown = null;
  let growthData: unknown = null;
  const runs: OperationsSnapshot['runs'] = { available: false, error: metricError, items: [] };
  const decisions: OperationsSnapshot['decisions'] = { available: false, error: metricError, items: [] };

  if (client) {
    const results = await Promise.allSettled([
      client.rpc('get_operations_metrics', { p_since: since }),
      client.from('operations_runs').select(RUN_COLUMNS).order('started_at', { ascending: false }).limit(20),
      client.from('operations_decisions').select(DECISION_COLUMNS).neq('status', 'resolved').order('created_at', { ascending: true }).limit(100),
      client.rpc('get_growth_publication_metrics'),
      client.rpc('get_studio_feedback_metrics', { p_since: since }),
    ]);
    const [metricResult, runResult, decisionResult, growthResult, feedbackResult] = results;
    if (growthResult.status === 'fulfilled' && !growthResult.value.error) growthData = growthResult.value.data;
    if (feedbackResult.status === 'fulfilled' && !feedbackResult.value.error) feedbackData = feedbackResult.value.data;
    if (metricResult.status === 'fulfilled' && !metricResult.value.error && metricResult.value.data) {
      metricsData = metricResult.value.data;
      metricReady = buildOperationsMetrics(metricsData).filter(metric => metric.period !== 'not measured').every(metric => metric.value !== null);
      metricError = metricReady ? '' : 'The metrics query returned an unexpected shape. Check the applied operations migration.';
    } else {
      metricError = metricResult.status === 'fulfilled' ? databaseErrorMessage(metricResult.value.error) : databaseErrorMessage(null);
    }
    if (runResult.status === 'fulfilled' && !runResult.value.error) {
      runs.available = true;
      runs.error = null;
      runs.items = (runResult.value.data || []) as OperationsRun[];
    } else {
      runs.error = runResult.status === 'fulfilled' ? databaseErrorMessage(runResult.value.error) : databaseErrorMessage(null);
    }
    if (decisionResult.status === 'fulfilled' && !decisionResult.value.error) {
      decisions.available = true;
      decisions.error = null;
      decisions.items = (decisionResult.value.data || []) as OperationsDecision[];
    } else {
      decisions.error = decisionResult.status === 'fulfilled' ? databaseErrorMessage(decisionResult.value.error) : databaseErrorMessage(null);
    }
  }

  const lastCron = runs.items.find(run => run.source === 'cron');
  const lastCompletedCron = runs.items.find(run => run.source === 'cron' && run.status === 'completed');
  const staleCutoff = now.getTime() - OPERATIONS_STALE_MINUTES * 60_000;
  const stale = !lastCron || Date.parse(lastCron.started_at) < staleCutoff;
  const paused = isOperationsPaused();
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const scheduleEvidence = !runs.available
    ? 'Run history is unavailable. A schedule cannot be verified.'
    : !lastCron
      ? 'No invocation authenticated with the cron secret has been recorded. A configured route alone does not prove a deployed schedule.'
      : `A cron-authenticated invocation was recorded at ${lastCron.started_at}. ${stale ? 'No recent invocation is visible; inspect the deployment schedule.' : 'This is observed execution evidence; the deployment provider remains the source of schedule configuration.'}`;

  const feedbackMetrics = buildFeedbackMetrics(feedbackData);
  const feedbackReady = feedbackMetrics.every(metric => metric.value !== null);
  const growthReady = ['review_claims_7d','published_7d','approved','exceptions','rejected'].every(key => numericValue(growthData, key) !== null);
  const reviewEnabled = process.env.GROWTH_REVIEW_ENABLED === 'true';
  const publicationEnabled = process.env.GROWTH_PUBLICATION_ENABLED === 'true';
  const publisherConfigured = Boolean(process.env.GROWTH_PUBLISHER_SECRET);
  const metrics: OperationsMetric[] = [
    ...buildOperationsMetrics(metricReady ? metricsData : null).filter(metric => !['first_task_use','repeat_use'].includes(metric.id)),
    ...feedbackMetrics,
    { id: 'published_articles', label: 'Owned-blog articles published', value: growthReady ? numericValue(growthData, 'published_7d') : null, format: 'count', period: '7 days', detail: 'Observed publication transactions in the past seven days, including any later withdrawals. Publication is not evidence of reach or revenue.' },
  ];
  const countFor = (id: string) => metrics.find(metric => metric.id === id)?.value;
  const problemCount = (countFor('needs_attention') ?? 0) + (countFor('delivery_failures') ?? 0);
  const refundProblemCount = (countFor('failed_refunds') ?? 0) + (countFor('refund_requires_action') ?? 0) + (countFor('stale_refunds') ?? 0);
  const refundsEnabled = process.env.STUDIO_REFUNDS_ENABLED === 'true';
  const health: HealthCheck[] = [
    {
      id: 'database', label: 'Order database', status: metricReady ? 'ready' : 'unavailable',
      detail: metricReady ? 'Live aggregate queries succeeded. These measurements come from the Studio order and delivery ledgers.' : metricError,
      variables: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].map(name => ({ name, present: Boolean(process.env[name]) })),
    },
    {
      id: 'audit', label: 'Run history and decision queue',
      status: runs.available && decisions.available ? 'ready' : 'unavailable',
      detail: runs.available && decisions.available ? 'The private operating ledger is readable.' : [runs.error, decisions.error].filter((value, index, values) => value && values.indexOf(value) === index).join(' '),
    },
    providerCheck('payments', 'Stripe', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], 'Payment verification'),
    providerCheck('generation', 'Setup generation', ['ANTHROPIC_API_KEY'], 'Setup generation'),
    providerCheck('email', 'Transactional email', ['RESEND_API_KEY'], 'Transactional delivery'),
    {
      id: 'scheduler', label: 'Routine scheduler',
      status: paused || !cronConfigured || stale ? 'attention' : 'ready',
      detail: paused ? `Execution is paused by BOOTFILE_OPERATIONS_PAUSED. ${scheduleEvidence}` : !cronConfigured ? `CRON_SECRET is missing. ${scheduleEvidence}` : scheduleEvidence,
      variables: [{ name: 'CRON_SECRET', present: cronConfigured }],
    },
    {
      id: 'fulfillment', label: 'Fulfillment recovery',
      status: !metricReady ? 'unavailable' : problemCount > 0 ? 'attention' : 'ready',
      detail: !metricReady ? 'Order and delivery failure counts are unavailable.' : problemCount > 0 ? `${problemCount} generation or email failure records require review. Inspect the order and run evidence before retrying or refunding.` : 'No orders or deliveries are currently recorded in a terminal failure state.',
    },
    {
      id: 'refunds', label: 'Refund recovery',
      status: !metricReady ? 'unavailable' : !refundsEnabled || refundProblemCount > 0 ? 'attention' : 'ready',
      detail: !metricReady ? 'Refund exception counts are unavailable.' : refundProblemCount > 0
        ? `${countFor('failed_refunds')} failed refunds, ${countFor('refund_requires_action')} provider-action cases, and ${countFor('stale_refunds')} requests pending over 24 hours are recorded. An order can appear in more than one count.`
        : !refundsEnabled ? 'New self-service refund requests are disabled. Already-saved requests still reconcile. Verify the handler and enable STUDIO_REFUNDS_ENABLED before relying on unattended policy-eligible refunds.'
          : 'The refund queue is readable and no failure, provider-action, or overdue request is recorded. New self-service requests are enabled by configuration.',
      variables: [{ name: 'STUDIO_REFUNDS_ENABLED', present: refundsEnabled }],
    },
    {
      id: 'feedback', label: 'Customer reports', status: feedbackReady ? 'ready' : 'unavailable',
      detail: feedbackReady ? 'The private feedback aggregate is readable. Counts reflect explicit customer reports for the ready-order cohort, with separate feedback and usefulness denominators.' : 'Customer-report counts are unavailable. Verify the feedback migration and service-role RPC; do not infer use from a saved setup or email receipt.',
    },
    {
      id: 'growth', label: 'Owned-blog review and publication',
      status: !growthReady ? 'unavailable' : (numericValue(growthData, 'exceptions') ?? 0) > 0 || ((reviewEnabled || publicationEnabled) && !publisherConfigured) ? 'attention' : !reviewEnabled && !publicationEnabled ? 'unverified' : 'ready',
      detail: !growthReady ? 'The private publication ledger is unavailable. No publication or review counts can be confirmed.'
        : `The ledger records ${numericValue(growthData, 'review_claims_7d')} review claims and ${numericValue(growthData, 'published_7d')} publications in seven days; ${numericValue(growthData, 'approved')} approved items await publication, ${numericValue(growthData, 'exceptions')} operating exceptions, and ${numericValue(growthData, 'rejected')} ordinary editorial rejections. Review is ${reviewEnabled ? 'enabled' : 'disabled'} and publication is ${publicationEnabled ? 'enabled' : 'disabled'} by configuration. These reads do not verify the separate Railway deployment or schedule.`,
      variables: [
        { name: 'GROWTH_AGENT_SECRET', present: Boolean(process.env.GROWTH_AGENT_SECRET) },
        { name: 'GROWTH_PUBLISHER_SECRET', present: publisherConfigured },
        { name: 'GROWTH_REVIEW_ENABLED', present: reviewEnabled },
        { name: 'GROWTH_PUBLICATION_ENABLED', present: publicationEnabled },
      ],
    },
  ];

  return {
    generatedAt: now.toISOString(), since, metrics, health, runs, decisions,
    permissions: OPERATIONS_PERMISSIONS,
    policy: { paused, paidAcquisitionBudgetCents: 0, orderBatchLimit: ORDER_BATCH_LIMIT, dedupeWindowMinutes: OPERATIONS_WINDOW_MINUTES },
    runtime: {
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      deployment: process.env.VERCEL_URL || null,
      lastCronInvocation: lastCron?.started_at || null,
      lastCompletedCronInvocation: lastCompletedCron?.finished_at || null,
      scheduleEvidence,
    },
  };
}
