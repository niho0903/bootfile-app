import { describe, expect, it } from 'vitest';
import { STUDIO_ALLOWED_MODELS, STUDIO_MAX_ATTEMPTS, STUDIO_MAX_OUTPUT_TOKENS } from './config';
import { StudioError } from './errors';
import {
  assertModelCallAllowed, meteredUsage, modelCallCostMicroUsd, STUDIO_MODEL_BUDGETS, STUDIO_MODEL_PRICING,
  studioModelBudget, worstCaseCallCostMicroUsd,
} from './model-budget';

const budget = STUDIO_MODEL_BUDGETS['brand-foundation-paid-v1'];
const code = (run: () => unknown) => { try { run(); } catch (error) { return error instanceof StudioError ? error.code : 'not_a_studio_error'; } return 'no_error'; };
const call = (overrides: Partial<Parameters<typeof assertModelCallAllowed>[0]> = {}) => ({
  budget, model: 'claude-haiku-4-5-20251001', requestBytes: 6_000, maxOutputTokens: STUDIO_MAX_OUTPUT_TOKENS, spent: { calls: 0, costMicroUsd: 0 }, ...overrides,
});

describe('per-order model budget', () => {
  it('prices a call from published per-token rates and rounds up', () => {
    expect(modelCallCostMicroUsd('claude-haiku-4-5-20251001', 1_000, 1_000)).toBe(6_000);
    expect(modelCallCostMicroUsd('claude-sonnet-4-6', 3_000, 1_500)).toBe(31_500);
    expect(modelCallCostMicroUsd('claude-haiku-4-5-20251001', 1, 0)).toBe(1);
  });

  it('bounds the worst case per call and per order for every allowed model', () => {
    expect(worstCaseCallCostMicroUsd('claude-haiku-4-5-20251001', budget)).toBe(37_000);
    expect(worstCaseCallCostMicroUsd('claude-sonnet-4-6', budget)).toBe(111_000);
    for (const model of STUDIO_ALLOWED_MODELS) {
      // Every allowed model must be priced, and all permitted attempts must fit under the ceiling.
      expect(Object.hasOwn(STUDIO_MODEL_PRICING, model)).toBe(true);
      expect(budget.maxCalls * worstCaseCallCostMicroUsd(model, budget)).toBeLessThanOrEqual(budget.maxCostMicroUsd);
    }
    expect(budget.maxCostMicroUsd).toBe(350_000);
  });

  it('stays aligned with the durable attempt limit and the output cap the worker actually uses', () => {
    expect(budget.maxCalls).toBe(STUDIO_MAX_ATTEMPTS);
    expect(STUDIO_MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(budget.maxOutputTokensPerCall);
  });

  it('refuses unpriced models and unbudgeted product versions instead of assuming a cost', () => {
    expect(code(() => modelCallCostMicroUsd('claude-unlisted', 1, 1))).toBe('model_price_unknown');
    expect(code(() => assertModelCallAllowed(call({ model: 'claude-unlisted' })))).toBe('model_price_unknown');
    expect(code(() => studioModelBudget('marketing-setup-v1'))).toBe('model_budget_undefined');
    expect(code(() => studioModelBudget('toString'))).toBe('model_budget_undefined');
    expect(code(() => modelCallCostMicroUsd('claude-sonnet-4-6', -1, 1))).toBe('model_usage_invalid');
  });

  it('allows a call inside every ceiling and refuses the one that could breach any of them', () => {
    expect(code(() => assertModelCallAllowed(call()))).toBe('no_error');
    expect(code(() => assertModelCallAllowed(call({ spent: { calls: 2, costMicroUsd: 222_000 }, model: 'claude-sonnet-4-6' })))).toBe('no_error');
    expect(code(() => assertModelCallAllowed(call({ requestBytes: budget.maxRequestBytes + 1 })))).toBe('model_request_too_large');
    expect(code(() => assertModelCallAllowed(call({ maxOutputTokens: budget.maxOutputTokensPerCall + 1 })))).toBe('model_budget_exceeded');
    expect(code(() => assertModelCallAllowed(call({ spent: { calls: 3, costMicroUsd: 0 } })))).toBe('model_budget_exhausted');
    expect(code(() => assertModelCallAllowed(call({ spent: { calls: 1, costMicroUsd: 320_000 } })))).toBe('model_budget_exhausted');
    expect(code(() => assertModelCallAllowed(call({ spent: { calls: 0, costMicroUsd: Number.NaN } })))).toBe('model_budget_exhausted');
  });

  it('never records a missing token count as zero cost', () => {
    expect(meteredUsage({ model: 'claude-haiku-4-5-20251001', input_tokens: 2_400, output_tokens: 1_300 }, budget))
      .toEqual({ model: 'claude-haiku-4-5-20251001', input_tokens: 2_400, output_tokens: 1_300, cost_microusd: 8_900, cost_basis: 'reported' });
    expect(meteredUsage({ model: 'claude-sonnet-4-6', input_tokens: null, output_tokens: 900 }, budget))
      .toMatchObject({ cost_microusd: 111_000, cost_basis: 'worst_case' });
  });
});
