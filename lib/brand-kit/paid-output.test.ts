import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBrandKit, FICTIONAL_BRAND_INPUT } from './kit';
import { PAID_KIT_NOTICE, PRIVATE_NOTES_HEADING, paidBrandJson, paidBrandMarkdown } from './paid-output';
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
  it('exports the saved kit without leaking private work-style notes or template copy', () => {
    const kit = fixture();
    const markdown = paidBrandMarkdown(kit);
    const json = paidBrandJson(kit);
    expect(markdown).toContain(kit.synthesis.email.subject);
    expect(markdown).toContain(PAID_KIT_NOTICE);
    expect(markdown).toContain('not been independently verified');
    expect(markdown).not.toContain(PRIVATE_NOTES_HEADING);
    expect(markdown).not.toContain(kit.foundation.ownerPreferences.instruction);
    expect(markdown).not.toContain('PRELAUNCH TEMPLATE PREVIEW');
    expect(json).not.toContain('ownerPreferences');
    expect(json).not.toContain('local-template-preview');
    expect(json).not.toContain(kit.foundation.firstCampaign.email.subject);
  });

  it('includes private owner preferences only when explicitly requested', () => {
    const kit = fixture();
    expect(paidBrandMarkdown(kit, 'private')).toContain(kit.foundation.ownerPreferences.instruction);
    expect(paidBrandMarkdown(kit, 'private')).toContain(`## ${PRIVATE_NOTES_HEADING}`);
    expect(paidBrandJson(kit, 'private')).toContain('ownerPreferences');
  });

  it('uses the words on the order page for every heading and label, and names no menu path', () => {
    const kit = fixture();
    for (const scope of ['public', 'private'] as const) {
      const markdown = paidBrandMarkdown(kit, scope);
      const written = markdown.split('\n').filter(line => /^#{1,4} /.test(line) || /^[A-Z][A-Za-z ,]+: /.test(line)).map(line => line.replace(/: .*$/, ''));
      expect(written.join('\n')).not.toMatch(/foundation|backbrief|chapter|working preferences|synthesis|prototype|customer-supplied|source quotations/i);
      for (const heading of ['## Your brand', '## Voice guide', '## Visual starter kit', '## Where each claim came from', '## Put it to work', '### Instructions for your AI assistant', '## Before you publish'])
        expect(markdown).toContain(`${heading}\n`);
      expect(markdown.slice(0, markdown.indexOf('### Instructions for your AI assistant'))).not.toMatch(/Settings|→|Personalization|Gems/);
    }
  });

  it('keeps the acceptance script looking for the heading the private copy really uses', () => {
    expect(readFileSync('scripts/brand-acceptance.mjs', 'utf8')).toContain(`/${PRIVATE_NOTES_HEADING}|ownerPreferences/`);
  });

  it('keeps the export shape of the kit unchanged', () => {
    const kit = fixture();
    expect(Object.keys(JSON.parse(paidBrandJson(kit)))).toEqual(['schemaVersion', 'price', 'business', 'voice', 'visuals', 'campaign', 'synthesis', 'provenance', 'requiresCustomerReview']);
  });
});

