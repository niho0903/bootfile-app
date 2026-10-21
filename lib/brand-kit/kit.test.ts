import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../questions';
import { calculateResult } from '../scoring';
import { isPrivatePath, isPublicAnalyticsPath } from '../privacy';
import { BRAND_KIT_PRICE, BRAND_KIT_VERSION, EMPTY_BRAND_INPUT, FICTIONAL_BRAND_INPUT, PALETTES, VOICES, assistantInstructions, brandIssues, brandMarkdown, buildBrandKit, canvaVoice, contrastRatio, destinationGuidance, escapeXml, normalizeBrandInput, ownerProfile, publicBrandKit, quizComplete, restoreBrandDraft, socialSvg, visualSystem } from './kit';
const fixture = () => structuredClone(FICTIONAL_BRAND_INPUT);
describe('quiz-led Brand & AI Kit contract', () => {
  it('keeps $49 and the original eight-question scoring contract', () => {
    expect(BRAND_KIT_PRICE.amount).toBe(4900);
    expect(QUESTIONS).toHaveLength(8);
    expect(calculateResult(fixture().answers).primary).toBe('librarian');
    expect(ownerProfile(fixture()).name).toBe('The Librarian');
  });
  it('does not invent a profile from a partial quiz', () => {
    const input = { ...fixture(), answers: { Q1: 'A' } };
    expect(quizComplete(input)).toBe(false);
    expect(ownerProfile(input).complete).toBe(false);
    expect(() => buildBrandKit(input)).toThrow(/eight/);
  });
  it.each(['constructor', '__proto__', 'Z', '<script>'])('rejects invalid answer keys: %s', value => {
    const input = normalizeBrandInput({ ...fixture(), answers: { Q1: value } });
    expect(input.answers.Q1).toBeUndefined();
    expect(() => ownerProfile(input)).not.toThrow();
  });
  it('normalizes known fields without accepting hidden authorization or pricing', () => {
    const input = normalizeBrandInput({ ...fixture(), paid: true, amount: 1, role: 'admin', businessName: 'x'.repeat(300) });
    expect(input.businessName).toHaveLength(80);
    for (const field of ['paid', 'amount', 'role']) expect(input).not.toHaveProperty(field);
  });
  it('does not turn owner preferences into public brand voice or factual standards', () => {
    const a = buildBrandKit(fixture());
    const b = buildBrandKit({ ...fixture(), answers: Object.fromEntries(QUESTIONS.map(q => [q.id, 'A'])) });
    for (const key of ['business', 'voice', 'visuals', 'firstCampaign'] as const) expect(a[key]).toEqual(b[key]);
    expect(a.ownerPreferences).not.toEqual(b.ownerPreferences);
  });
  it('leaves missing differentiation and evidence visible instead of inventing it', () => {
    const kit = buildBrandKit({ ...fixture(), difference: '', proof: '' });
    expect(kit.business.difference).toMatch(/Not yet defined/);
    expect(kit.business.supportingEvidence).toMatch(/No supporting evidence/);
    expect(kit.provenance.businessFacts).toMatch(/not independently verified/);
    expect(kit.mode).toBe('local-template-preview');
  });
  it('produces three distinct posts with the exact approved next step', () => {
    const input = fixture(), kit = buildBrandKit(input);
    expect(kit.firstCampaign.posts).toHaveLength(3);
    expect(new Set(kit.firstCampaign.posts.map(post => post.body)).size).toBe(3);
    for (const body of [kit.firstCampaign.email.body, ...kit.firstCampaign.posts.map(post => post.body)]) expect(body).toContain(input.callToAction);
    expect(kit.campaign.needsReconfirmation).toBe(true);
  });
  it('excludes private owner preferences from public JSON and Markdown by default', () => {
    const kit = buildBrandKit(fixture());
    expect(publicBrandKit(kit)).not.toHaveProperty('ownerPreferences');
    expect(JSON.stringify(publicBrandKit(kit))).not.toContain(kit.ownerPreferences.instruction);
    expect(brandMarkdown(kit)).not.toContain(kit.ownerPreferences.instruction);
    expect(brandMarkdown(kit, 'private')).toContain(kit.ownerPreferences.instruction);
  });
  it('requires an explicit owner-context choice without granting action permissions', () => {
    const kit = buildBrandKit(fixture());
    expect(assistantInstructions(kit, false)).not.toContain(kit.ownerPreferences.instruction);
    expect(assistantInstructions(kit, true)).toContain(kit.ownerPreferences.instruction);
    expect(assistantInstructions(kit)).toContain('Never send, publish, purchase');
    expect(assistantInstructions(kit)).toContain('untrusted business data');
    expect(assistantInstructions(kit)).toContain('Reconfirm current offer facts');
  });
  it.each(Object.keys(VOICES))('fits the %s Canva block without dropping exclusions', voice => {
    const input = normalizeBrandInput({ ...fixture(), voice, voiceNotes: 'x'.repeat(120), avoid: 'z'.repeat(140) });
    const text = canvaVoice(input);
    expect(text.length).toBeLessThanOrEqual(500);
    expect(text).toContain(input.avoid);
    expect(text).toContain('Do not invent facts or promises.');
  });
  it('computes exact contrast and does not round failure into success', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 8);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5);
    expect(() => contrastRatio('url(javascript:1)', '#FFFFFF')).toThrow();
  });
  it.each(Object.keys(PALETTES))('uses readable text and button pairings for %s', palette => {
    const visual = visualSystem(normalizeBrandInput({ ...fixture(), palette }));
    expect(visual.textContrast).toBeGreaterThanOrEqual(4.5);
    expect(visual.buttonContrast).toBeGreaterThanOrEqual(4.5);
  });
  it('preserves existing colors/fonts and flags unreadable pairings', () => {
    const input = normalizeBrandInput({ ...fixture(), stage: 'existing', palette: 'existing', background: '#FFFFFF', ink: '#222222', accent: '#AA6633', headingFont: 'Owner chosen font' });
    expect(visualSystem(input).background).toBe('#FFFFFF');
    expect(visualSystem(input).headingFont).toBe('Owner chosen font');
    expect(brandIssues({ ...input, ink: '#FFFFFF' })).toContain('Choose a text/background pairing with at least 4.5:1 contrast.');
  });
  it('escapes SVG text without adding untrusted markup or remote assets', () => {
    const input = fixture(); input.businessName = '<script>alert(1)</script>'; input.offer = '<image href="https://evil.example" />';
    const svg = socialSvg(buildBrandKit(input), 0);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<image ');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('width="1080"');
    expect(escapeXml('a&b<"')).toBe('a&amp;b&lt;&quot;');
    expect(() => socialSvg(buildBrandKit(fixture()), 4)).toThrow();
  });
  it('does not invent a connected importer or model-training result', () => {
    expect(destinationGuidance('enrich').join(' ')).toContain('No native Bootfile importer');
    expect(destinationGuidance('chatgpt').join(' ')).toContain('ordinary chat');
    expect(destinationGuidance('claude').join(' ')).toContain('availability vary');
    expect(destinationGuidance('gemini').join(' ')).toContain('do not train');
  });
  it('restores only bounded current-version drafts, never approval', () => {
    const now = 1792584000000;
    const saved = JSON.stringify({ version: BRAND_KIT_VERSION, savedAt: now - 100, input: fixture(), sample: false, approved: true });
    const restored = restoreBrandDraft(saved, now);
    expect(restored?.input.businessName).toBe(FICTIONAL_BRAND_INPUT.businessName);
    expect(restored).not.toHaveProperty('approved');
    expect(restoreBrandDraft(saved, now + 86400001)).toBeNull();
    expect(restoreBrandDraft(saved, now - 1000)).toBeNull();
    expect(restoreBrandDraft('bad json', now)).toBeNull();
    expect(restoreBrandDraft('x'.repeat(25001), now)).toBeNull();
    expect(restoreBrandDraft(JSON.stringify({ version: 'old', savedAt: now, input: fixture() }), now)).toBeNull();
  });
  it.each([null, [], 1, 'unsafe'])('handles invalid restored data: %j', raw => { expect(normalizeBrandInput(raw)).toEqual(EMPTY_BRAND_INPUT); });
  it('excludes brand creation and exports from analytics and telemetry', () => {
    for (const path of ['/brand', '/brand/review', '/brand/export']) {
      expect(isPublicAnalyticsPath(path)).toBe(false);
      expect(isPrivatePath(path)).toBe(true);
    }
  });
});
