import { StudioError } from './errors';

/**
 * Per-order model ceilings for paid synthesis: calls, tokens and cost.
 *
 * This module only does arithmetic and refuses. It cannot raise a limit, call a
 * provider, or change which models are allowed. Every number here is a customer
 * cost commitment; changing one is an owner decision, not a routine edit.
 */

/** Published list prices in micro-USD per million tokens. $1 per MTok is 1_000_000. */
export const STUDIO_MODEL_PRICING_AS_OF = '2026-11-13';
export const STUDIO_MODEL_PRICING: Readonly<Record<string, { input: number; output: number }>> = {
  'claude-haiku-4-5-20251001': { input: 1_000_000, output: 5_000_000 },
  'claude-sonnet-4-6': { input: 3_000_000, output: 15_000_000 },
};

/** Tokens the provider adds that are not in the request body: message framing and the tool-use system prompt. */
export const STUDIO_PROVIDER_OVERHEAD_TOKENS = 1_000;

export interface StudioModelBudget {
  /** Provider calls allowed for one paid order across every durable attempt. */
  maxCalls: number;
  /** Largest request body in UTF-8 bytes. A token is never shorter than one byte, so this bounds input tokens. */
  maxRequestBytes: number;
  maxOutputTokensPerCall: number;
  /** Hard ceiling for one order, all attempts, in micro-USD. */
  maxCostMicroUsd: number;
}

/**
 * Only versions listed here may reach a provider through the budgeted path.
 * marketing-setup-v1 keeps its original, separately tested bounds and is not reinterpreted.
 */
export const STUDIO_MODEL_BUDGETS: Readonly<Record<string, StudioModelBudget>> = {
  'brand-foundation-paid-v1': { maxCalls: 3, maxRequestBytes: 16_000, maxOutputTokensPerCall: 4_000, maxCostMicroUsd: 350_000 },
};

/**
 * The one revision a paid order may use: how many further provider calls, and the ceiling for the
 * whole order once it is used. An order that never uses its revision keeps its original ceiling.
 * Approved by the owner on 2026-11-13; see docs/DECISION_LOG.md.
 */
export interface StudioRevisionAllowance { maxCalls: number; orderMaxCostMicroUsd: number }
export const STUDIO_REVISION_ALLOWANCES: Readonly<Record<string, StudioRevisionAllowance>> = {
  'brand-foundation-paid-v1': { maxCalls: 2, orderMaxCostMicroUsd: 600_000 },
};

export interface StudioModelSpend { calls: number; costMicroUsd: number }

export interface StudioMeteredUsage {
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_microusd: number;
  /** "reported" uses provider token counts. "worst_case" means a count was missing, so the ceiling was charged. */
  cost_basis: 'reported' | 'worst_case';
}

const refusal = 'The setup service could not start this generation attempt.';

export function studioModelBudget(productVersion: string): StudioModelBudget {
  const budget = Object.hasOwn(STUDIO_MODEL_BUDGETS, productVersion) ? STUDIO_MODEL_BUDGETS[productVersion] : null;
  if (!budget) throw new StudioError('model_budget_undefined', refusal);
  return budget;
}

export function studioRevisionAllowance(productVersion: string): StudioRevisionAllowance {
  const allowance = Object.hasOwn(STUDIO_REVISION_ALLOWANCES, productVersion) ? STUDIO_REVISION_ALLOWANCES[productVersion] : null;
  if (!allowance) throw new StudioError('revision_allowance_undefined', refusal);
  return allowance;
}

function price(model: string): { input: number; output: number } {
  const entry = Object.hasOwn(STUDIO_MODEL_PRICING, model) ? STUDIO_MODEL_PRICING[model] : null;
  // An unpriced model cannot be costed, so it cannot be bounded. Refuse rather than assume.
  if (!entry) throw new StudioError('model_price_unknown', refusal);
  return entry;
}

export function modelCallCostMicroUsd(model: string, inputTokens: number, outputTokens: number): number {
  if (!Number.isInteger(inputTokens) || !Number.isInteger(outputTokens) || inputTokens < 0 || outputTokens < 0) {
    throw new StudioError('model_usage_invalid', refusal);
  }
  const { input, output } = price(model);
  return Math.ceil((inputTokens * input + outputTokens * output) / 1_000_000);
}

/** The most one call can cost under this budget, whatever the provider returns. */
export function worstCaseCallCostMicroUsd(model: string, budget: StudioModelBudget): number {
  return modelCallCostMicroUsd(model, budget.maxRequestBytes + STUDIO_PROVIDER_OVERHEAD_TOKENS, budget.maxOutputTokensPerCall);
}

/** Throws before any provider spend when the next call could breach a ceiling. */
export function assertModelCallAllowed(call: {
  budget: StudioModelBudget; model: string; requestBytes: number; maxOutputTokens: number; spent: StudioModelSpend;
}): void {
  const { budget, model, requestBytes, maxOutputTokens, spent } = call;
  const worstCase = worstCaseCallCostMicroUsd(model, budget);
  if (!Number.isInteger(requestBytes) || requestBytes < 1 || requestBytes > budget.maxRequestBytes) throw new StudioError('model_request_too_large', refusal);
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > budget.maxOutputTokensPerCall) throw new StudioError('model_budget_exceeded', refusal);
  if (!Number.isInteger(spent.calls) || spent.calls < 0 || !Number.isFinite(spent.costMicroUsd) || spent.costMicroUsd < 0
    || spent.calls >= budget.maxCalls || spent.costMicroUsd + worstCase > budget.maxCostMicroUsd) {
    throw new StudioError('model_budget_exhausted', refusal);
  }
}

/** A missing token count is never recorded as zero cost. */
export function meteredUsage(usage: { model: string; input_tokens: number | null; output_tokens: number | null }, budget: StudioModelBudget): StudioMeteredUsage {
  const reported = usage.input_tokens !== null && usage.output_tokens !== null;
  return {
    ...usage,
    cost_microusd: reported
      ? modelCallCostMicroUsd(usage.model, usage.input_tokens as number, usage.output_tokens as number)
      : worstCaseCallCostMicroUsd(usage.model, budget),
    cost_basis: reported ? 'reported' : 'worst_case',
  };
}
