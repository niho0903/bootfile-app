import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FICTIONAL_BRAND_INPUT, assistantInstructions, normalizeBrandInput } from '../brand-kit/kit';
import { PAID_BRAND_KIT_VERSION, publicPaidBrandKit } from '../brand-kit/synthesis';
import { paidBrandKitFixture } from '../brand-kit/test-fixtures';
import { studioProductOrNull } from './products';
import { STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioOrderView } from './types';

const PATH = 'scripts/fixtures/brand-order-view.json';

/**
 * What the browser smoke hands the paid order page in place of the server: a delivered fictional kit
 * that may still use its one revision. Built here from the typed fixtures, so the stand-in cannot
 * drift from what the server sends. Regenerate with UPDATE_FIXTURES=1.
 */
function orderPageFixture() {
  const kit = paidBrandKitFixture();
  const view: StudioOrderView = {
    orderId: STUDIO_TEST_ORDER_ID, status: 'ready', paymentStatus: 'paid', deliveryStatus: 'sent', createdAt: '2026-11-13T15:00:00.000Z',
    refundStatus: 'none', refundAvailable: false, refundEligibleUntil: '2026-11-20T15:00:00.000Z', refundRequestedAt: null,
    product: { version: PAID_BRAND_KIT_VERSION, name: studioProductOrNull(PAID_BRAND_KIT_VERSION)?.name ?? '' },
    brandKit: publicPaidBrandKit(kit),
    brandKitGuide: { assistantInstructions: assistantInstructions(kit.foundation, false), reviewChecklist: [...kit.foundation.reviewChecklist] },
    revision: { status: 'none', canRequest: true, availableUntil: '2026-11-20T15:02:00.000Z', requestedAt: null, readyAt: null },
    retryAfterSeconds: 5,
  };
  return { view, answers: normalizeBrandInput(FICTIONAL_BRAND_INPUT), revisedPositioning: 'Juniper Home Organizing, revised, helps busy households make their pantries easier to use.' };
}

describe('the order page stand-in used by the browser smoke', () => {
  it('is exactly what the typed fixtures produce, and holds nothing private', () => {
    const built = JSON.parse(JSON.stringify(orderPageFixture()));
    if (process.env.UPDATE_FIXTURES === '1') writeFileSync(PATH, `${JSON.stringify(built, null, 2)}\n`);
    expect(JSON.parse(readFileSync(PATH, 'utf8'))).toEqual(built);
    expect(built.view.product.name).toBe('Bootfile Brand & AI Kit');
    expect(JSON.stringify(built.view)).not.toContain(paidBrandKitFixture().foundation.ownerPreferences.instruction);
    expect(JSON.stringify(built)).not.toMatch(/@|access_token|sk_|Bearer/);
  });
});
