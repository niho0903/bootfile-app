import { generatePersistedPaidBrandKit } from '../brand-kit/paid-intake';
import { BrandSynthesisError, PAID_BRAND_KIT_VERSION, type PaidBrandKit } from '../brand-kit/synthesis';
import { StudioError, studioErrorCode } from './errors';
import { generateStudioBundle } from './generation';
import { assertModelCallAllowed, meteredUsage, studioModelBudget, worstCaseCallCostMicroUsd, type StudioModelBudget } from './model-budget';
import { STUDIO_PRODUCT, type StudioBundle, type StudioOrderRow } from './types';

export interface StudioDispatchResult {
  output: StudioBundle | PaidBrandKit;
  usage: { model: string; input_tokens: number | null; output_tokens: number | null; cost_microusd?: number; cost_basis?: 'reported' | 'worst_case' };
}

/** A failed attempt that reached the provider. The worker records its usage with the failure. */
export class StudioGenerationError extends StudioError {
  constructor(code: string, message: string, public readonly usage: StudioDispatchResult['usage']) {
    super(code, message);
    this.name = 'StudioGenerationError';
  }
}

type DispatchOrder = Pick<StudioOrderRow, 'product_version' | 'intake' | 'generation_attempts'
  | 'model_call_limit' | 'model_cost_limit_microusd' | 'model_calls' | 'model_cost_microusd'>;

/** Brand Kit modules signal failures with plain error codes; the worker journals StudioError codes. */
function brandError(error: unknown): unknown {
  if (error instanceof StudioError || !(error instanceof Error) || !/^brand_[a-z_]+$/.test(error.message)) return error;
  return new StudioError(error.message, 'The Brand & AI Kit could not be generated on this attempt.');
}

/** The stricter of the budget bound on the order when it was created and the current configuration. */
function orderBudget(order: DispatchOrder): StudioModelBudget {
  const configured = studioModelBudget(order.product_version);
  return {
    ...configured,
    maxCalls: Math.min(configured.maxCalls, order.model_call_limit ?? configured.maxCalls),
    maxCostMicroUsd: Math.min(configured.maxCostMicroUsd, order.model_cost_limit_microusd ?? configured.maxCostMicroUsd),
  };
}

/**
 * The version persisted on the paid order selects the generator. Nothing in a
 * request, a default, or the current product constant can reinterpret an order.
 */
export async function generateForOrder(order: DispatchOrder, fetcher: typeof fetch = fetch): Promise<StudioDispatchResult> {
  if (order.product_version === STUDIO_PRODUCT.version) {
    const generated = await generateStudioBundle(order.intake, fetcher);
    return { output: generated.bundle, usage: generated.usage };
  }
  if (order.product_version === PAID_BRAND_KIT_VERSION) {
    const budget = orderBudget(order);
    // The claim that produced this order already counted this attempt. Calls the ledger recorded are
    // charged at their recorded cost; an earlier attempt that left no record (a crash, or an order that
    // predates the ledger) is charged at the worst case, never as zero.
    const priorAttempts = Math.max(order.generation_attempts - 1, 0);
    const recordedCalls = Math.max(order.model_calls ?? 0, 0);
    const recordedCost = Math.max(order.model_cost_microusd ?? 0, 0);
    let issuedModel = '';
    try {
      const generated = await generatePersistedPaidBrandKit(order.intake, fetcher, call => {
        assertModelCallAllowed({
          budget, model: call.model, requestBytes: call.requestBytes, maxOutputTokens: call.maxOutputTokens,
          spent: {
            calls: Math.max(priorAttempts, recordedCalls),
            costMicroUsd: recordedCost + Math.max(priorAttempts - recordedCalls, 0) * worstCaseCallCostMicroUsd(call.model, budget),
          },
        });
        issuedModel = call.model;
      });
      return { output: generated.kit, usage: meteredUsage(generated.usage, budget) };
    } catch (error) {
      const normalized = brandError(error);
      // Refused before any provider spend: nothing to meter.
      if (!issuedModel) throw normalized;
      // The provider answered with usage, or the outcome is unknown and the worst case is charged.
      const usage = meteredUsage(error instanceof BrandSynthesisError ? error.usage : { model: issuedModel, input_tokens: null, output_tokens: null }, budget);
      throw new StudioGenerationError(studioErrorCode(normalized), 'The Brand & AI Kit could not be generated on this attempt.', usage);
    }
  }
  throw new StudioError('product_version_unsupported', 'This order was created for a product version this worker cannot fulfill.');
}
