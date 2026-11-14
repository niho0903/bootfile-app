import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GET as download } from '@/app/api/studio/orders/[id]/download/route';
import { GET as draftRoute, POST as requestRoute } from '@/app/api/studio/orders/[id]/revision/route';
import { FICTIONAL_BRAND_INPUT, type BrandInput } from '../brand-kit/kit';
import { brandBackbriefSnapshot, persistedPaidBrandIntake } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION } from '../brand-kit/synthesis';
import { paidBrandKitFixture } from '../brand-kit/test-fixtures';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { studioOrderView } from './db';
import { StudioGenerationError } from './dispatch';
import { StudioError } from './errors';
import { STUDIO_MODEL_BUDGETS, STUDIO_REVISION_ALLOWANCES, studioRevisionAllowance, worstCaseCallCostMicroUsd } from './model-budget';
import { currentBrandKit, revisionView, revisionWindowEnd } from './revision-state';
import { generateRevisionForOrder, requestStudioRevision, studioRevisionDraft } from './revisions';
import { readyStudioOrderFixture, studioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioIntake, StudioOrderRow, StudioRevisionRow } from './types';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('next/server', async importOriginal => ({ ...(await importOriginal<typeof import('next/server')>()), after: vi.fn() }));

const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const cta = FICTIONAL_BRAND_INPUT.callToAction;
const answers = (changes: Partial<BrandInput> = {}): BrandInput => ({ ...structuredClone(FICTIONAL_BRAND_INPUT), ...changes });
const changed = () => answers({ voiceNotes: 'Warm, practical and direct. A home need not look like a showroom.' });
const approved = (brand: BrandInput) => ({ productVersion: PAID_BRAND_KIT_VERSION, brand, email: 'customer@example.com', acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(brand) });
const body = (brand: BrandInput, extra: Record<string, unknown> = {}) => ({ brand, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(brand), ...extra });
const firstKit = paidBrandKitFixture();
const REVISED = 'Juniper Home Organizing, revised, helps busy households make their kitchens easier to use.';
const revisedKit = () => { const kit = paidBrandKitFixture(); kit.synthesis.positioning = REVISED; return kit; };

let token: string;
let tables: Record<string, unknown>;
let rpc: ReturnType<typeof vi.fn>;
let rpcError: string | null;
const brandOrder = (overrides: Partial<StudioOrderRow> = {}) => studioOrderFixture({
  product_version: PAID_BRAND_KIT_VERSION, status: 'ready', output: paidBrandKitFixture(), ready_at: '2026-10-20T12:01:00.000Z',
  intake: persistedPaidBrandIntake(approved(answers())) as unknown as StudioIntake, access_token_hash: hashStudioAccessToken(token),
  generation_attempts: 1, model_call_limit: 3, model_cost_limit_microusd: 350_000, model_calls: 1, model_input_tokens: 2400, model_output_tokens: 1300,
  model_cost_microusd: 8_900, model_cost_estimated: false, revision_requested_at: null, ...overrides,
});
const revisionRow = (overrides: Partial<StudioRevisionRow> = {}): StudioRevisionRow => ({
  order_id: STUDIO_TEST_ORDER_ID, created_at: '2026-10-22T09:00:00.000Z', updated_at: '2026-10-22T09:00:00.000Z',
  intake: persistedPaidBrandIntake(approved(changed())), intake_hash: 'c'.repeat(64), status: 'queued', attempts: 0, call_limit: 2,
  order_cost_limit_microusd: 600_000, calls_recorded: 0, lease_token: null, lease_expires_at: null, next_attempt_at: '2026-10-22T09:00:00.000Z',
  last_error_code: null, output: null, ready_at: null, ...overrides,
});
const failure = async (run: Promise<unknown>) => { try { await run; } catch (error) { return error instanceof StudioError ? error.code : `plain:${String(error)}`; } return 'no_error'; };
const provider = (status = 200, usage: unknown = { input_tokens: 2400, output_tokens: 1300 }) => vi.fn(async () => new Response(JSON.stringify({
  stop_reason: 'tool_use', usage, content: [{ type: 'tool_use', name: 'deliver_brand_kit', input: {
    positioning: 'Juniper Home Organizing helps busy households make their kitchens easier to use.',
    voiceDo: ['Use warm, practical language.', 'Explain the next step clearly.'], voiceAvoid: ['Avoid guilt and invented promises.'],
    email: { subject: 'A practical kitchen reset with Juniper', preview: 'A calmer way to organize your everyday kitchen.',
      body: `Hello,\n\nJuniper Home Organizing helps busy households sort everyday kitchen spaces using the storage they already own. A practical kitchen reset covers sorting kitchen items and arranging essentials. We can discuss pricing and availability before booking.\n\n${cta}` },
    posts: [
      { body: `Start with a practical kitchen reset from Juniper Home Organizing. We use existing storage and focus on everyday kitchen routines. ${cta}` },
      { body: `For busy households who want a kitchen that is easier to use, Juniper helps sort kitchen items and arrange everyday essentials. ${cta}` },
      { body: `Want to explore a practical kitchen reset? We can discuss pricing and availability before booking. ${cta}` },
    ],
    sourceNotes: [{ field: 'businessName', quote: 'Juniper Home Organizing' }, { field: 'facts', quote: 'We use existing storage.' }],
  } }],
}), { status })) as unknown as typeof fetch;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'revision-test-secret-'.repeat(3));
  token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
  tables = { studio_orders: brandOrder(), studio_deliveries: { status: 'sent', sent_at: '2026-10-20T12:02:00.000Z' }, studio_order_revisions: null };
  rpcError = null;
  rpc = vi.fn(async (name: string) => {
    if (rpcError) return { data: null, error: { message: rpcError } };
    if (name === 'studio_order_revisions_contract') return { data: { version: 'studio-order-revisions-v1', product: PAID_BRAND_KIT_VERSION }, error: null };
    if (name === 'studio_request_revision') return { data: [revisionRow()], error: null };
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  });
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    rpc, from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tables[table] ?? null, error: null }) }) }) }),
  } as unknown as ReturnType<typeof getSupabaseAdmin>);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('the approved allowance', () => {
  it('is two further calls and sixty cents for the whole order, and the costliest model fits inside it', () => {
    expect(STUDIO_REVISION_ALLOWANCES).toEqual({ [PAID_BRAND_KIT_VERSION]: { maxCalls: 2, orderMaxCostMicroUsd: 600_000 } });
    const budget = STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION];
    const allowance = studioRevisionAllowance(PAID_BRAND_KIT_VERSION);
    const worst = worstCaseCallCostMicroUsd('claude-sonnet-4-6', budget);
    expect((budget.maxCalls + allowance.maxCalls) * worst).toBeLessThanOrEqual(allowance.orderMaxCostMicroUsd);
    expect(allowance.orderMaxCostMicroUsd).toBeGreaterThan(budget.maxCostMicroUsd);
    expect(() => studioRevisionAllowance('marketing-setup-v1')).toThrowError(StudioError);
  });
});

describe('when a revision may be offered', () => {
  const facts = (order: Partial<StudioOrderRow> = {}, more: Partial<Parameters<typeof revisionView>[0]> = {}) =>
    revisionView({ order: brandOrder(order), revision: null, deliverySentAt: '2026-10-20T12:02:00.000Z', enabled: true, now: NOW, ...more });

  it('runs seven days from the delivery email, or from the moment the kit was ready when no email was sent', () => {
    expect(revisionWindowEnd({ ready_at: '2026-10-20T12:01:00.000Z' }, '2026-10-21T08:00:00.000Z')).toBe('2026-10-28T08:00:00.000Z');
    expect(revisionWindowEnd({ ready_at: '2026-10-20T12:01:00.000Z' }, null)).toBe('2026-10-27T12:01:00.000Z');
    expect(revisionWindowEnd({ ready_at: null }, null)).toBeNull();
  });

  it('offers it only for a delivered, paid, unrefunded kit inside the window that has not used it', () => {
    expect(facts()).toEqual({ status: 'none', canRequest: true, availableUntil: '2026-10-27T12:02:00.000Z', requestedAt: null, readyAt: null });
    expect(facts({}, { enabled: false }).canRequest).toBe(false);
    expect(facts({}, { now: Date.parse('2026-10-27T12:02:00.001Z') }).canRequest).toBe(false);
    expect(facts({ refund_status: 'pending' }).canRequest).toBe(false);
    expect(facts({ payment_status: 'refunded' }).canRequest).toBe(false);
    expect(facts({ status: 'generating', output: null }).canRequest).toBe(false);
    expect(facts({ model_call_limit: null }).canRequest).toBe(false);
    expect(facts({ revision_requested_at: '2026-10-22T09:00:00.000Z' }).canRequest).toBe(false);
    expect(revisionView({ order: readyStudioOrderFixture(), revision: null, deliverySentAt: '2026-10-20T12:02:00.000Z', enabled: true, now: NOW }).canRequest).toBe(false);
    expect(facts({ revision_requested_at: '2026-10-22T09:00:00.000Z' }, { revision: revisionRow({ status: 'generating' }) }))
      .toEqual({ status: 'generating', canRequest: false, availableUntil: '2026-10-27T12:02:00.000Z', requestedAt: '2026-10-22T09:00:00.000Z', readyAt: null });
  });

  it('shows the first kit until the revised one is saved, and never reads a revision as another schema', () => {
    const order = brandOrder();
    expect(currentBrandKit(order, null)).toEqual(firstKit);
    expect(currentBrandKit(order, revisionRow({ status: 'generating' }))).toEqual(firstKit);
    expect(currentBrandKit(order, revisionRow({ status: 'needs_attention' }))).toEqual(firstKit);
    expect(currentBrandKit(order, revisionRow({ status: 'ready', output: revisedKit() })).synthesis.positioning).toBe(REVISED);
    expect(() => currentBrandKit(order, revisionRow({ status: 'ready', output: { ...revisedKit(), requiresCustomerReview: false } as never }))).toThrowError(StudioError);
  });
});

describe('asking for the revision', () => {
  it('is closed by default: nothing is read and nothing is looked up', async () => {
    expect(await failure(requestStudioRevision(brandOrder(), body(changed())))).toBe('revision_unavailable');
    expect(await failure(studioRevisionDraft(brandOrder()))).toBe('revision_unavailable');
    const response = await requestRoute(new Request('https://bootfile.ai/api/studio/orders/x/revision', { method: 'POST', body: '{}' }), { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'revision_unavailable' } });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('saves changed, approved answers with the order’s own address and the approved limits', async () => {
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    vi.stubEnv('STUDIO_MAX_GENERATIONS_PER_DAY', '7');
    const revision = await requestStudioRevision(brandOrder(), body(changed(), { email: 'someone-else@example.com', productVersion: 'marketing-setup-v1', acceptedTerms: false }));
    expect(revision.status).toBe('queued');
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['studio_order_revisions_contract', 'studio_request_revision']);
    const args = rpc.mock.calls[1][1] as Record<string, unknown>;
    const expected = persistedPaidBrandIntake(approved(changed()));
    expect(args).toEqual({
      p_order_id: STUDIO_TEST_ORDER_ID, p_intake: expected, p_intake_hash: createHash('sha256').update(JSON.stringify(expected)).digest('hex'),
      p_call_limit: 2, p_order_cost_limit_microusd: 600_000, p_daily_limit: 7,
    });
    expect((args.p_intake as { email: string }).email).toBe('customer@example.com');
  });

  it('refuses unchanged, unapproved, incomplete or oversized answers before anything is saved', async () => {
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    const order = brandOrder();
    expect(await failure(requestStudioRevision(order, body(answers())))).toBe('revision_unchanged');
    expect(await failure(requestStudioRevision(order, { ...body(changed()), approvalSnapshot: brandBackbriefSnapshot(answers()) }))).toBe('brand_backbrief_approval_required');
    expect(await failure(requestStudioRevision(order, { ...body(changed()), approvedBackbrief: false }))).toBe('brand_backbrief_approval_required');
    expect(await failure(requestStudioRevision(order, body(answers({ offer: '' }))))).toBe('brand_intake_incomplete');
    expect(await failure(requestStudioRevision(order, body(answers({ offer: 'x'.repeat(241) }))))).toBe('brand_intake_invalid');
    expect(await failure(requestStudioRevision(order, null))).toBe('brand_intake_invalid');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses another product, a tampered first approval, a missing schema, and relays the database’s refusals', async () => {
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    expect(await failure(requestStudioRevision(readyStudioOrderFixture(), body(changed())))).toBe('revision_not_available');
    const tampered = brandOrder();
    (tampered.intake as unknown as { brand: BrandInput }).brand.offer = 'An offer the customer never approved.';
    expect(await failure(requestStudioRevision(tampered, body(changed())))).toBe('revision_not_available');
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockImplementationOnce(async () => ({ data: { version: 'something-else' }, error: null }));
    expect(await failure(requestStudioRevision(brandOrder(), body(changed())))).toBe('schema_unavailable');
    expect(rpc).toHaveBeenCalledTimes(1);
    for (const [message, code] of [['studio_revision_already_used', 'revision_already_used'], ['studio_revision_not_eligible', 'revision_not_available'], ['studio_revision_unchanged', 'revision_unchanged']] as const) {
      rpc.mockImplementationOnce(async () => ({ data: { version: 'studio-order-revisions-v1', product: PAID_BRAND_KIT_VERSION }, error: null }));
      rpc.mockImplementationOnce(async () => ({ data: null, error: { message } }));
      expect(await failure(requestStudioRevision(brandOrder(), body(changed())))).toBe(code);
    }
    rpc.mockImplementationOnce(async () => ({ data: { version: 'studio-order-revisions-v1', product: PAID_BRAND_KIT_VERSION }, error: null }));
    rpc.mockImplementationOnce(async () => ({ data: null, error: { message: 'studio_temporarily_full' } }));
    const full = await requestStudioRevision(brandOrder(), body(changed())).catch(error => error as StudioError);
    expect(full).toMatchObject({ code: 'temporarily_full', status: 503 });
    expect((full as StudioError).message).toContain('has not been used');
  });

  it('hands the customer their own answers to edit only while a revision can still be requested', async () => {
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    const draft = await studioRevisionDraft(brandOrder());
    expect(draft.answers).toEqual(persistedPaidBrandIntake(approved(answers())).brand);
    expect(draft.revision).toMatchObject({ status: 'none', canRequest: true });
    expect(JSON.stringify(draft)).not.toContain('customer@example.com');
    tables.studio_order_revisions = revisionRow({ status: 'ready', output: revisedKit() });
    expect(await failure(studioRevisionDraft(brandOrder({ revision_requested_at: '2026-10-22T09:00:00.000Z' })))).toBe('revision_already_used');
    vi.setSystemTime(Date.parse('2026-10-28T00:00:00.000Z'));
    expect(await failure(studioRevisionDraft(brandOrder()))).toBe('revision_not_available');
  });

  it('serves both through the private order link and never without it', async () => {
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    const context = { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) };
    const url = `https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/revision`;
    const signed = { Authorization: `Bearer ${token}` };
    const stranger = { Authorization: `Bearer ${createStudioAccessToken('22222222-2222-4222-8222-222222222222')}` };
    expect((await draftRoute(new Request(url), context)).status).toBe(401);
    expect((await draftRoute(new Request(url, { headers: stranger }), context)).status).toBe(404);
    expect((await requestRoute(new Request(url, { method: 'POST', body: JSON.stringify(body(changed())) }), context)).status).toBe(401);
    expect((await requestRoute(new Request(url, { method: 'POST', headers: stranger, body: JSON.stringify(body(changed())) }), context)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    const draft = await draftRoute(new Request(url, { headers: signed }), context);
    expect(draft.status).toBe(200);
    expect(draft.headers.get('Cache-Control')).toContain('no-store');
    expect((await draft.json()).answers.businessName).toBe('Juniper Home Organizing');
    const saved = await requestRoute(new Request(url, { method: 'POST', headers: signed, body: JSON.stringify(body(changed())) }), context);
    expect(saved.status).toBe(202);
    expect(await saved.json()).toEqual({ revision: { status: 'queued', canRequest: false, availableUntil: null, requestedAt: '2026-10-22T09:00:00.000Z', readyAt: null } });
    expect((await requestRoute(new Request(url, { method: 'POST', headers: signed, body: 'not json' }), context)).status).toBe(400);
    expect((await requestRoute(new Request(url, { method: 'POST', headers: signed, body: 'x'.repeat(40_001) }), context)).status).toBeGreaterThanOrEqual(400);
  });
});

describe('what the customer sees and downloads', () => {
  const request = (query = '') => new NextRequest(`https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/download${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const context = { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) };

  it('leaves an order page exactly as it was while the allowance is closed and unused', async () => {
    const view = await studioOrderView(brandOrder());
    expect(view).not.toHaveProperty('revision');
    expect(view.brandKit?.synthesis.positioning).toBe(firstKit.synthesis.positioning);
    expect(await studioOrderView(readyStudioOrderFixture())).not.toHaveProperty('revision');
    vi.stubEnv('BRAND_KIT_REVISIONS_ENABLED', 'true');
    expect(await studioOrderView(readyStudioOrderFixture())).not.toHaveProperty('revision');
    expect((await studioOrderView(brandOrder())).revision).toEqual({ status: 'none', canRequest: true, availableUntil: '2026-10-27T12:02:00.000Z', requestedAt: null, readyAt: null });
    expect(await studioOrderView(brandOrder({ refund_status: 'pending' }))).not.toHaveProperty('revision');
  });

  it('keeps the first kit on the page while the revision is in progress or needs a person', async () => {
    const order = brandOrder({ revision_requested_at: '2026-10-22T09:00:00.000Z' });
    for (const status of ['queued', 'generating', 'needs_attention'] as const) {
      tables.studio_order_revisions = revisionRow({ status });
      const view = await studioOrderView(order);
      expect(view.revision).toMatchObject({ status, canRequest: false });
      expect(view.brandKit?.synthesis.positioning).toBe(firstKit.synthesis.positioning);
      expect(view.status).toBe('ready');
    }
  });

  it('shows and downloads the revised kit once it is saved, even after the allowance is closed again, and keeps the first kit available', async () => {
    const order = brandOrder({ revision_requested_at: '2026-10-22T09:00:00.000Z' });
    tables.studio_orders = order;
    tables.studio_order_revisions = revisionRow({ status: 'ready', output: revisedKit(), ready_at: '2026-10-22T09:02:00.000Z' });
    const view = await studioOrderView(order);
    expect(view.revision).toEqual({ status: 'ready', canRequest: false, availableUntil: '2026-10-27T12:02:00.000Z', requestedAt: '2026-10-22T09:00:00.000Z', readyAt: '2026-10-22T09:02:00.000Z' });
    expect(view.brandKit?.synthesis.positioning).toBe(REVISED);
    expect(JSON.stringify(view)).not.toContain(firstKit.foundation.ownerPreferences.instruction);
    const revised = await download(request('?format=json'), context);
    expect(revised.headers.get('Content-Disposition')).toContain('bootfile-brand-ai-kit.json');
    expect(JSON.parse(await revised.text()).synthesis.positioning).toBe(REVISED);
    const first = await download(request('?format=json&version=first'), context);
    expect(first.headers.get('Content-Disposition')).toContain('bootfile-brand-ai-kit-first-version.json');
    expect(JSON.parse(await first.text()).synthesis.positioning).toBe(firstKit.synthesis.positioning);
    expect(await (await download(request('?scope=private&version=first'), context)).text()).toContain(firstKit.foundation.ownerPreferences.instruction);
  });
});

describe('generating the revised kit inside the order’s ceiling', () => {
  const generate = (order: Partial<StudioOrderRow>, revision: Partial<StudioRevisionRow>, fetcher: typeof fetch) =>
    generateRevisionForOrder(brandOrder(order), revisionRow({ status: 'generating', attempts: 1, ...revision }), fetcher);

  it('uses the same request as a first kit, from the revised answers, and meters the call', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = provider();
    const result = await generate({}, {}, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.output).toMatchObject({ schemaVersion: PAID_BRAND_KIT_VERSION, requiresCustomerReview: true });
    expect(result.usage).toEqual({ model: 'claude-haiku-4-5-20251001', input_tokens: 2400, output_tokens: 1300, cost_microusd: 8_900, cost_basis: 'reported' });
    const sent = String(((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body);
    expect(sent).toContain('Warm, practical and direct.');
    expect(sent).not.toContain('customer@example.com');
    expect(new TextEncoder().encode(sent).length).toBeLessThanOrEqual(STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes);
  });

  it('allows two further calls on the costliest model after a full first run, and refuses a third before any spend', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    vi.stubEnv('STUDIO_MODEL', 'claude-sonnet-4-6');
    const fullFirstRun = { generation_attempts: 3, model_calls: 3, model_cost_microusd: 333_000 };
    await expect(generate(fullFirstRun, { attempts: 1 }, provider())).resolves.toMatchObject({ usage: { model: 'claude-sonnet-4-6' } });
    await expect(generate({ ...fullFirstRun, model_calls: 4, model_cost_microusd: 444_000 }, { attempts: 2, calls_recorded: 1 }, provider())).resolves.toBeTruthy();
    const third = provider();
    expect(await failure(generate({ ...fullFirstRun, model_calls: 5, model_cost_microusd: 555_000 }, { attempts: 3, calls_recorded: 2 }, third))).toBe('model_budget_exhausted');
    expect(third).not.toHaveBeenCalled();
  });

  it('counts against the whole order: recorded spend, and worst case for any attempt that left no record', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    vi.stubEnv('STUDIO_MODEL', 'claude-sonnet-4-6');
    // Spend above the first ceiling but with room for one worst-case call under sixty cents.
    await expect(generate({ model_cost_microusd: 480_000 }, {}, provider())).resolves.toBeTruthy();
    const noRoom = provider();
    expect(await failure(generate({ model_cost_microusd: 490_000 }, {}, noRoom))).toBe('model_budget_exhausted');
    // A first-run attempt and a revision attempt that crashed without a record are each charged 111,000.
    const crashed = provider();
    expect(await failure(generate({ generation_attempts: 2, model_calls: 1, model_cost_microusd: 300_000 }, { attempts: 2, calls_recorded: 0 }, crashed))).toBe('model_budget_exhausted');
    await expect(generate({ generation_attempts: 2, model_calls: 1, model_cost_microusd: 100_000 }, { attempts: 2, calls_recorded: 0 }, provider())).resolves.toBeTruthy();
    // Limits bound on the revision when it was requested win when they are stricter than today's allowance.
    const bound = provider();
    expect(await failure(generate({}, { attempts: 2, calls_recorded: 1, call_limit: 1 }, bound))).toBe('model_budget_exhausted');
    expect(await failure(generate({ model_cost_microusd: 100_000 }, { order_cost_limit_microusd: 150_000 }, bound))).toBe('model_budget_exhausted');
    for (const fetcher of [noRoom, crashed, bound]) expect(fetcher).not.toHaveBeenCalled();
  });

  it('meters a failed attempt that reached the provider, refuses a tampered revision and another product without a call', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const caught = async (run: Promise<unknown>) => { try { await run; } catch (error) { return error; } return null; };
    const invalid = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [], usage: { input_tokens: 2000, output_tokens: 4000 } }), { status: 200 })) as unknown as typeof fetch;
    const answered = await caught(generate({}, {}, invalid));
    expect(answered).toBeInstanceOf(StudioGenerationError);
    expect(answered).toMatchObject({ code: 'brand_output_incomplete', usage: { cost_microusd: 22_000, cost_basis: 'reported' } });
    expect(await caught(generate({}, {}, provider(429)))).toMatchObject({ code: 'brand_model_rate_limited', usage: { cost_microusd: 37_000, cost_basis: 'worst_case' } });
    const untouched = provider();
    const tampered = revisionRow({ status: 'generating', attempts: 1 });
    (tampered.intake as { brand: BrandInput }).brand.offer = 'An offer the customer never approved.';
    expect(await failure(generateRevisionForOrder(brandOrder(), tampered, untouched))).toBe('brand_backbrief_approval_required');
    expect(await failure(generateRevisionForOrder(readyStudioOrderFixture(), revisionRow({ attempts: 1 }), untouched))).toBe('product_version_unsupported');
    expect(untouched).not.toHaveBeenCalled();
  });
});
