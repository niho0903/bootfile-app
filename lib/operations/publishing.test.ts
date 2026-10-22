import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGrowthPublisherAuthorized } from './auth';
import { buildPublicationArticle, normalizeEditorialReview, PUBLICATION_POLICY_VERSION, REVIEW_CHECKS, STUDIO_SOURCE_URL } from './publishing-policy';

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: mocks.client }));
import { runOwnedBlogPublishing } from './publishing';

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
const sourceHash = 'a'.repeat(64);
const metadata = { source: 'growth-agent', productVersion: 'studio-marketing-v1', kind: 'article', policyFlags: [], jobKey: 'blog:2026-10-20',
  slug: 'synthetic-tutorial', title: 'Synthetic tutorial', description: 'A fictional example for a synthetic service.', targetKeyword: 'synthetic', pillar: 'task-guide', sourceUrls: [STUDIO_SOURCE_URL] };
const body = `# A fictional example\n\n${'Use the supplied business facts and check the offer before sending any message. '.repeat(45)}\n\n[Bootfile Marketing Setup](${STUDIO_SOURCE_URL})`;
const checks = Object.fromEntries(REVIEW_CHECKS.map(key => [key, true]));
const approval = { approved: true, sourceHash, policyVersion: PUBLICATION_POLICY_VERSION, checks, reasons: [] };

describe('owned-blog publication boundary', () => {
  it('does not grant publication authority to a draft or cron credential', () => {
    vi.stubEnv('GROWTH_PUBLISHER_SECRET', 'test-publisher');
    vi.stubEnv('GROWTH_AGENT_SECRET', 'test-author');
    for (const token of ['test-author', 'test-cron', 'undefined']) expect(isGrowthPublisherAuthorized(new Request('https://bootfile.ai/api/operations/publish', { headers: { Authorization: `Bearer ${token}` } }))).toBe(false);
  });

  it('rejects executable HTML, images and links outside the owned source before public rendering', () => {
    expect(buildPublicationArticle(body, metadata).slug).toBe('synthetic-tutorial-20261020');
    for (const extra of ['<img src=x onerror=alert(1)>', '[bad](javascript:alert%281%29)', '![image](https://bootfile.ai/studio)', '[other](https://example.com)']) {
      expect(() => buildPublicationArticle(`${body}\n\n${extra}`, metadata)).toThrow('draft_policy_rejected');
    }
  });

  it('rejects a changed review hash and cannot approve when any mandatory check fails', () => {
    expect(() => normalizeEditorialReview({ ...approval, sourceHash: 'b'.repeat(64) }, sourceHash)).toThrow('review_provider_failed');
    expect(normalizeEditorialReview({ ...approval, checks: { ...checks, sourcesSupportClaims: false } }, sourceHash).approved).toBe(false);
  });

  it('does no storage, model or publication work while disabled', async () => {
    vi.stubEnv('GROWTH_REVIEW_ENABLED', 'false'); vi.stubEnv('GROWTH_PUBLICATION_ENABLED', 'false');
    const fetcher = vi.fn();
    expect(await runOwnedBlogPublishing(fetcher)).toEqual({ status: 'disabled' });
    expect(mocks.client).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });

  it('makes no paid model call after the durable weekly review cap is reached', async () => {
    vi.stubEnv('GROWTH_REVIEW_ENABLED', 'true'); vi.stubEnv('GROWTH_PUBLICATION_ENABLED', 'false'); vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const rpc = vi.fn().mockResolvedValue({ data: { status: 'skipped', reason: 'weekly_review_cap' }, error: null });
    mocks.client.mockReturnValue({ rpc });
    const fetcher = vi.fn();
    expect(await runOwnedBlogPublishing(fetcher)).toEqual({ status: 'skipped', reason: 'weekly_review_cap' });
    expect(fetcher).not.toHaveBeenCalled(); expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('never publishes if exact review persistence is refused after a source change', async () => {
    vi.stubEnv('GROWTH_REVIEW_ENABLED', 'true'); vi.stubEnv('GROWTH_PUBLICATION_ENABLED', 'true'); vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const rpc = vi.fn(async (name: string) => name === 'claim_growth_review'
      ? { data: { status: 'claimed', id: 'synthetic-id', leaseToken: 'synthetic-lease', sourceHash, content: body, metadata }, error: null }
      : { data: false, error: null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mocks.client.mockReturnValue({ rpc, from: vi.fn(() => query) });
    const fetcher = vi.fn(async (url: unknown) => String(url) === STUDIO_SOURCE_URL
      ? new Response('<html><body>Bootfile Marketing Setup $49 once. A customer email and three social posts.</body></html>', { headers: { 'content-type': 'text/html' } })
      : new Response(JSON.stringify({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'editorial_review', input: approval }] })));
    expect(await runOwnedBlogPublishing(fetcher as typeof fetch)).toMatchObject({ status: 'failed', reason: 'review_result_not_persisted' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.some(([name]) => name === 'publish_growth_article')).toBe(false);
  });
});
