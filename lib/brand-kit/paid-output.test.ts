import { describe, expect, it } from 'vitest';
import { buildBrandKit, FICTIONAL_BRAND_INPUT } from './kit';
import { paidBrandJson, paidBrandMarkdown } from './paid-output';
import { PAID_BRAND_KIT_VERSION, type PaidBrandKit } from './synthesis';

const fixture = (): PaidBrandKit => ({
  schemaVersion: PAID_BRAND_KIT_VERSION,
  price: { amount: 4900, currency: 'usd', formatted: '$49' },
  foundation: buildBrandKit(FICTIONAL_BRAND_INPUT),
  synthesis: {
    positioning: 'Juniper helps busy households make everyday kitchen spaces easier to use.',
    voiceDo: ['Explain the practical next step.', 'Use warm, specific words.'],
    voiceAvoid: ['Avoid invented promises.'],
    email: { subject: 'A kitchen reset with Juniper', preview: 'Sort and arrange what you already own.', body: `A practical kitchen reset is available to discuss. ${FICTIONAL_BRAND_INPUT.callToAction}` },
    posts: [
      { body: `Explore a practical kitchen reset. ${FICTIONAL_BRAND_INPUT.callToAction}` },
      { body: `For busy households who want a more usable kitchen. ${FICTIONAL_BRAND_INPUT.callToAction}` },
      { body: `Ask what a kitchen reset could include. ${FICTIONAL_BRAND_INPUT.callToAction}` },
    ],
    sourceNotes: [{ field: 'offer', quote: 'A practical kitchen reset' }],
  },
  provenance: 'Model-assisted draft from customer-supplied facts; not independently verified.',
  requiresCustomerReview: true,
});

describe('paid Brand Kit exports', () => {
  it('exports saved synthesis without leaking private working preferences or template copy', () => {
    const kit = fixture();
    const markdown = paidBrandMarkdown(kit);
    const json = paidBrandJson(kit);
    expect(markdown).toContain(kit.synthesis.email.subject);
    expect(markdown).toContain('customer-supplied');
    expect(markdown).not.toContain(kit.foundation.ownerPreferences.instruction);
    expect(markdown).not.toContain('PRELAUNCH TEMPLATE PREVIEW');
    expect(json).not.toContain('ownerPreferences');
    expect(json).not.toContain('local-template-preview');
    expect(json).not.toContain(kit.foundation.firstCampaign.email.subject);
  });

  it('includes private owner preferences only when explicitly requested', () => {
    const kit = fixture();
    expect(paidBrandMarkdown(kit, 'private')).toContain(kit.foundation.ownerPreferences.instruction);
    expect(paidBrandJson(kit, 'private')).toContain('ownerPreferences');
  });
});

