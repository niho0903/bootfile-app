import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCronAuthorized, isGrowthAgentAuthorized } from './auth';
import { buildOperationsMetrics, getOperationsSnapshot } from './health';
import { readGrowthBody, validateGrowthDraft } from './growth';

afterEach(() => { vi.unstubAllEnvs(); });

describe('operations access boundary', () => {
  it('denies a missing cron secret even when the caller sends Bearer undefined', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(isCronAuthorized(new Request('https://bootfile.ai/api/operations/run', { headers: { authorization: 'Bearer undefined' } }))).toBe(false);
  });

  it('accepts only the exact configured bearer credential', () => {
    vi.stubEnv('CRON_SECRET', 'test-only-secret');
    const request = (authorization: string) => new Request('https://bootfile.ai/api/operations/run', { headers: { authorization } });
    expect(isCronAuthorized(request('test-only-secret'))).toBe(false);
    expect(isCronAuthorized(request('Bearer wrong-secret'))).toBe(false);
    expect(isCronAuthorized(request('Bearer test-only-secret'))).toBe(true);
  });

  it('does not accept the scheduler credential as draft-ingress authority', () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-key');
    vi.stubEnv('GROWTH_AGENT_SECRET', 'test-draft-key');
    const request = new Request('https://bootfile.ai/api/operations/drafts', { headers: { authorization: 'Bearer test-cron-key' } });
    expect(isGrowthAgentAuthorized(request)).toBe(false);
  });
});

describe('growth draft authority', () => {
  it('stops an oversized chunked upload without reading the rest', async () => {
    let reads = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { reads++; controller.enqueue(new Uint8Array(30_001)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    expect(await readGrowthBody(stream)).toEqual({ error: 'Draft payload too large', status: 413 });
    expect(reads).toBe(2);
    expect(cancelled).toBe(true);
  });

  it('rejects nested metadata and source schemes that could become unsafe publication inputs', () => {
    const base = { productVersion: 'studio-marketing-v1', channel: 'blog', jobKey: 'blog:2026-10-20', content: 'A useful tutorial draft with enough text for validation.' };
    expect(validateGrowthDraft({ ...base, metadata: { title: { html: '<script>' } } })).toHaveProperty('error');
    expect(validateGrowthDraft({ ...base, metadata: { sourceUrls: ['javascript:alert(1)'] } })).toHaveProperty('error');
  });

  it('forces pending-review metadata and flags a legacy offer instead of trusting agent approval', () => {
    const draft = validateGrowthDraft({
      productVersion: 'studio-marketing-v1', channel: 'blog', jobKey: 'blog:2026-10-20',
      content: 'A legacy draft claims the price is $4.99 and links https://bootfile.ai/quiz as its product entry.',
      metadata: { title: 'Test', reviewRequired: false, publicationAuthority: 'approved', status: 'approved' },
    });
    expect('error' in draft).toBe(false);
    if ('error' in draft) return;
    expect(draft.metadata.reviewRequired).toBe(true);
    expect(draft.metadata.publicationAuthority).toBe('draft-only');
    expect(draft.metadata.status).toBeUndefined();
    expect(draft.metadata.policyFlags).toEqual(['legacy_quiz_link', 'legacy_price']);
  });
});

describe('operations measurement honesty', () => {
  it('keeps missing metrics unavailable and distinguishes them from observed zero', () => {
    const missing = buildOperationsMetrics(null);
    expect(missing.every(metric => metric.value === null)).toBe(true);
    const zero = buildOperationsMetrics({ paid_orders: 0, gross_paid_cents: 0 });
    expect(zero.find(metric => metric.id === 'paid_orders')?.value).toBe(0);
    expect(zero.find(metric => metric.id === 'ready_orders')?.value).toBeNull();
    expect(zero.find(metric => metric.id === 'first_task_use')?.value).toBeNull();
  });

  it('does not turn a missing schema into zero purchases or a verified scheduler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { code: '42P01' } }),
    };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } }),
      from: vi.fn().mockReturnValue(builder),
    } as unknown as SupabaseClient;
    const result = await getOperationsSnapshot(client, new Date('2026-10-20T12:00:00.000Z'));
    expect(result.metrics.every(metric => metric.value === null)).toBe(true);
    expect(result.health.find(check => check.id === 'database')?.status).toBe('unavailable');
    expect(result.runs.available).toBe(false);
    expect(result.runtime.lastCronInvocation).toBeNull();
    expect(result.runtime.scheduleEvidence).toContain('cannot be verified');
  });
});
