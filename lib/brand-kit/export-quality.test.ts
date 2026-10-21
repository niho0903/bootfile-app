import { describe, expect, it } from 'vitest';
import { FICTIONAL_BRAND_INPUT, buildBrandKit, canvaVoice, normalizeBrandInput } from './kit';

describe('portable brand wording', () => {
  it('preserves negative restrictions without prefixing a contradictory double negative', () => {
    const text = canvaVoice(normalizeBrandInput({ ...FICTIONAL_BRAND_INPUT, avoid: 'No discounts. Do not invent urgency.' }));
    expect(text).toContain('Owner restrictions: No discounts. Do not invent urgency.');
    expect(text).not.toContain('Never: No');
  });
  it('does not join a sentence-ending audience to a dangling comma', () => {
    const kit = buildBrandKit({ ...FICTIONAL_BRAND_INPUT, audience: 'Families seeking practical help.', offer: 'A kitchen reset.' });
    expect(kit.positioning).toContain('Intended audience: Families seeking practical help. Current offer: A kitchen reset.');
    expect(kit.positioning).not.toContain('.,');
    expect(kit.positioning).not.toContain('..');
  });
});
