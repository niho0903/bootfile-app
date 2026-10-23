import { afterEach, describe, expect, it, vi } from 'vitest';
import { FICTIONAL_BRAND_INPUT } from './kit';
import { PAID_BRAND_KIT_VERSION, publicPaidBrandKit, synthesizeBrandKit, validateBrandSynthesis } from './synthesis';

const fixture = () => ({
  positioning: 'Juniper Home Organizing helps busy households make their kitchens easier to use.',
  voiceDo: ['Use warm, practical language.', 'Explain the next step clearly.'],
  voiceAvoid: ['Avoid guilt and invented promises.'],
  email: {
    subject: 'A practical kitchen reset with Juniper',
    preview: 'A calmer way to organize your everyday kitchen.',
    body: `Hello,\n\nJuniper Home Organizing helps busy households sort everyday kitchen spaces using the storage they already own. A practical kitchen reset covers sorting kitchen items and arranging essentials. We can discuss pricing and availability before booking.\n\n${FICTIONAL_BRAND_INPUT.callToAction}`,
  },
  posts: [
    { body: `Start with a practical kitchen reset from Juniper Home Organizing. We use existing storage and focus on everyday kitchen routines. ${FICTIONAL_BRAND_INPUT.callToAction}` },
    { body: `For busy households who want a kitchen that is easier to use, Juniper helps sort kitchen items and arrange everyday essentials. ${FICTIONAL_BRAND_INPUT.callToAction}` },
    { body: `Want to explore a practical kitchen reset? We can discuss pricing and availability before booking. ${FICTIONAL_BRAND_INPUT.callToAction}` },
  ],
  sourceNotes: [
    { field: 'businessName', quote: 'Juniper Home Organizing' },
    { field: 'facts', quote: 'We use existing storage.' },
  ],
});

afterEach(() => vi.unstubAllEnvs());

describe('candidate paid Brand Kit synthesis', () => {
  it('makes one bounded, text-only model call without owner quiz or delivery email', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'deliver_brand_kit', input: fixture() }], usage: { input_tokens: 100, output_tokens: 200 } }), { status: 200 })) as unknown as typeof fetch;
    const { kit, usage } = await synthesizeBrandKit({ ...FICTIONAL_BRAND_INPUT, email: 'private@example.com' }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(String(request.body)).not.toContain('private@example.com');
    expect(String(request.body)).not.toContain('answers');
    expect(kit.schemaVersion).toBe(PAID_BRAND_KIT_VERSION);
    expect(kit.requiresCustomerReview).toBe(true);
    expect(usage.input_tokens).toBe(100);
    const publicKit = publicPaidBrandKit(kit);
    expect(publicKit).not.toHaveProperty('ownerPreferences');
    expect(publicKit).not.toHaveProperty('firstCampaign');
    expect(publicKit).not.toHaveProperty('mode');
  });

  it('rejects unsupported numbers, missing exact call to action and false source notes', () => {
    const numbered = fixture(); numbered.email.body += ' Save 50% today.';
    expect(() => validateBrandSynthesis(numbered, FICTIONAL_BRAND_INPUT)).toThrow('brand_output_ungrounded');
    const missing = fixture(); missing.posts[0].body = 'A practical kitchen reset with no clear next step, for households wanting a more usable kitchen.';
    expect(() => validateBrandSynthesis(missing, FICTIONAL_BRAND_INPUT)).toThrow('brand_output_ungrounded');
    const fabricated = fixture(); fabricated.sourceNotes[0].quote = 'certified experts';
    expect(() => validateBrandSynthesis(fabricated, FICTIONAL_BRAND_INPUT)).toThrow('brand_output_ungrounded');
  });

  it('rejects truncated provider responses without retrying or returning a partial kit', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'partial' }] }), { status: 200 })) as unknown as typeof fetch;
    await expect(synthesizeBrandKit(FICTIONAL_BRAND_INPUT, fetcher)).rejects.toThrow('brand_output_incomplete');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

