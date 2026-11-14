import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GET as download } from '@/app/api/studio/orders/[id]/download/route';
import { BrandKitOrderView } from '@/components/studio/BrandKitOrderView';
import { assistantInstructions } from '../brand-kit/kit';
import { PAID_KIT_NOTICE } from '../brand-kit/paid-output';
import { PAID_BRAND_KIT_VERSION, publicPaidBrandKit } from '../brand-kit/synthesis';
import { paidBrandKitFixture } from '../brand-kit/test-fixtures';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { studioOrderView } from './db';
import { studioDeliveryMessage } from './delivery';
import { STUDIO_DEMO_BUNDLE } from './demo';
import { studioOrderWording } from './order-wording';
import { brandKitOf, marketingBundleOf } from './outputs';
import { readyStudioOrderFixture, studioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioIntake, StudioOrderRow } from './types';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

const kit = paidBrandKitFixture();
const privateInstruction = kit.foundation.ownerPreferences.instruction;
let token: string;
let row: StudioOrderRow;
const context = { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) };
const readyBrandOrder = (overrides: Partial<StudioOrderRow> = {}) => studioOrderFixture({
  product_version: PAID_BRAND_KIT_VERSION, output: paidBrandKitFixture(), status: 'ready', ready_at: '2026-10-20T12:01:00.000Z',
  intake: { email: 'customer@example.com' } as unknown as StudioIntake, access_token_hash: hashStudioAccessToken(token), ...overrides,
});
const request = (query = '') => new NextRequest(`https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/download${query}`, { headers: { Authorization: `Bearer ${token}` } });
const thrown = (run: () => unknown) => { try { run(); } catch (error) { return (error as { code?: string }).code ?? 'plain'; } return 'no_error'; };

beforeEach(() => {
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'brand-delivery-secret-'.repeat(3));
  token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
  row = readyBrandOrder();
  // One row serves both the order lookup and the delivery-status lookup.
  const maybeSingle = vi.fn(async () => ({ data: { ...row, status: row.status }, error: null }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as ReturnType<typeof getSupabaseAdmin>);
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('a saved output is read only as its own order’s schema', () => {
  it('narrows each version through its accessor and refuses every crossing', () => {
    expect(brandKitOf(row).schemaVersion).toBe(PAID_BRAND_KIT_VERSION);
    expect(marketingBundleOf(readyStudioOrderFixture())).toEqual(STUDIO_DEMO_BUNDLE);
    expect(thrown(() => brandKitOf(readyStudioOrderFixture()))).toBe('output_version_mismatch');
    expect(thrown(() => marketingBundleOf(row))).toBe('output_version_mismatch');
    expect(thrown(() => brandKitOf({ product_version: PAID_BRAND_KIT_VERSION, output: STUDIO_DEMO_BUNDLE }))).toBe('output_version_mismatch');
    expect(thrown(() => marketingBundleOf({ product_version: 'marketing-setup-v1', output: paidBrandKitFixture() }))).toBe('output_version_mismatch');
    expect(thrown(() => brandKitOf({ product_version: PAID_BRAND_KIT_VERSION, output: { ...paidBrandKitFixture(), requiresCustomerReview: false } as never }))).toBe('output_version_mismatch');
  });
});

describe('Brand Kit delivery email', () => {
  it('sends the public kit to the buyer and keeps private preferences out of the attachment', () => {
    const message = studioDeliveryMessage(row);
    const attached = Buffer.from(message.attachments[0].content, 'base64').toString('utf8');
    expect(message).toMatchObject({ to: ['customer@example.com'], subject: 'Your Bootfile Brand & AI Kit is ready', reply_to: 'support@bootfile.ai' });
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].filename).toBe('bootfile-brand-ai-kit.md');
    expect(attached).toContain(kit.synthesis.positioning);
    expect(attached).toContain(kit.synthesis.email.subject);
    expect(privateInstruction.length).toBeGreaterThan(20);
    expect(attached).not.toContain(privateInstruction);
    expect(message.text).toContain(`/studio/order/${STUDIO_TEST_ORDER_ID}#access_token=${token}`);
    expect(message.text).toContain('within seven days of payment');
    expect(message.text).not.toContain('Marketing Setup');
    expect(studioDeliveryMessage(row)).toEqual(message);
  });

  it('leaves the Marketing Setup email as it was and refuses anything it cannot render', () => {
    const legacy = studioDeliveryMessage({ ...readyStudioOrderFixture(), access_token_hash: hashStudioAccessToken(token) });
    expect(legacy.subject).toBe('Your Bootfile Marketing Setup is ready');
    expect(legacy.attachments[0].filename).toBe('bootfile-marketing-setup.md');
    expect(legacy.text).not.toContain('Brand & AI Kit');
    expect(thrown(() => studioDeliveryMessage(readyBrandOrder({ product_version: 'brand-foundation-paid-v2' })))).toBe('delivery_version_unsupported');
    expect(thrown(() => studioDeliveryMessage(readyBrandOrder({ output: structuredClone(STUDIO_DEMO_BUNDLE) })))).toBe('output_version_mismatch');
    expect(thrown(() => studioDeliveryMessage(readyBrandOrder({ refund_status: 'pending' })))).toBe('delivery_not_ready');
  });
});

describe('Brand Kit download and order view', () => {
  it('downloads the public kit by default and the private copy only on an explicit scope', async () => {
    const open = await download(request(), context);
    const openText = await open.text();
    expect(open.status).toBe(200);
    expect(open.headers.get('Content-Disposition')).toBe('attachment; filename="bootfile-brand-ai-kit.md"');
    expect(open.headers.get('Cache-Control')).toContain('no-store');
    expect(openText).toContain(kit.synthesis.positioning);
    expect(openText).not.toContain(privateInstruction);
    const ignored = await download(request('?scope=everything'), context);
    expect(await ignored.text()).not.toContain(privateInstruction);
    const mine = await download(request('?scope=private'), context);
    expect(mine.headers.get('Content-Disposition')).toBe('attachment; filename="bootfile-brand-ai-kit-private.md"');
    expect(await mine.text()).toContain(privateInstruction);
    const json = await download(request('?format=json'), context);
    expect(json.headers.get('Content-Type')).toContain('application/json');
    const parsed = JSON.parse(await json.text());
    expect(parsed).toMatchObject({ schemaVersion: PAID_BRAND_KIT_VERSION, requiresCustomerReview: true });
    expect(parsed).not.toHaveProperty('ownerPreferences');
    expect(JSON.parse(await (await download(request('?format=json&scope=private'), context)).text())).toHaveProperty('ownerPreferences');
  });

  it('refuses a wrong token, a refunded order and a package that does not match its order', async () => {
    const wrong = new NextRequest(`https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/download`, { headers: { Authorization: `Bearer ${'x'.repeat(43)}` } });
    expect((await download(wrong, context)).status).toBe(404);
    row = readyBrandOrder({ refund_status: 'pending' });
    expect((await download(request(), context)).status).toBe(409);
    row = readyBrandOrder({ output: structuredClone(STUDIO_DEMO_BUNDLE) });
    const mismatched = await download(request('?scope=private'), context);
    expect(mismatched.status).toBe(409);
    expect(await mismatched.json()).toMatchObject({ error: { code: 'output_version_mismatch' } });
    row = readyBrandOrder({ product_version: 'brand-foundation-paid-v2' });
    expect(await (await download(request(), context)).json()).toMatchObject({ error: { code: 'package_version_unsupported' } });
  });

  it('gives the order page the public allowlist only, and nothing once a refund is requested', async () => {
    const view = await studioOrderView(row);
    expect(view.product).toEqual({ version: PAID_BRAND_KIT_VERSION, name: 'Bootfile Brand & AI Kit' });
    expect(view.brandKit).toEqual(publicPaidBrandKit(kit));
    expect(view.brandKitGuide?.assistantInstructions).toContain('REFERENCE BRAND DATA');
    expect(view.brandKitGuide?.assistantInstructions).not.toContain('HOW TO WORK WITH ME');
    expect(view.brandKitGuide?.reviewChecklist).toEqual(kit.foundation.reviewChecklist);
    expect(view).not.toHaveProperty('result');
    expect(JSON.stringify(view)).not.toContain(privateInstruction);
    const refunding = await studioOrderView(readyBrandOrder({ refund_status: 'pending' }));
    expect(refunding).not.toHaveProperty('brandKit');
    expect(refunding).not.toHaveProperty('brandKitGuide');
    const legacy = await studioOrderView(readyStudioOrderFixture());
    expect(legacy.result).toEqual(STUDIO_DEMO_BUNDLE);
    expect(legacy).not.toHaveProperty('brandKit');
    expect(legacy).not.toHaveProperty('brandKitGuide');
    expect(legacy.product).toEqual({ version: 'marketing-setup-v1', name: 'Bootfile Marketing Setup' });
  });

  it('renders the kit page from the public allowlist without the private preferences', () => {
    const guide = { assistantInstructions: assistantInstructions(kit.foundation, false), reviewChecklist: kit.foundation.reviewChecklist };
    const html = renderToStaticMarkup(createElement(BrandKitOrderView, { kit: publicPaidBrandKit(kit), guide, orderId: STUDIO_TEST_ORDER_ID, token }));
    for (const expected of [kit.foundation.business.name, kit.synthesis.email.subject, 'Download my kit', 'Download my private copy', 'not been independently verified', 'AI working instructions', 'REFERENCE BRAND DATA', 'Before you publish', 'Put it to work.', '0 of 4 done', 'Which AI assistant do you use?', 'Copy AI instructions', 'Copy brand colors', 'Copy email draft', 'Copy post drafts', 'Read the full kit', 'Your brand', 'Your private work-style notes', PAID_KIT_NOTICE]) expect(html).toContain(expected);
    expect(html.match(/type="radio"/g)).toHaveLength(7);
    expect(html.replace(/class="[^"]*"/g, '')).not.toMatch(/Brand foundation|working preferences|backbrief|synthesis/i);
    expect(html).not.toContain('HOW TO WORK WITH ME');
    expect(html).not.toContain(kit.foundation.firstCampaign.email.subject);
    const withoutGuide = renderToStaticMarkup(createElement(BrandKitOrderView, { kit: publicPaidBrandKit(kit), orderId: STUDIO_TEST_ORDER_ID, token }));
    expect(withoutGuide).not.toContain('Put it to work.');
    expect(withoutGuide).toContain('Read the full kit');
    expect(html).toContain('Juniper Home Organizing helps busy households');
    expect(html).not.toContain(privateInstruction.slice(0, 40));
    expect(html).not.toContain(token);
  });
});

describe('order page wording follows the product that was bought', () => {
  it('names neither product before the order has loaded', () => {
    const unknown = studioOrderWording(STUDIO_TEST_ORDER_ID);
    expect(unknown.label).toBe('order');
    expect(unknown.readyHeading).toBe('Your order is ready.');
    expect(unknown.supportSubject).toBe(`Bootfile order ${STUDIO_TEST_ORDER_ID}`);
    expect(JSON.stringify(studioOrderWording(STUDIO_TEST_ORDER_ID, null))).not.toMatch(/Marketing Setup|Brand & AI Kit/);
  });

  it('keeps the Marketing Setup wording and gives the Brand & AI Kit its own', () => {
    const setup = studioOrderWording(STUDIO_TEST_ORDER_ID, { version: 'marketing-setup-v1', name: 'Bootfile Marketing Setup' });
    expect(setup).toMatchObject({ label: 'Marketing Setup', readyHeading: 'Your Marketing Setup is ready.', generatingHeading: 'Your promotion is taking shape.', readyStep: 'Your pack is ready', restart: { href: '/studio', label: 'Start a new brief' } });
    expect(setup.preparing).toContain('email, social posts, and reusable setup');
    const kitWording = studioOrderWording(STUDIO_TEST_ORDER_ID, { version: PAID_BRAND_KIT_VERSION, name: 'Bootfile Brand & AI Kit' });
    expect(kitWording).toMatchObject({ label: 'Brand & AI Kit', readyHeading: 'Your Brand & AI Kit is ready.', generatingHeading: 'Your kit is taking shape.', readyStep: 'Your kit is ready', restart: { href: '/brand', label: 'Start a new kit' } });
    expect(kitWording.supportSubject).toBe(`Brand & AI Kit order ${STUDIO_TEST_ORDER_ID}`);
    expect(JSON.stringify(kitWording)).not.toMatch(/Marketing Setup|pack|promotion|social posts/);
    // An unknown product is described neutrally and never as the Brand & AI Kit.
    expect(studioOrderWording(STUDIO_TEST_ORDER_ID, { version: 'brand-foundation-paid-v2', name: 'Bootfile order' }).restart.href).toBe('/studio');
  });
});
