// End-to-end checks use fictional business data and a local production build only.
// No provider credentials, customer records, API mutations, or hosted bypasses.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT || '.', 'package.json'));
const { chromium } = require('playwright');
const origin = 'http://127.0.0.1:31991';
const output = resolve('artifacts/brand-kit');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '31991'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, STUDIO_CHECKOUT_ENABLED: 'false', BRAND_KIT_CHECKOUT_ENABLED: 'false', STUDIO_FULFILLMENT_ENABLED: 'false', STUDIO_REFUNDS_ENABLED: 'false', GROWTH_REVIEW_ENABLED: 'false', GROWTH_PUBLICATION_ENABLED: 'false', LEGACY_GROWTH_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1' },
});
let diagnostics = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { diagnostics = (diagnostics + String(chunk)).slice(-2000); });
let browser;
let page;
let groups = 0;
const runtimeErrors = [];
const mutations = [];
const externalRequests = [];
// In headless Chrome, scrolling a page to its very end by script can leave the layout flipping by one pixel per frame.
// It does not happen with a wheel or the keyboard, so no person sees it, but Playwright reads it as a control that
// never settles. Each action is therefore tried normally first, and repeated without the settle check only for that reason.
async function act(locator, action = 'click', options = {}) {
  try { await locator[action]({ ...options, timeout: 4000 }); }
  catch (error) {
    if (!/element is not stable/.test(String(error && error.message))) throw error;
    await locator[action]({ ...options, force: true });
  }
}
async function next() { await act(page.getByRole('button', { name: /^Continue/ })); }
async function noOverflow(label) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('.brandApp *')].map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, className: String(element.className), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter(item => item.right > window.innerWidth + 1 || item.left < -1).slice(0, 20),
  }));
  if (metrics.scrollWidth > metrics.viewport + 1) {
    await writeFile(output + '/overflow.json', JSON.stringify({ label, ...metrics }, null, 2));
    console.error('Overflow bounds:', JSON.stringify({ label, ...metrics }));
  }
  assert.ok(metrics.scrollWidth <= metrics.viewport + 1, label + ': page must not overflow horizontally');
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(origin + '/brand', { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break; } } catch { /* local startup */ }
    if (server.exitCode !== null) throw new Error('Local production server stopped');
    await sleep(250);
  }
  assert.ok(ready, 'Local brand route must start');
  const response = await fetch(origin + '/brand');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  groups++;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await context.route('**/*', route => {
    const request = route.request();
    if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) { externalRequests.push(new URL(request.url()).origin); return route.abort(); }
    if (!['GET', 'HEAD'].includes(request.method())) { mutations.push(request.method() + ' ' + new URL(request.url()).pathname); return route.abort(); }
    return route.continue();
  });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto(origin + '/brand');
  await page.getByRole('button', { name: /Build my kit/ }).waitFor();
  assert.equal(await page.locator('.brandOutputs article').count(), 4, 'The opening screen must show the four outputs');
  assert.equal(await page.locator('.brandOutputs .brandGoes').count(), 4, 'Each output must say where it goes');
  assert.equal(await page.locator('.brandFrames .brandFrame').count(), 3, 'A finished example must be visible without a click');
  assert.equal(await page.locator('.brandWelcome').getByRole('button').count(), 1, 'The opening screen offers one way forward');
  await noOverflow('desktop landing');
  await page.screenshot({ path: output + '/01-brand-home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile landing');
  await page.screenshot({ path: output + '/02-brand-home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  groups++;
  await act(page.getByRole('button', { name: /Build my kit/ }), 'click');
  for (let i = 0; i < 8; i++) {
    await act(page.getByRole('radio').first(), 'check');
    await act(page.getByRole('button', { name: i < 7 ? /Next question/ : /^Continue/ }), 'click');
  }
  await page.locator('input[name="businessName"]').fill('Juniper Browser Test');
  await page.locator('textarea[name="description"]').fill('A fictional organizing business that helps households use existing kitchen storage.');
  await page.locator('textarea[name="audience"]').fill('Households looking for practical kitchen organization.');
  await page.locator('textarea[name="difference"]').fill('We start with existing storage and everyday routines.');
  await next();
  await act(page.locator('.brandVoiceCard').filter({ hasText: 'Clear & considered' }).getByRole('radio'), 'check');
  await page.locator('textarea[name="avoid"]').fill('No invented results, discounts or false urgency.');
  await next();
  await act(page.locator('.brandPaletteCard').filter({ hasText: 'Human warmth' }).getByRole('radio'), 'check');
  await page.screenshot({ path: output + '/03-brand-visual-choices.png', fullPage: true });
  await next();
  await page.locator('textarea[name="offer"]').fill('A practical kitchen reset');
  await page.locator('textarea[name="facts"]').fill('We use existing storage. Pricing and availability are discussed before booking.');
  await page.locator('textarea[name="callToAction"]').fill('Reply KITCHEN to ask about a reset.');
  await act(page.getByRole('button', { name: /Check my answers/ }), 'click');
  assert.equal(await page.getByRole('button', { name: /Open my kit preview/ }).isDisabled(), true);
  await page.screenshot({ path: output + '/04-brand-backbrief.png', fullPage: true });
  await act(page.getByRole('checkbox'), 'check');
  await act(page.getByRole('button', { name: /Open my kit preview/ }), 'click');
  await page.getByRole('tab', { name: 'Your brand', exact: true }).waitFor();
  assert.ok((await page.locator('.brandDefinition').textContent()).includes('Juniper Browser Test'));
  // The kit is shown in use: the owner's own words in placeholder frames, in more than one arrangement.
  assert.equal(await page.locator('.kitPlaceFrame').count(), 8);
  assert.ok((await page.locator('.kitPlaceFrame[data-placement="profile"]').first().textContent()).includes('Juniper Browser Test'));
  const firstArrangement = await page.locator('.kitPlaceFrame').first().getAttribute('class');
  await act(page.getByRole('button', { name: 'Shuffle the layouts' }));
  assert.notEqual(await page.locator('.kitPlaceFrame').first().getAttribute('class'), firstArrangement, 'Shuffle must change the arrangement');
  assert.ok((await page.locator('.kitPlaceActions [role=status]').textContent()).includes('Arrangement 2 of 3'));
  await act(page.locator('.kitPlaceGrid article').first().getByRole('button', { name: 'Copy the words' }));
  await page.getByRole('status').filter({ hasText: 'Email words copied' }).waitFor();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).startsWith('Subject: Juniper Browser Test'));
  // The finished kit leads with where each piece goes: one assistant chosen from the list, then three other places.
  assert.equal(await page.locator('.brandDeployGrid > li').count(), 4);
  assert.equal(await page.locator('.brandAssistantPicker').getByRole('radio').count(), 7);
  assert.equal(await page.getByText(/Enrich|Helena/).count(), 0);
  await act(page.locator('.brandAssistantPicker').getByRole('radio', { name: 'Kimi' }), 'check');
  assert.ok((await page.locator('.brandDeployGrid > li').first().textContent()).includes('Open a new chat in Kimi'));
  await act(page.locator('.brandAssistantPicker').getByRole('radio', { name: 'ChatGPT' }), 'check');
  assert.ok((await page.locator('.brandDeployGrid > li').first().textContent()).includes('Custom instructions'));
  await act(page.locator('.brandDeployGrid > li').first().getByRole('button', { name: /Copy AI instructions/ }), 'click');
  await page.getByRole('status').filter({ hasText: 'AI instructions copied' }).waitFor();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('Juniper Browser Test'), 'The copied instructions must be this business’s own');
  await act(page.locator('.brandDeployGrid > li').first().getByRole('checkbox'), 'check');
  assert.ok((await page.locator('.brandDeployCount').textContent()).includes('1 of 4 done'));
  // With checkout closed the approved kit offers no purchase and the page still says so.
  assert.equal(await page.locator('#brand-purchase').count(), 0);
  assert.equal(await page.getByRole('button', { name: /Continue to payment/ }).count(), 0);
  assert.equal(await page.getByRole('link', { name: /Get the full kit/ }).count(), 0);
  assert.ok((await page.locator('.brandPreviewBar').textContent()).includes('No purchase'));
  await page.screenshot({ path: output + '/05-brand-result-desktop.png', fullPage: true });
  groups++;
  await page.getByRole('tab', { name: 'Your brand', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'First campaign', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.brandSocialGrid article').count(), 3);
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.brandSocialGrid img')];
    return images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0);
  });
  const pngPromise = page.waitForEvent('download');
  await act(page.getByRole('button', { name: 'Save PNG', exact: true }).first(), 'click');
  const png = await pngPromise;
  const pngPath = await png.path(); assert.ok(pngPath);
  assert.equal((await readFile(pngPath)).subarray(1, 4).toString(), 'PNG');
  await page.screenshot({ path: output + '/06-brand-first-campaign.png', fullPage: true });
  groups++;
  await act(page.getByRole('tab', { name: 'Your AI partner', exact: true }), 'click');
  const prompt = page.getByRole('textbox', { name: 'Your AI working-partner instructions', exact: true });
  assert.ok((await prompt.inputValue()).includes('HOW TO WORK WITH ME'));
  await act(page.getByRole('checkbox', { name: /private work-style notes/ }), 'uncheck');
  assert.equal((await prompt.inputValue()).includes('HOW TO WORK WITH ME'), false);
  assert.ok((await prompt.inputValue()).includes('Never send, publish, purchase'));
  groups++;
  await act(page.getByRole('tab', { name: 'Use & export', exact: true }), 'click');
  const voice = await page.getByRole('textbox', { name: 'Canva voice block', exact: true }).inputValue();
  assert.ok(voice.length <= 500);
  assert.ok(voice.includes('No invented results'));
  const downloadPromise = page.waitForEvent('download');
  await act(page.getByRole('button', { name: 'Public JSON', exact: true }), 'click');
  const exported = await downloadPromise;
  const jsonPath = await exported.path(); assert.ok(jsonPath);
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(Object.hasOwn(data, 'ownerPreferences'), false);
  assert.equal(data.business.name, 'Juniper Browser Test');
  assert.equal(data.firstCampaign.posts.length, 3);
  assert.equal(data.mode, 'local-template-preview');
  assert.equal((await page.locator('.brandPrint').textContent()).includes('HOW TO WORK WITH ME'), false);
  const printed = await page.locator('.brandPrint').textContent();
  assert.ok(printed.includes('Your private work-style notes are left out on purpose.'));
  assert.equal(/deterministic|working preferences|owner preferences/i.test(printed), false, 'The printed kit must use the words on the page');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: output + '/fictional-brand-guide-print.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  groups++;
  await act(page.getByRole('button', { name: /Review or edit my choices/ }), 'click');
  assert.equal(await page.getByRole('button', { name: /Open my kit preview/ }).isDisabled(), true);
  await act(page.locator('.brandReviewCard').filter({ hasText: 'Your public voice' }).getByRole('button', { name: 'Edit', exact: true }), 'click');
  await act(page.locator('.brandVoiceCard').filter({ hasText: 'Warm & grounded' }).getByRole('radio'), 'check');
  assert.equal(await page.getByRole('button', { name: 'Public JSON', exact: true }).count(), 0);
  await page.reload();
  await page.getByRole('button', { name: /Continue my brand kit/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Public JSON', exact: true }).count(), 0);
  groups++;
  await page.setViewportSize({ width: 390, height: 844 });
  await act(page.getByRole('button', { name: /Open the full example/ }), 'click');
  await noOverflow('mobile result');
  await page.screenshot({ path: output + '/07-brand-result-mobile.png', fullPage: true });
  await act(page.getByRole('tab', { name: 'Use & export', exact: true }), 'click');
  await noOverflow('mobile exports');
  await page.screenshot({ path: output + '/08-brand-exports-mobile.png', fullPage: true });
  groups++;
  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors');
  assert.deepEqual(mutations, [], 'Prototype must not issue server mutations');
  assert.deepEqual(externalRequests, [], 'Prototype must not transmit data to external services');

  // Simulated open checkout. The server above stays closed. The readiness answer, the order answer and the
  // Stripe page are stand-ins supplied at the browser's network boundary, so no order, payment or provider call can occur.
  const paidPosts = [];
  const paidRedirects = [];
  const paidErrors = [];
  const paidContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await paidContext.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'checkout.stripe.com') { paidRedirects.push(url.href); return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Stand-in for Stripe</title>' }); }
    if (!request.url().startsWith(origin + '/')) { externalRequests.push(url.origin); return route.abort(); }
    if (url.pathname === '/api/studio/brand-config') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ checkoutEnabled: true, price: { amount: 4900, currency: 'usd', formatted: '$49' }, productName: 'Bootfile Brand & AI Kit', productDescription: 'A brand foundation, voice guide, visual starter kit, AI working instructions, and a first campaign.', productVersion: 'brand-foundation-paid-v1' }) });
    if (url.pathname === '/api/studio/brand-orders' && request.method() === 'POST') {
      paidPosts.push({ key: request.headers()['idempotency-key'], body: JSON.parse(request.postData() || '{}') });
      return paidPosts.length === 1
        ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'checkout_provider_unavailable', message: 'Checkout is temporarily unavailable. Please try again.' } }) })
        : route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ orderId: '11111111-1111-4111-8111-111111111111', accessToken: 't'.repeat(43), checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_stand_in' }) });
    }
    if (!['GET', 'HEAD'].includes(request.method())) { mutations.push(request.method() + ' ' + url.pathname); return route.abort(); }
    return route.continue();
  });
  page = await paidContext.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => paidErrors.push(error.message));
  await page.goto(origin + '/brand');
  await page.getByRole('button', { name: /Build my kit/ }).waitFor();
  await page.waitForFunction(() => document.querySelector('.brandPreviewBar')?.textContent?.includes('Free interactive preview'));
  assert.equal(await page.getByText('No checkout is enabled').count(), 0);
  await act(page.getByRole('button', { name: /Open the full example/ }), 'click');
  await page.getByRole('tab', { name: 'Your brand', exact: true }).waitFor();
  assert.equal(await page.locator('#brand-purchase').count(), 0, 'The fictional example must never be purchasable');
  await act(page.getByRole('button', { name: /Clear this draft/ }), 'click');
  await act(page.getByRole('button', { name: /Confirm: erase/ }), 'click');
  await act(page.getByRole('button', { name: /Build my kit/ }), 'click');
  for (let i = 0; i < 8; i++) {
    await act(page.getByRole('radio').first(), 'check');
    await act(page.getByRole('button', { name: i < 7 ? /Next question/ : /^Continue/ }), 'click');
  }
  await page.locator('input[name="businessName"]').fill('Juniper Browser Test');
  await page.locator('textarea[name="description"]').fill('A fictional organizing business that helps households use existing kitchen storage.');
  await page.locator('textarea[name="audience"]').fill('Households looking for practical kitchen organization.');
  await next();
  await next();
  await next();
  await page.locator('textarea[name="offer"]').fill('A practical kitchen reset');
  await page.locator('textarea[name="facts"]').fill('We use existing storage. Pricing and availability are discussed before booking.');
  await page.locator('textarea[name="callToAction"]').fill('Reply KITCHEN to ask about a reset.');
  await act(page.getByRole('button', { name: /Check my answers/ }), 'click');
  assert.equal(await page.locator('#brand-purchase').count(), 0, 'No purchase is offered before the brief is approved');
  await act(page.getByRole('checkbox'), 'check');
  await act(page.getByRole('button', { name: /Open my kit preview/ }), 'click');
  await page.getByRole('tab', { name: 'Your brand', exact: true }).waitFor();
  const purchase = page.locator('#brand-purchase');
  const pay = purchase.getByRole('button', { name: /Continue to payment · \$49/ });
  assert.equal(await pay.isDisabled(), true, 'Payment stays disabled without an email and accepted terms');
  await purchase.getByRole('textbox').fill('not-an-email');
  await act(purchase.getByRole('checkbox'), 'check');
  await act(pay, 'click');
  assert.ok((await purchase.getByRole('alert').textContent()).includes('valid delivery email'));
  assert.equal(paidPosts.length, 0, 'An invalid email must not reach the server');
  await purchase.getByRole('textbox').fill('owner@example.com');
  await page.screenshot({ path: output + '/09-brand-purchase-simulated-open.png', fullPage: true });
  await act(pay, 'click');
  await purchase.getByText('temporarily unavailable').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile purchase panel');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await Promise.all([page.waitForURL(/^https:\/\/checkout\.stripe\.com\//), act(pay)]);
  assert.equal(paidPosts.length, 2);
  assert.equal(paidPosts[0].key, paidPosts[1].key, 'A retry of the same intake must reuse its request key');
  assert.match(paidPosts[1].key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const posted = paidPosts[1].body;
  assert.deepEqual(Object.keys(posted).sort(), ['acceptedTerms', 'approvalSnapshot', 'approvedBackbrief', 'brand', 'email', 'productVersion']);
  assert.equal(posted.productVersion, 'brand-foundation-paid-v1');
  assert.equal(posted.acceptedTerms, true);
  assert.equal(posted.email, 'owner@example.com');
  assert.equal(JSON.parse(posted.approvalSnapshot).businessName, 'Juniper Browser Test');
  assert.deepEqual(paidRedirects, ['https://checkout.stripe.com/c/pay/cs_test_stand_in']);
  assert.deepEqual(paidErrors, [], 'No browser runtime errors with checkout simulated open');
  assert.deepEqual(mutations, [], 'Only the stand-in order request may be issued');
  assert.deepEqual(externalRequests, [], 'Only the stand-in Stripe page may be opened');
  await paidContext.close();
  groups++;

  // The paid order page, with its one revision. The server above stays closed and has no database. The order,
  // the customer's answers, the request and the download are stand-ins at the browser's network boundary, built
  // from the same typed fixtures the unit tests use. No order, provider call or email can occur.
  const fixture = JSON.parse(await readFile(resolve('scripts/fixtures/brand-order-view.json'), 'utf8'));
  const orderId = fixture.view.orderId;
  const orderToken = 'r'.repeat(43);
  const orderPath = '/api/studio/orders/' + orderId;
  const revisionPosts = [];
  const downloads = [];
  const orderErrors = [];
  let revisionSaved = false;
  let readsAfterSave = 0;
  const orderContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  await orderContext.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!request.url().startsWith(origin + '/')) { externalRequests.push(url.origin); return route.abort(); }
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.startsWith(orderPath) && request.headers().authorization !== 'Bearer ' + orderToken) return json(404, { error: { code: 'order_not_found', message: 'This private order link is not valid.' } });
    if (url.pathname === orderPath && request.method() === 'GET') {
      const view = structuredClone(fixture.view);
      if (revisionSaved) {
        readsAfterSave += 1;
        const done = readsAfterSave > 1;
        view.revision = { status: done ? 'ready' : 'queued', canRequest: false, availableUntil: fixture.view.revision.availableUntil, requestedAt: '2026-11-14T15:00:00.000Z', readyAt: done ? '2026-11-14T15:01:00.000Z' : null };
        if (done) view.brandKit.synthesis.positioning = fixture.revisedPositioning;
      }
      return json(200, view);
    }
    if (url.pathname === orderPath + '/revision' && request.method() === 'GET') return json(200, { revision: fixture.view.revision, answers: fixture.answers });
    if (url.pathname === orderPath + '/revision' && request.method() === 'POST') {
      revisionPosts.push(JSON.parse(request.postData() || '{}'));
      if (revisionPosts.length === 1) return json(503, { error: { code: 'temporarily_full', message: 'We are at capacity for the moment. Your revision has not been used. Please try again shortly.' } });
      revisionSaved = true;
      return json(202, { revision: { status: 'queued', canRequest: false, availableUntil: null, requestedAt: '2026-11-14T15:00:00.000Z', readyAt: null } });
    }
    if (url.pathname === orderPath + '/download') { downloads.push(url.search); return route.fulfill({ status: 200, contentType: 'text/markdown; charset=utf-8', body: '# Stand-in for the first kit\n' }); }
    if (!['GET', 'HEAD'].includes(request.method())) { mutations.push(request.method() + ' ' + url.pathname); return route.abort(); }
    return route.continue();
  });
  page = await orderContext.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => orderErrors.push(error.message));
  await page.goto(origin + '/studio/order/' + orderId + '#access_token=' + orderToken);
  await page.getByRole('heading', { name: 'Your Brand & AI Kit is ready.' }).waitFor();
  assert.equal(new URL(page.url()).hash, '', 'The private link must be removed from the address bar');
  assert.equal(await page.locator('.kitPlaceFrame').count(), 8);
  assert.equal(await page.locator('.brandDeployGrid > li').count(), 4);
  assert.equal(await page.locator('.brandAssistantPicker').getByRole('radio').count(), 7);
  const orderWords = await page.locator('main').innerText();
  assert.equal(/brand foundation|working preferences|backbrief/i.test(orderWords), false, 'The order page must use the words on the brand page');
  assert.ok(orderWords.includes('See it in use, put it to work, then read the full kit underneath.'));
  // The offer: one sentence on what it is, the last day, and one button. Nothing is fetched before the click.
  const revise = page.locator('.kitRevise');
  await revise.getByRole('heading', { name: 'Something off? Change your answers once.' }).waitFor();
  assert.ok((await revise.innerText()).includes('one time, until November 20'));
  assert.equal(await revise.locator('details').count(), 0, 'The customer’s answers must not be on the page before they ask for them');
  await page.screenshot({ path: output + '/10-order-page-desktop.png', fullPage: true });
  await act(revise.getByRole('button', { name: 'Change my answers' }));
  await revise.getByRole('heading', { name: 'Change what you told us.' }).waitFor();
  assert.equal(await revise.locator('details').count(), 5);
  assert.deepEqual(await revise.locator('summary > span').allInnerTexts(), ['About you', 'Your business', 'Your voice', 'Your look', 'Your first campaign']);
  const send = revise.getByRole('button', { name: 'Send my revision' });
  const confirm = revise.getByRole('checkbox');
  assert.equal(await send.isDisabled(), true, 'Nothing can be sent before something changes');
  assert.equal(await confirm.isDisabled(), true);
  // Spacing alone is not a change, so it cannot spend the revision.
  await act(revise.locator('summary').filter({ hasText: 'Your business' }));
  const name = revise.locator('input[name="businessName"]');
  await name.fill((await name.inputValue()) + ' ');
  assert.equal(await revise.locator('.kitReviseChanges li').count(), 0);
  assert.equal(await confirm.isDisabled(), true);
  await name.fill((await name.inputValue()).trim());
  // A real change is listed in the words of its question.
  await act(revise.locator('summary').filter({ hasText: 'Your first campaign' }));
  await revise.locator('textarea[name="offer"]').fill('A practical pantry reset');
  await revise.locator('.kitReviseChanges li').filter({ hasText: 'A practical pantry reset' }).waitFor();
  assert.ok((await revise.locator('.kitReviseChanges li').first().innerText()).includes('What is the one offer?'));
  // An answer the kit needs cannot be left empty.
  const facts = revise.locator('textarea[name="facts"]');
  const savedFacts = await facts.inputValue();
  await facts.fill('');
  await revise.getByText('Add the confirmed offer details.').waitFor();
  assert.equal(await confirm.isDisabled(), true, 'Incomplete answers cannot be approved');
  await facts.fill(savedFacts);
  assert.equal(await revise.locator('.kitReviseChanges li').count(), 1);
  await act(confirm, 'check');
  // Editing after approval withdraws it.
  await revise.locator('textarea[name="offer"]').fill('A practical pantry reset for busy households');
  assert.equal(await confirm.isChecked(), false, 'A change after approval must need approval again');
  assert.equal(await send.isDisabled(), true);
  await act(confirm, 'check');
  await page.screenshot({ path: output + '/11-order-revision-editor.png', fullPage: true });
  // A refusal says the revision was not used and keeps the customer's work.
  await act(send);
  await revise.getByRole('alert').filter({ hasText: 'has not been used' }).waitFor();
  assert.equal(await revise.locator('textarea[name="offer"]').inputValue(), 'A practical pantry reset for busy households');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile revision editor');
  await page.setViewportSize({ width: 1280, height: 900 });
  await act(send);
  await page.getByText('Your revised kit is being built.').waitFor();
  assert.equal(revisionPosts.length, 2);
  const sentRevision = revisionPosts[1];
  assert.deepEqual(Object.keys(sentRevision).sort(), ['approvalSnapshot', 'approvedBackbrief', 'brand'], 'A revision carries answers and their approval, never an address, a price or a product');
  assert.equal(sentRevision.approvedBackbrief, true);
  assert.equal(sentRevision.brand.offer, 'A practical pantry reset for busy households');
  assert.equal(sentRevision.brand.businessName, fixture.answers.businessName);
  assert.equal(sentRevision.approvalSnapshot, JSON.stringify(sentRevision.brand), 'The approval must be for exactly the answers that were sent');
  assert.equal(await page.locator('.kitRevise details').count(), 0, 'The editor closes once the revision is sent');
  assert.equal(await page.getByRole('button', { name: 'Change my answers' }).count(), 0, 'A second revision is never offered');
  // The page keeps checking on its own and then shows the revised kit, with the first still on offer.
  await page.getByText('This is your revised kit.').waitFor({ timeout: 25000 });
  await page.getByText(fixture.revisedPositioning).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Change my answers' }).count(), 0);
  const firstVersion = page.waitForEvent('download');
  await act(page.getByRole('button', { name: 'Download the first version' }));
  assert.equal((await firstVersion).suggestedFilename(), 'bootfile-brand-ai-kit-first-version.md');
  assert.ok(downloads.some(query => query.includes('version=first') && query.includes('scope=public')), 'The first kit is requested as the first version');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('mobile order page');
  await page.screenshot({ path: output + '/12-order-page-revised-mobile.png', fullPage: true });
  assert.deepEqual(orderErrors, [], 'No browser runtime errors on the order page');
  assert.deepEqual(mutations, [], 'Only the stand-in revision request may be issued');
  assert.deepEqual(externalRequests, [], 'The order page must not reach another origin');
  await orderContext.close();
  groups++;
  await writeFile(output + '/report.json', JSON.stringify({ groupsPassed: groups, runtimeErrors: 0, apiMutations: 0, externalRequests: 0, environment: 'local production build; all business input fictional', hostedAcceptance: false, providerCalls: false, simulatedOpenCheckout: { serverCheckoutEnabled: false, standInOrderRequests: paidPosts.length, ordersCreated: 0, paymentsCreated: 0 } }, null, 2));
  console.log(`PASS: ${groups} Brand Kit browser groups; no runtime errors, API mutations or external requests. The simulated open checkout and the paid order page with its revision reached only stand-ins. Screenshots and fictional print PDF saved.`);
} catch (error) {
  if (page) await page.screenshot({ path: output + '/failure.png', fullPage: true }).catch(() => {});
  console.error('FAIL: Brand Kit browser QA:', error instanceof Error ? error.message : 'unknown');
  console.error(diagnostics);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    const stopped = await Promise.race([once(server, 'exit').then(() => true), sleep(2500).then(() => false)]);
    if (!stopped) server.kill('SIGKILL');
  }
}
