import { afterEach, describe, expect, it, vi } from 'vitest';
import { FICTIONAL_BRAND_INPUT, TEXT_LIMITS, type BrandInput } from '../brand-kit/kit';
import { brandBackbriefSnapshot, validatePaidBrandIntake } from '../brand-kit/paid-intake';
import { PAID_BRAND_KIT_VERSION, brandRequestBytes } from '../brand-kit/synthesis';
import { studioDeliveryMessage } from './delivery';
import { STUDIO_DEMO_BUNDLE } from './demo';
import { generateForOrder } from './dispatch';
import { StudioError } from './errors';
import { STUDIO_MODEL_BUDGETS } from './model-budget';
import { readyStudioOrderFixture, studioOrderFixture } from './test-fixtures';
import type { StudioIntake } from './types';

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
const brandOrder = (attempts = 1, brand?: BrandInput) => studioOrderFixture({ product_version: PAID_BRAND_KIT_VERSION, generation_attempts: attempts, intake: paidIntake(brand) as unknown as StudioIntake });
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

  it('journals Brand Kit failures under their own codes and leaves timeouts recognisable', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    expect(await failure(generateForOrder(brandOrder(), provider(429)))).toBe('brand_model_rate_limited');
    const timeout = vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); }) as unknown as typeof fetch;
    expect(await failure(generateForOrder(brandOrder(), timeout))).toContain('TimeoutError');
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

  it('rejects at intake a brief whose escaped form the budget would refuse after payment', () => {
    const cap = STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes;
    expect(brandRequestBytes(filled('"'))).toBeGreaterThan(cap);
    expect(() => validatePaidBrandIntake(paidIntake(filled('"')))).toThrow('brand_intake_too_large');
    // Unpaired surrogates escape to six characters each; the approval-snapshot cap already refuses them.
    expect(brandRequestBytes(filled('\ud800'))).toBeGreaterThan(cap);
    expect(() => validatePaidBrandIntake(paidIntake(filled('\ud800')))).toThrow(/^brand_intake_(invalid|too_large)$/);
  });
});

describe('saved outputs are rendered only by the version that produced them', () => {
  it('refuses to email a Brand Kit order through the Marketing Setup renderer', () => {
    const order = { ...readyStudioOrderFixture(), product_version: PAID_BRAND_KIT_VERSION };
    expect(() => studioDeliveryMessage(order)).toThrow(expect.objectContaining({ code: 'delivery_version_unsupported' }));
  });
});
