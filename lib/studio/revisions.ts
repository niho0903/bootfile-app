import { createHash } from 'node:crypto';
import type { BrandInput } from '../brand-kit/kit';
import { generatePersistedPaidBrandKit, persistedPaidBrandIntake, validatePersistedPaidBrandIntake, type PersistedPaidBrandIntake } from '../brand-kit/paid-intake';
import { BrandSynthesisError, PAID_BRAND_KIT_VERSION, type PaidBrandKit } from '../brand-kit/synthesis';
import { studioDailyGenerationLimit, studioRevisionsEnabled } from './config';
import { getStudioDelivery, getStudioRevision, studioRpc } from './db';
import { StudioGenerationError, type StudioDispatchResult } from './dispatch';
import { StudioError, studioErrorCode } from './errors';
import { assertModelCallAllowed, meteredUsage, studioModelBudget, studioRevisionAllowance, worstCaseCallCostMicroUsd, type StudioModelBudget } from './model-budget';
import { revisionView } from './revision-state';
import type { StudioOrderRow, StudioRevisionRow, StudioRevisionView } from './types';

/**
 * One revision for a paid Brand & AI Kit order: the customer changes their answers once, approves
 * the summary again and receives a regenerated kit. Closed unless BRAND_KIT_REVISIONS_ENABLED is on
 * and the revision schema is present. The first answers, their approval and the first kit are never
 * rewritten. Every provider call is added to the order's own usage ledger.
 */

const NOT_AVAILABLE = 'A revision is not available for this order. Contact support@bootfile.ai with your order ID if you need help.';
const ANSWER_MESSAGES: Record<string, string> = {
  brand_backbrief_approval_required: 'Your answers changed after you approved them. Please review and approve them again.',
  brand_intake_incomplete: 'Please finish the remaining questions before you send your revision.',
  brand_intake_too_large: 'Your answers are too long for one kit. Please shorten the longest ones.',
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function assertStudioRevisionsEnabled(): void {
  if (!studioRevisionsEnabled()) throw new StudioError('revision_unavailable', 'Revisions are not open yet.');
}

/** Present only after studio_order_revisions_v1. Without it a revision cannot be saved or fulfilled. */
export async function checkStudioRevisionSchema(): Promise<void> {
  const contract = await studioRpc<{ version?: string; product?: string }>('studio_order_revisions_contract');
  if (contract?.version !== 'studio-order-revisions-v1' || contract.product !== PAID_BRAND_KIT_VERSION) {
    throw new StudioError('schema_unavailable', 'Revisions are being prepared.');
  }
}

/** The answers the customer approved when they bought, re-checked against their saved approval digest. */
function approvedOrderAnswers(order: Pick<StudioOrderRow, 'product_version' | 'intake'>): { brand: BrandInput; email: string; approvalSnapshotSha256: string } {
  if (order.product_version !== PAID_BRAND_KIT_VERSION) throw new StudioError('revision_not_available', NOT_AVAILABLE, 409);
  try {
    const intake = validatePersistedPaidBrandIntake(order.intake);
    return { brand: intake.brand, email: intake.email, approvalSnapshotSha256: (order.intake as unknown as PersistedPaidBrandIntake).approvalSnapshotSha256 };
  } catch {
    throw new StudioError('revision_not_available', NOT_AVAILABLE, 409);
  }
}

async function revisionStateFor(order: StudioOrderRow): Promise<StudioRevisionView> {
  const delivery = await getStudioDelivery(order.id);
  const revision = order.revision_requested_at ? await getStudioRevision(order.id) : null;
  return revisionView({ order, revision, deliverySentAt: delivery?.sent_at, enabled: studioRevisionsEnabled() });
}

/**
 * What the editor needs: the customer's own answers, private notes included. It is fetched only on an
 * explicit request with the private order link, and only while a revision can still be requested.
 */
export async function studioRevisionDraft(order: StudioOrderRow): Promise<{ revision: StudioRevisionView; answers: BrandInput }> {
  assertStudioRevisionsEnabled();
  const answers = approvedOrderAnswers(order);
  const revision = await revisionStateFor(order);
  if (!revision.canRequest) throw new StudioError(revision.status === 'none' ? 'revision_not_available' : 'revision_already_used',
    revision.status === 'none' ? NOT_AVAILABLE : 'This order has already used its one revision.', 409);
  return { revision, answers: answers.brand };
}

/**
 * Saves the order's one revision. The delivery address and the accepted terms are the order's own and
 * cannot be changed here. The database function repeats every eligibility rule under a lock.
 */
export async function requestStudioRevision(order: StudioOrderRow, raw: unknown): Promise<StudioRevisionRow> {
  assertStudioRevisionsEnabled();
  const original = approvedOrderAnswers(order);
  if (!record(raw)) throw new StudioError('brand_intake_invalid', 'Please complete your answers and try again.', 400);
  let intake: PersistedPaidBrandIntake;
  try {
    intake = persistedPaidBrandIntake({
      productVersion: PAID_BRAND_KIT_VERSION, brand: raw.brand, email: original.email, acceptedTerms: true,
      approvedBackbrief: raw.approvedBackbrief, approvalSnapshot: raw.approvalSnapshot,
    });
  } catch (error) {
    const code = error instanceof Error && /^brand_[a-z_]+$/.test(error.message) ? error.message : 'brand_intake_invalid';
    throw new StudioError(code, ANSWER_MESSAGES[code] || 'Please complete your answers and try again.', 400);
  }
  if (intake.approvalSnapshotSha256 === original.approvalSnapshotSha256) throw new StudioError('revision_unchanged', 'Change at least one answer before you send your revision.', 400);
  await checkStudioRevisionSchema();
  const allowance = studioRevisionAllowance(order.product_version);
  let rows: StudioRevisionRow[];
  try {
    rows = await studioRpc<StudioRevisionRow[]>('studio_request_revision', {
      p_order_id: order.id,
      p_intake: intake,
      p_intake_hash: createHash('sha256').update(JSON.stringify(intake)).digest('hex'),
      p_call_limit: allowance.maxCalls,
      p_order_cost_limit_microusd: allowance.orderMaxCostMicroUsd,
      p_daily_limit: studioDailyGenerationLimit(),
    });
  } catch (error) {
    // The shared capacity message speaks about a checkout brief. A refused revision has not been used.
    if (error instanceof StudioError && error.code === 'temporarily_full') throw new StudioError('temporarily_full', 'We are at capacity for the moment. Your revision has not been used. Please try again shortly.', 503);
    throw error;
  }
  const revision = rows?.[0];
  if (!revision) throw new StudioError('revision_not_saved', 'Your revision could not be saved. Please try again.');
  return revision;
}

type RevisionOrder = Pick<StudioOrderRow, 'product_version' | 'generation_attempts' | 'model_calls' | 'model_cost_microusd'>;
type RevisionWork = Pick<StudioRevisionRow, 'intake' | 'attempts' | 'call_limit' | 'order_cost_limit_microusd' | 'calls_recorded'>;

/** The stricter of the limits bound on the revision when it was requested and the current allowance. */
function revisionBudget(order: RevisionOrder, revision: RevisionWork): StudioModelBudget {
  const allowance = studioRevisionAllowance(order.product_version);
  return {
    ...studioModelBudget(order.product_version),
    maxCalls: Math.min(allowance.maxCalls, revision.call_limit),
    maxCostMicroUsd: Math.min(allowance.orderMaxCostMicroUsd, revision.order_cost_limit_microusd),
  };
}

/**
 * Generates the revised kit with the same request builder as the first kit. Before any provider
 * spend the next call is checked against the revision's own call limit and the whole order's ceiling.
 * Calls the ledger recorded are charged at their recorded cost. An attempt that left no record,
 * in the first run or in this revision, is charged at the worst case, never as zero.
 */
export async function generateRevisionForOrder(order: RevisionOrder, revision: RevisionWork, fetcher: typeof fetch = fetch): Promise<{ output: PaidBrandKit; usage: StudioDispatchResult['usage'] }> {
  if (order.product_version !== PAID_BRAND_KIT_VERSION) throw new StudioError('product_version_unsupported', 'This order was created for a product version this worker cannot revise.');
  const budget = revisionBudget(order, revision);
  const priorAttempts = Math.max(revision.attempts - 1, 0);
  const recordedHere = Math.max(revision.calls_recorded, 0);
  const recordedFirstRun = Math.max((order.model_calls ?? 0) - recordedHere, 0);
  const unrecorded = Math.max(priorAttempts - recordedHere, 0) + Math.max(order.generation_attempts - recordedFirstRun, 0);
  const recordedCost = Math.max(order.model_cost_microusd ?? 0, 0);
  let issuedModel = '';
  try {
    const generated = await generatePersistedPaidBrandKit(revision.intake, fetcher, call => {
      assertModelCallAllowed({
        budget, model: call.model, requestBytes: call.requestBytes, maxOutputTokens: call.maxOutputTokens,
        spent: { calls: Math.max(priorAttempts, recordedHere), costMicroUsd: recordedCost + unrecorded * worstCaseCallCostMicroUsd(call.model, budget) },
      });
      issuedModel = call.model;
    });
    return { output: generated.kit, usage: meteredUsage(generated.usage, budget) };
  } catch (error) {
    const normalized = error instanceof StudioError || !(error instanceof Error) || !/^brand_[a-z_]+$/.test(error.message)
      ? error : new StudioError(error.message, 'The revised Brand & AI Kit could not be generated on this attempt.');
    // Refused before any provider spend: nothing to meter.
    if (!issuedModel) throw normalized;
    const usage = meteredUsage(error instanceof BrandSynthesisError ? error.usage : { model: issuedModel, input_tokens: null, output_tokens: null }, budget);
    throw new StudioGenerationError(studioErrorCode(normalized), 'The revised Brand & AI Kit could not be generated on this attempt.', usage);
  }
}
