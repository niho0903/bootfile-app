import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandPlacements } from '@/components/brand/BrandPlacements';
import { BrandKitOrderView } from '@/components/studio/BrandKitOrderView';
import { FICTIONAL_BRAND_INPUT, buildBrandKit } from './kit';
import { ARRANGEMENT_COUNT, colorLines, fontStack, placementsFor, sourceFromKit, sourceFromPaidKit } from './placements';
import { publicPaidBrandKit } from './synthesis';
import { paidBrandKitFixture } from './test-fixtures';

const kit = buildBrandKit(FICTIONAL_BRAND_INPUT);
const paid = paidBrandKitFixture();
const INTERNAL_WORDS = /foundation|backbrief|chapter|working preferences|synthesis|prototype/i;

describe('real brand, placeholder layout', () => {
  it('takes every word, color and font from the owner’s kit and invents none', () => {
    const source = sourceFromKit(kit);
    expect(source.name).toBe(kit.business.name);
    expect(kit.business.description.startsWith(source.line.replace(/…$/, ''))).toBe(true);
    expect(source.colors).toEqual({ background: kit.visuals.background, ink: kit.visuals.ink, accent: kit.visuals.accent, buttonInk: kit.visuals.buttonInk });
    expect(source.fonts).toEqual({ heading: kit.visuals.headingFont, body: kit.visuals.bodyFont });
    expect(source.email.subject).toBe(kit.firstCampaign.email.subject);
    expect(colorLines(source.colors).match(/#[0-9a-f]{6}/gi)).toHaveLength(3);
  });

  it('fills the same frames with the drafted words for a paid kit, from the public kit only', () => {
    const source = sourceFromPaidKit(publicPaidBrandKit(paid));
    expect(source.email.subject).toBe(paid.synthesis.email.subject);
    expect(paid.synthesis.positioning.startsWith(source.line.replace(/…$/, ''))).toBe(true);
    expect(source.post.body).toBe(paid.synthesis.posts[0].body);
    expect(JSON.stringify(source)).not.toContain(paid.foundation.ownerPreferences.instruction);
  });

  it('offers four placements, each with the owner’s own words to copy', () => {
    const placements = placementsFor(sourceFromKit(kit));
    expect(placements.map(p => p.id)).toEqual(['inbox', 'post', 'profile', 'card']);
    expect(placements[0].copyText).toContain(`Subject: ${kit.firstCampaign.email.subject}`);
    expect(placements[2].copyText).toContain(kit.business.name);
    for (const placement of placements) expect(placement.label).not.toMatch(/Instagram|Facebook|Gmail|LinkedIn|TikTok|Outlook/i);
  });

  it('lets a typed font name reach a style only as plain letters', () => {
    expect(fontStack('Playfair Display', 'Georgia, serif')).toBe('"Playfair Display", Georgia, serif');
    expect(fontStack('Arial"; } body { display:none } @import url(//evil.example)', 'serif')).toBe('"Arial  body  displaynone  import urlevilexample", serif');
    expect(fontStack('   ', 'Arial, sans-serif')).toBe('Arial, sans-serif');
  });

  it('shows two arrangements of every placement, a shuffle, and placeholders for what is not decided', () => {
    const html = renderToStaticMarkup(createElement(BrandPlacements, { source: sourceFromKit(kit), onCopy: () => {} }));
    expect(ARRANGEMENT_COUNT).toBe(3);
    expect(html.match(/class="kitPlaceFrame kitArr0"/g)).toHaveLength(4);
    expect(html.match(/class="kitPlaceFrame kitArr1"/g)).toHaveLength(4);
    for (const expected of ['Shuffle the layouts', 'Arrangement 1 of 3', 'Copy colors for Canva', 'YOUR PHOTO HERE', 'LOGO', 'PHONE · EMAIL · WEBSITE', kit.business.name, kit.firstCampaign.email.subject, 'placeholders', 'not designs to copy']) expect(html).toContain(expected);
    expect(html.match(/Copy the words/g)).toHaveLength(4);
    expect(html).toContain(`--place-bg:${kit.visuals.background}`);
    expect(html).not.toMatch(/<img|url\(|https?:/i);
    expect(html.replace(/class="[^"]*"/g, '')).not.toMatch(INTERNAL_WORDS);
  });

  it('appears on the paid order page with the drafted words and without the private notes', () => {
    const html = renderToStaticMarkup(createElement(BrandKitOrderView, { kit: publicPaidBrandKit(paid), orderId: '11111111-1111-4111-8111-111111111111', token: 't'.repeat(43) }));
    expect(html).toContain('Your brand, where customers will meet it.');
    expect(html.match(/kitPlaceFrame/g)).toHaveLength(8);
    expect(html).toContain(paid.synthesis.email.subject);
    expect(html).not.toContain(paid.foundation.ownerPreferences.instruction.slice(0, 40));
  });
});
