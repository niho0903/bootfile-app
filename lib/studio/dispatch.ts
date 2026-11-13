import { generateApprovedPaidBrandKit } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION, type PaidBrandKit } from '../brand-kit/synthesis';
import { StudioError } from './errors';
import { generateStudioBundle } from './generation';
import { assertModelCallAllowed, meteredUsage, studioModelBudget, worstCaseCallCostMicroUsd } from './model-budget';
import { STUDIO_PRODUCT, type StudioBundle, type StudioOrderRow } from './types';

export interface StudioDispatchResult {
  output: StudioBundle | PaidBrandKit;
  usage: { model: string; input_tokens: number | null; output_tokens: number | null; cost_microusd?: number; cost_basis?: 'reported' | 'worst_case' };
}

type DispatchOrder = Pick<StudioOrderRow, 'product_version' | 'intake' | 'generation_attempts'>;

/** Brand Kit modules signal failures with plain error codes; the worker journals StudioError codes. */
function brandError(error: unknown): unknown {
  if (error instanceof StudioError || !(error instanceof Error) || !/^brand_[a-z_]+$/.test(error.message)) return error;
  return new StudioError(error.message, 'The Brand & AI Kit could not be generated on this attempt.');
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
    const budget = studioModelBudget(order.product_version);
    // The claim that produced this order already counted this attempt. Earlier attempts do not
    // yet persist their usage, so each one is charged at the worst case rather than as zero.
    const priorCalls = Math.max(order.generation_attempts - 1, 0);
    try {
      const generated = await generateApprovedPaidBrandKit(order.intake, fetcher, call => assertModelCallAllowed({
        budget, model: call.model, requestBytes: call.requestBytes, maxOutputTokens: call.maxOutputTokens,
        spent: { calls: priorCalls, costMicroUsd: priorCalls * worstCaseCallCostMicroUsd(call.model, budget) },
      }));
      return { output: generated.kit, usage: meteredUsage(generated.usage, budget) };
    } catch (error) { throw brandError(error); }
  }
  throw new StudioError('product_version_unsupported', 'This order was created for a product version this worker cannot fulfill.');
}
