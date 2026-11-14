import { describe, expect, it, vi } from 'vitest';
import { StudioGenerationError } from './dispatch';
import { runStudioWorker, type StudioWorkerDependencies } from './worker';
import { STUDIO_DEMO_BUNDLE } from './demo';
import { StudioError } from './errors';
import { paidBrandKitFixture } from '../brand-kit/test-fixtures';
import { readyStudioOrderFixture, studioDeliveryFixture, studioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioRevisionRow } from './types';

function harness({ generationFails = false, receiptFailsOnce = false, concurrent = false } = {}) {
  const history: string[] = [];
  let claimed = false;
  let saved = false;
  let emailClaimed = false;
  let receiptFailurePending = receiptFailsOnce;
  const generate = vi.fn(async () => {
    history.push('generate');
    if (concurrent) await new Promise(resolve => setTimeout(resolve, 1));
    if (generationFails) throw new StudioError('model_provider_error', 'Provider failed');
    return { output: STUDIO_DEMO_BUNDLE, usage: { model: 'test', input_tokens: 1, output_tokens: 1 } };
  });
  const deliver = vi.fn(async () => { history.push('send'); return 'email_receipt'; });
  const dependencies: StudioWorkerDependencies = {
    assertConfigured: () => {}, generate, deliver,
    getOrder: async () => saved ? readyStudioOrderFixture() : studioOrderFixture(),
    rpc: async <T>(name: string): Promise<T> => {
      if (name === 'studio_claim_order') {
        if (claimed) return [] as T;
        claimed = true; history.push('claim'); return [studioOrderFixture()] as T;
      }
      if (name === 'studio_finish_generation') { saved = true; history.push('persist_output'); return true as T; }
      if (name === 'studio_fail_generation') { history.push('retry_generation'); return 'queued' as T; }
      if (name === 'studio_claim_delivery') {
        if (!saved || emailClaimed) return [] as T;
        emailClaimed = true; history.push('claim_email'); return [studioDeliveryFixture()] as T;
      }
      if (name === 'studio_finish_delivery') {
        if (receiptFailurePending) { receiptFailurePending = false; throw new StudioError('database_unavailable', 'Receipt write interrupted'); }
        history.push('persist_receipt'); return true as T;
      }
      if (name === 'studio_fail_delivery') { emailClaimed = false; history.push('retry_email'); return 'pending' as T; }
      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
  return { history, dependencies, generate, deliver };
}

describe('studio durable worker orchestration', () => {
  it('persists the package before email and confirms the receipt before reporting a send', async () => {
    const h = harness();
    const result = await runStudioWorker({ limit: 1 }, h.dependencies);
    expect(h.history).toEqual(['claim', 'generate', 'persist_output', 'claim_email', 'send', 'persist_receipt']);
    expect(result.completed).toBe(1);
    expect(result.deliveriesSent).toBe(1);
  });

  it('leaves a provider failure recoverable without any email attempt', async () => {
    const h = harness({ generationFails: true });
    const result = await runStudioWorker({ limit: 1 }, h.dependencies);
    expect(h.history).toEqual(['claim', 'generate', 'retry_generation']);
    expect(result.retried).toBe(1);
    expect(h.deliver).not.toHaveBeenCalled();
  });

  it('uses the atomic claim boundary so concurrent invocations never generate the same claimed order', async () => {
    const h = harness({ concurrent: true });
    await Promise.all([runStudioWorker({ limit: 1 }, h.dependencies), runStudioWorker({ limit: 1 }, h.dependencies)]);
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it('recovers an ambiguous email receipt without regenerating the already saved package', async () => {
    const h = harness({ receiptFailsOnce: true });
    const first = await runStudioWorker({ limit: 1 }, h.dependencies);
    expect(first.completed).toBe(1);
    expect(first.deliveriesSent).toBe(0);
    const second = await runStudioWorker({ limit: 1 }, h.dependencies);
    expect(second.deliveriesSent).toBe(1);
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(h.deliver).toHaveBeenCalledTimes(2);
  });

  it('does not claim or call a provider when fulfillment configuration is disabled', async () => {
    const h = harness();
    h.dependencies.assertConfigured = () => { throw new StudioError('fulfillment_paused', 'Paused'); };
    const result = await runStudioWorker({ limit: 1 }, h.dependencies);
    expect(result.errors).toEqual(['fulfillment_paused']);
    expect(h.history).toEqual([]);
  });

  it('records the usage of a failed attempt that reached the provider with its failure', async () => {
    const calls: { name: string; args: Record<string, unknown> }[] = [];
    const usage = { model: 'claude-haiku-4-5-20251001', input_tokens: null, output_tokens: null, cost_microusd: 37_000, cost_basis: 'worst_case' as const };
    const dependencies: StudioWorkerDependencies = {
      assertConfigured: () => {}, deliver: vi.fn(async () => 'unused'), getOrder: async () => studioOrderFixture(),
      generate: vi.fn(async () => { throw new StudioGenerationError('provider_timeout', 'Timed out', usage); }),
      rpc: async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
        calls.push({ name, args });
        if (name === 'studio_claim_order') return (calls.filter(call => call.name === name).length === 1 ? [studioOrderFixture()] : []) as T;
        if (name === 'studio_fail_metered_generation') return 'queued' as T;
        if (name === 'studio_claim_delivery') return [] as T;
        throw new Error(`Unexpected RPC: ${name}`);
      },
    };
    const result = await runStudioWorker({ limit: 1 }, dependencies);
    expect(result).toMatchObject({ claimed: 1, completed: 0, retried: 1 });
    expect(calls.find(call => call.name === 'studio_fail_metered_generation')?.args).toMatchObject({ p_error_code: 'provider_timeout', p_usage: usage });
    expect(calls.some(call => call.name === 'studio_fail_generation')).toBe(false);
  });
});

describe('the one revision, in the same durable worker', () => {
  const revision = { order_id: STUDIO_TEST_ORDER_ID, status: 'generating', attempts: 1, call_limit: 2, calls_recorded: 0, order_cost_limit_microusd: 600_000 } as StudioRevisionRow;
  const usage = { model: 'claude-haiku-4-5-20251001', input_tokens: 2400, output_tokens: 1300, cost_microusd: 8_900, cost_basis: 'reported' as const };

  function revisionHarness({ enabled = true, fails = 'no' as 'no' | 'after_provider' | 'before_provider', orderGone = false, commitLost = false, failStatus = 'queued' } = {}) {
    const history: string[] = [];
    const calls: Record<string, unknown>[] = [];
    let claimed = false;
    const generateRevision = vi.fn(async () => {
      history.push('generate_revision');
      if (fails === 'after_provider') throw new StudioGenerationError('brand_output_incomplete', 'Unusable draft', usage);
      if (fails === 'before_provider') throw new StudioError('model_budget_exhausted', 'Refused before spend');
      return { output: paidBrandKitFixture(), usage };
    });
    const dependencies: StudioWorkerDependencies = {
      assertConfigured: () => {}, generate: vi.fn(), deliver: vi.fn(), generateRevision, revisionsEnabled: () => enabled,
      getOrder: async () => orderGone ? null : readyStudioOrderFixture(),
      rpc: async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
        if (name === 'studio_claim_order' || name === 'studio_claim_delivery') return [] as T;
        calls.push({ name, ...args });
        if (name === 'studio_claim_revision') { if (claimed) return [] as T; claimed = true; history.push('claim_revision'); return [revision] as T; }
        if (name === 'studio_finish_revision') { history.push('persist_revision'); return !commitLost as T; }
        if (name === 'studio_fail_revision') { history.push('fail_revision'); return failStatus as T; }
        throw new Error(`Unexpected RPC: ${name}`);
      },
    };
    return { history, calls, dependencies, generateRevision };
  }

  it('claims no revision while the allowance is closed, and reports nothing about revisions', async () => {
    const h = revisionHarness({ enabled: false });
    const result = await runStudioWorker({ limit: 2 }, h.dependencies);
    expect(h.calls).toEqual([]);
    expect(result).not.toHaveProperty('revisions');
    expect(h.generateRevision).not.toHaveBeenCalled();
  });

  it('claims one, generates it, and saves it under the same lease with its usage', async () => {
    const h = revisionHarness();
    const result = await runStudioWorker({ limit: 3 }, h.dependencies);
    expect(h.history).toEqual(['claim_revision', 'generate_revision', 'persist_revision']);
    expect(result.revisions).toEqual({ claimed: 1, completed: 1, retried: 0, needsAttention: 0 });
    expect(result.errors).toEqual([]);
    const [claim, finish] = h.calls;
    expect(finish).toMatchObject({ name: 'studio_finish_revision', p_order_id: STUDIO_TEST_ORDER_ID, p_lease_token: claim.p_lease_token, p_usage: usage });
    expect(result.completed).toBe(0);
    expect(result.deliveriesSent).toBe(0);
  });

  it('records a failure with its usage only when the provider was reached', async () => {
    const reached = revisionHarness({ fails: 'after_provider' });
    const first = await runStudioWorker({ limit: 1 }, reached.dependencies);
    expect(reached.history).toEqual(['claim_revision', 'generate_revision', 'fail_revision']);
    expect(reached.calls[1]).toMatchObject({ name: 'studio_fail_revision', p_error_code: 'brand_output_incomplete', p_usage: usage });
    expect(first.revisions).toEqual({ claimed: 1, completed: 0, retried: 1, needsAttention: 0 });
    expect(first.errors).toEqual([`${STUDIO_TEST_ORDER_ID}:revision:brand_output_incomplete`]);
    const refused = revisionHarness({ fails: 'before_provider', failStatus: 'needs_attention' });
    const second = await runStudioWorker({ limit: 1 }, refused.dependencies);
    expect(refused.calls[1]).toMatchObject({ name: 'studio_fail_revision', p_error_code: 'model_budget_exhausted', p_usage: null });
    expect(second.revisions).toEqual({ claimed: 1, completed: 0, retried: 0, needsAttention: 1 });
  });

  it('never reports a save it did not make, and never generates for an order that is gone or refunded', async () => {
    const lost = revisionHarness({ commitLost: true });
    const first = await runStudioWorker({ limit: 1 }, lost.dependencies);
    expect(lost.history).toEqual(['claim_revision', 'generate_revision', 'persist_revision', 'fail_revision']);
    expect(first.revisions?.completed).toBe(0);
    expect(first.errors).toEqual([`${STUDIO_TEST_ORDER_ID}:revision:revision_lease_lost`]);
    const gone = revisionHarness({ orderGone: true });
    const second = await runStudioWorker({ limit: 1 }, gone.dependencies);
    expect(gone.generateRevision).not.toHaveBeenCalled();
    expect(second.errors).toEqual([`${STUDIO_TEST_ORDER_ID}:revision:revision_order_not_ready`]);
  });
});
