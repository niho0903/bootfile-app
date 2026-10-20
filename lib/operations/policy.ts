import type { OperationsPermission } from './types';

// Cost and concurrency limits are code-reviewed policy, never model output.
export const ORDER_BATCH_LIMIT = 2;
export const OPERATIONS_WINDOW_MINUTES = 5;
export const OPERATIONS_STALE_MINUTES = 20;

export function isOperationsPaused(): boolean {
  return process.env.BOOTFILE_OPERATIONS_PAUSED === 'true';
}

export const OPERATIONS_PERMISSIONS: OperationsPermission[] = [
  {
    task: 'Payment reconciliation and paid order fulfillment',
    authority: 'automatic',
    boundary: 'Verify payment with Stripe, then process at most two orders per run. Durable order leases and delivery records prevent duplicate work.',
  },
  {
    task: 'Recovery and operating checks',
    authority: 'automatic',
    boundary: 'Retry eligible paid jobs within their attempt limits, record every run, and open evidence-backed issues when routine recovery stops.',
  },
  {
    task: 'Product, price, or customer promises',
    authority: 'owner decision',
    boundary: 'Prepare the change and its evidence before requesting a decision. No automatic price changes or new purchase commitments.',
  },
  {
    task: 'Paid acquisition or a new recurring vendor cost',
    authority: 'owner decision',
    boundary: 'Paid acquisition allocation is $0. A concrete budget proposal must include its cap, success measure, and stop condition.',
  },
  {
    task: 'Owned-blog publication',
    authority: 'automatic',
    boundary: 'After release validation and enablement, an independent reviewer applies the fixed facts/source policy to the exact draft. The private publisher enforces two review claims and two publications per rolling seven days. Ordinary passing content does not need daily owner approval.',
  },
  {
    task: 'Social publication and promotional messages',
    authority: 'not connected',
    boundary: 'No social publishing, promotional email, paid distribution, or prospect contact is implemented by these routines. Such capabilities need their own concrete scope and authorization.',
  },
  {
    task: 'Customer-requested refunds within the existing policy',
    authority: 'automatic',
    boundary: 'The authenticated order handler applies the existing seven-day full-refund policy to the original payment with idempotency. Verify deployment before treating the handler as active.',
  },
  {
    task: 'Support inbox, refunds, and disputes',
    authority: 'not connected',
    boundary: 'An inbox connection is required before unattended email support can be claimed. Routine order recovery belongs to the agent; disputes and exceptions to the refund policy require judgment.',
  },
  {
    task: 'Production code changes',
    authority: 'automatic',
    boundary: 'Once release access is authorized, agents may deploy tested, reversible maintenance under the operating charter and verify rollback. Material product, price, security, and spending changes remain owner decisions. This web endpoint does not execute code changes.',
  },
];
