import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBrandKit, FICTIONAL_BRAND_INPUT, TEXT_LIMITS, type BrandInput } from '../brand-kit/kit';
import { brandBackbriefSnapshot, persistedPaidBrandIntake, validatePaidBrandIntake } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION, brandRequestBytes } from '../brand-kit/synthesis';
import { STUDIO_DEMO_BUNDLE } from './demo';
import { generateForOrder, StudioGenerationError } from './dispatch';
import { StudioError } from './errors';
import { STUDIO_MODEL_BUDGETS } from './model-budget';
import { studioOrderFixture } from './test-fixtures';
import type { StudioIntake, StudioOrderRow } from './types';

vi.mock('./generation', async () => {
  const { STUDIO_DEMO_BUNDLE: bundle } = await vi.importActual<typeof import('./demo')>('./demo');
  return { generateStudioBundle: vi.fn(async () => ({ bundle, usage: { model: 'legacy-test', input_tokens: 10, output_tokens: 20 } })) };
});

const cta = FICTIONAL_BRAND_INPUT.callToAction;
const synthesis = () => ({
  positioning: 'Juniper Home Organizing helps busy households make their kitchens easier to use.',
  voiceDo: ['Use warm, practical language.', 'Explain the next step clearly.'],
  voiceAvoid: ['Avoid guilt and invented promises.'],
  email: {
    subject: 'A practical kitchen reset with Juniper',
    preview: 'A calmer way to organize your everyday kitchen.',
    body: `Hello,\n\nJuniper Home Organizing helps busy households sort everyday kitchen spaces using the storage they already own. A practical kitchen reset covers sorting kitchen items and arranging essentials. We can discuss pricing and availability before booking.\n\n${cta}`,
  },
  posts: [
    { body: `Start with a practical kitchen reset from Juniper Home Organizing. We use existing storage and focus on everyday kitchen routines. ${cta}` },
    { body: `For busy households who want a kitchen that is easier to use, Juniper helps sort kitchen items and arrange everyday essentials. ${cta}` },
    { body: `Want to explore a practical kitchen reset? We can discuss pricing and availability before booking. ${cta}` },
  ],
  sourceNotes: [{ field: 'businessName', quote: 'Juniper Home Organizing' }, { field: 'facts', quote: 'We use existing storage.' }],
});

function paidIntake(brand: BrandInput = structuredClone(FICTIONAL_BRAND_INPUT)) {
  return { productVersion: PAID_BRAND_KIT_VERSION, brand, email: 'customer@example.com', acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(brand) };
}
const brandOrder = (attempts = 1, ledger: Partial<StudioOrderRow> = {}) => studioOrderFixture({
  product_version: PAID_BRAND_KIT_VERSION, generation_attempts: attempts, intake: persistedPaidBrandIntake(paidIntake()) as unknown as StudioIntake,
  model_call_limit: 3, model_cost_limit_microusd: 350_000, model_calls: Math.max(attempts - 1, 0), model_input_tokens: 0, model_output_tokens: 0,
  model_cost_microusd: 0, model_cost_estimated: false, ...ledger,
});
const provider = (status = 200, usage: unknown = { input_tokens: 2400, output_tokens: 1300 }) => vi.fn(async () => new Response(JSON.stringify({
  stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'deliver_brand_kit', input: synthesis() }], usage,
}), { status })) as unknown as typeof fetch;
const failure = async (run: Promise<unknown>) => { try { await run; } catch (error) { return error instanceof StudioError ? error.code : `plain:${String(error)}`; } return 'no_error'; };

afterEach(() => vi.unstubAllEnvs());

describe('version-bound generation dispatch', () => {
  it('fulfils a marketing-setup-v1 order exactly as before and never calls the Brand Kit path', async () => {
    const fetcher = provider();
    const result = await generateForOrder(studioOrderFixture({ generation_attempts: 1 }), fetcher);
    expect(result.output).toEqual(STUDIO_DEMO_BUNDLE);
    expect(result.usage).toEqual({ model: 'legacy-test', input_tokens: 10, output_tokens: 20 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fulfils a Brand Kit order with one metered call inside the per-order budget', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = provider();
    const result = await generateForOrder(brandOrder(), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.output).toMatchObject({ schemaVersion: PAID_BRAND_KIT_VERSION, requiresCustomerReview: true });
    expect(result.usage).toEqual({ model: 'claude-haiku-4-5-20251001', input_tokens: 2400, output_tokens: 1300, cost_microusd: 8_900, cost_basis: 'reported' });
    const request = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(new TextEncoder().encode(String(request.body)).length).toBeLessThanOrEqual(STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes);
    expect(String(request.body)).not.toContain('customer@example.com');
  });

  it('charges the worst case when the provider omits token counts', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const result = await generateForOrder(brandOrder(), provider(200, {}));
    expect(result.usage).toMatchObject({ input_tokens: null, cost_microusd: 37_000, cost_basis: 'worst_case' });
  });

  it('allows the third durable attempt on the costliest model and refuses a fourth before any provider spend', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    vi.stubEnv('STUDIO_MODEL', 'claude-sonnet-4-6');
    const third = provider();
    await expect(generateForOrder(brandOrder(3), third)).resolves.toMatchObject({ usage: { model: 'claude-sonnet-4-6' } });
    const fourth = provider();
    expect(await failure(generateForOrder(brandOrder(4), fourth))).toBe('model_budget_exhausted');
    expect(fourth).not.toHaveBeenCalled();
  });

  it('refuses an unknown product version and a tampered saved intake without calling a provider', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = provider();
    expect(await failure(generateForOrder(studioOrderFixture({ product_version: 'brand-foundation-paid-v2' }), fetcher))).toBe('product_version_unsupported');
    const edited = brandOrder();
    (edited.intake as unknown as { brand: BrandInput }).brand.offer = 'An offer the customer never approved.';
    expect(await failure(generateForOrder(edited, fetcher))).toBe('brand_backbrief_approval_required');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('meters a failed attempt that reached the provider and never meters one that did not', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const caught = async (run: Promise<unknown>) => { try { await run; } catch (error) { return error; } return null; };
    // The provider answered with usage but the draft is unusable: the reported cost is recorded.
    const invalid = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [], usage: { input_tokens: 2000, output_tokens: 4000 } }), { status: 200 })) as unknown as typeof fetch;
    const answered = await caught(generateForOrder(brandOrder(), invalid));
    expect(answered).toBeInstanceOf(StudioGenerationError);
    expect(answered).toMatchObject({ code: 'brand_output_incomplete', usage: { input_tokens: 2000, output_tokens: 4000, cost_microusd: 22_000, cost_basis: 'reported' } });
    // A rejection or a timeout leaves the outcome unknown: the worst case is recorded, never zero.
    expect(await caught(generateForOrder(brandOrder(), provider(429)))).toMatchObject({ code: 'brand_model_rate_limited', usage: { input_tokens: null, cost_microusd: 37_000, cost_basis: 'worst_case' } });
    const timeout = vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }) as unknown as typeof fetch;
    expect(await caught(generateForOrder(brandOrder(), timeout))).toMatchObject({ code: 'provider_timeout', usage: { cost_microusd: 37_000, cost_basis: 'worst_case' } });
    // Refused by the budget before any request: an ordinary error with nothing to meter.
    const refused = await caught(generateForOrder(brandOrder(4), provider()));
    expect(refused).toBeInstanceOf(StudioError);
    expect(refused).not.toBeInstanceOf(StudioGenerationError);
  });

  it('charges recorded calls at their recorded cost and unrecorded attempts at the worst case', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    vi.stubEnv('STUDIO_MODEL', 'claude-sonnet-4-6');
    // Two recorded calls that cost little leave room for the third.
    await expect(generateForOrder(brandOrder(3, { model_calls: 2, model_cost_microusd: 20_000 }), provider())).resolves.toBeTruthy();
    // Two crashed attempts left no record: 2 x 111,000 is assumed, and the third still fits under 350,000.
    await expect(generateForOrder(brandOrder(3, { model_calls: 0, model_cost_microusd: 0 }), provider())).resolves.toBeTruthy();
    // Recorded spend that leaves less than one worst-case call stops the order before any request.
    const spent = provider();
    expect(await failure(generateForOrder(brandOrder(2, { model_calls: 1, model_cost_microusd: 300_000 }), spent))).toBe('model_budget_exhausted');
    // The limit bound on the order at creation wins over a looser current configuration.
    const bound = provider();
    expect(await failure(generateForOrder(brandOrder(1, { model_cost_limit_microusd: 100_000 }), bound))).toBe('model_budget_exhausted');
    expect(await failure(generateForOrder(brandOrder(2, { model_call_limit: 1 }), bound))).toBe('model_budget_exhausted');
    expect(spent).not.toHaveBeenCalled();
    expect(bound).not.toHaveBeenCalled();
  });
});

describe('request size is settled before payment', () => {
  const filled = (char: string): BrandInput => {
    const brand = structuredClone(FICTIONAL_BRAND_INPUT);
    for (const [field, limit] of Object.entries(TEXT_LIMITS)) (brand as unknown as Record<string, string>)[field] = char.repeat(limit);
    return brand;
  };

  it('fits the largest ordinary brief, including three-byte scripts, under the request cap', () => {
    const cap = STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes;
    expect(brandRequestBytes(FICTIONAL_BRAND_INPUT)).toBeLessThan(cap / 2);
    expect(brandRequestBytes(filled('a'))).toBeLessThanOrEqual(cap);
    expect(brandRequestBytes(filled('漢'))).toBeLessThanOrEqual(cap);
    expect(() => validatePaidBrandIntake(paidIntake(filled('漢')))).not.toThrow();
  });

  it('keeps the saved intake and the saved kit inside the database size limits for the largest brief', () => {
    const brand = filled('漢');
    const saved = persistedPaidBrandIntake(paidIntake(brand));
    expect(saved).not.toHaveProperty('approvalSnapshot');
    expect(saved.approvalSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(new TextEncoder().encode(JSON.stringify(saved)).length).toBeLessThanOrEqual(24_000);
    // Every synthesis field at the validator's maximum length, in a three-byte script.
    const text = (length: number) => '漢'.repeat(length);
    const kit = {
      schemaVersion: PAID_BRAND_KIT_VERSION, price: { amount: 4900, currency: 'usd', formatted: '$49' }, foundation: buildBrandKit(brand),
      synthesis: {
        positioning: text(600), voiceDo: Array.from({ length: 4 }, () => text(180)), voiceAvoid: Array.from({ length: 4 }, () => text(180)),
        email: { subject: text(100), preview: text(180), body: text(3500) }, posts: Array.from({ length: 3 }, () => ({ body: text(1600) })),
        sourceNotes: Array.from({ length: 20 }, () => ({ field: 'facts', quote: text(500) })),
      },
      provenance: 'Model-assisted draft from customer-supplied facts; not independently verified.', requiresCustomerReview: true,
    };
    // The schema bounds a Brand Kit output at 150,000 bytes of its spaced jsonb text; keep real headroom below it.
    expect(new TextEncoder().encode(JSON.stringify(kit)).length).toBeLessThanOrEqual(120_000);
  });

  it('rejects at intake a brief whose escaped form the budget would refuse after payment', () => {
    const cap = STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes;
    expect(brandRequestBytes(filled('"'))).toBeGreaterThan(cap);
    expect(() => validatePaidBrandIntake(paidIntake(filled('"')))).toThrow('brand_intake_too_large');
    // Unpaired surrogates escape to six characters each; the approval-snapshot cap already refuses them.
    expect(brandRequestBytes(filled('\ud800'))).toBeGreaterThan(cap);
    expect(() => validatePaidBrandIntake(paidIntake(filled('\ud800')))).toThrow(/^brand_intake_(invalid|too_large)$/);
  });
});
