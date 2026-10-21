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
  env: { ...process.env, STUDIO_CHECKOUT_ENABLED: 'false', STUDIO_FULFILLMENT_ENABLED: 'false', STUDIO_REFUNDS_ENABLED: 'false', GROWTH_REVIEW_ENABLED: 'false', GROWTH_PUBLICATION_ENABLED: 'false', LEGACY_GROWTH_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1' },
});
let diagnostics = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { diagnostics = (diagnostics + String(chunk)).slice(-2000); });
let browser;
let page;
let groups = 0;
const runtimeErrors = [];
const mutations = [];
const externalRequests = [];
async function next() { await page.getByRole('button', { name: /^Continue/ }).click(); }
async function noOverflow() { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'Page must not overflow horizontally'); }
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
  await context.route('**/*', route => {
    const request = route.request();
    if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) { externalRequests.push(new URL(request.url()).origin); return route.abort(); }
    if (!['GET', 'HEAD'].includes(request.method())) { mutations.push(request.method() + ' ' + new URL(request.url()).pathname); return route.abort(); }
    return route.continue();
  });
  page = await context.newPage();
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto(origin + '/brand');
  await page.getByRole('button', { name: /Start with how I work/ }).waitFor();
  await noOverflow();
  await page.screenshot({ path: output + '/01-brand-home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: output + '/02-brand-home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  groups++;
  await page.getByRole('button', { name: /Start with how I work/ }).click();
  for (let i = 0; i < 8; i++) {
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: i < 7 ? /Next question/ : /^Continue/ }).click();
  }
  await page.locator('input[name="businessName"]').fill('Juniper Browser Test');
  await page.locator('textarea[name="description"]').fill('A fictional organizing business that helps households use existing kitchen storage.');
  await page.locator('textarea[name="audience"]').fill('Households looking for practical kitchen organization.');
  await page.locator('textarea[name="difference"]').fill('We start with existing storage and everyday routines.');
  await next();
  await page.locator('.brandVoiceCard').filter({ hasText: 'Clear & considered' }).getByRole('radio').check();
  await page.locator('textarea[name="avoid"]').fill('No invented results, discounts or false urgency.');
  await next();
  await page.locator('.brandPaletteCard').filter({ hasText: 'Human warmth' }).getByRole('radio').check();
  await page.screenshot({ path: output + '/03-brand-visual-choices.png', fullPage: true });
  await next();
  await page.locator('textarea[name="offer"]').fill('A practical kitchen reset');
  await page.locator('textarea[name="facts"]').fill('We use existing storage. Pricing and availability are discussed before booking.');
  await page.locator('textarea[name="callToAction"]').fill('Reply KITCHEN to ask about a reset.');
  await page.getByRole('button', { name: /Review my foundation/ }).click();
  assert.equal(await page.getByRole('button', { name: /Open my kit preview/ }).isDisabled(), true);
  await page.screenshot({ path: output + '/04-brand-backbrief.png', fullPage: true });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Open my kit preview/ }).click();
  await page.getByRole('tab', { name: 'Your brand', exact: true }).waitFor();
  assert.ok((await page.locator('.brandDefinition').textContent()).includes('Juniper Browser Test'));
  await page.screenshot({ path: output + '/05-brand-result-desktop.png', fullPage: true });
  groups++;
  await page.getByRole('tab', { name: 'Your brand', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'First campaign', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.brandSocialGrid article').count(), 3);
  assert.equal(await page.locator('.brandSocialGrid img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
  const pngPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG', exact: true }).first().click();
  const png = await pngPromise;
  const pngPath = await png.path(); assert.ok(pngPath);
  assert.equal((await readFile(pngPath)).subarray(1, 4).toString(), 'PNG');
  await page.screenshot({ path: output + '/06-brand-first-campaign.png', fullPage: true });
  groups++;
  await page.getByRole('tab', { name: 'Your AI partner', exact: true }).click();
  const prompt = page.getByRole('textbox', { name: 'Your AI working-partner instructions', exact: true });
  assert.ok((await prompt.inputValue()).includes('HOW TO WORK WITH ME'));
  await page.getByRole('checkbox').uncheck();
  assert.equal((await prompt.inputValue()).includes('HOW TO WORK WITH ME'), false);
  assert.ok((await prompt.inputValue()).includes('Never send, publish, purchase'));
  groups++;
  await page.getByRole('tab', { name: 'Use & export', exact: true }).click();
  const voice = await page.getByRole('textbox', { name: 'Canva voice block', exact: true }).inputValue();
  assert.ok(voice.length <= 500);
  assert.ok(voice.includes('No invented results'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Public JSON', exact: true }).click();
  const exported = await downloadPromise;
  const jsonPath = await exported.path(); assert.ok(jsonPath);
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(Object.hasOwn(data, 'ownerPreferences'), false);
  assert.equal(data.business.name, 'Juniper Browser Test');
  assert.equal(data.firstCampaign.posts.length, 3);
  assert.equal(data.mode, 'local-template-preview');
  assert.equal((await page.locator('.brandPrint').textContent()).includes('HOW TO WORK WITH ME'), false);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: output + '/fictional-brand-guide-print.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  groups++;
  await page.getByRole('button', { name: /Review or edit my choices/ }).click();
  assert.equal(await page.getByRole('button', { name: /Open my kit preview/ }).isDisabled(), true);
  await page.locator('.brandReviewCard').filter({ hasText: 'Your public voice' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('.brandVoiceCard').filter({ hasText: 'Warm & grounded' }).getByRole('radio').check();
  assert.equal(await page.getByRole('button', { name: 'Public JSON', exact: true }).count(), 0);
  await page.reload();
  await page.getByRole('button', { name: /Continue my brand kit/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Public JSON', exact: true }).count(), 0);
  groups++;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Explore a fictional example/ }).click();
  await noOverflow();
  await page.screenshot({ path: output + '/07-brand-result-mobile.png', fullPage: true });
  await page.getByRole('tab', { name: 'Use & export', exact: true }).click();
  await noOverflow();
  await page.screenshot({ path: output + '/08-brand-exports-mobile.png', fullPage: true });
  groups++;
  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors');
  assert.deepEqual(mutations, [], 'Prototype must not issue server mutations');
  assert.deepEqual(externalRequests, [], 'Prototype must not transmit data to external services');
  await writeFile(output + '/report.json', JSON.stringify({ groupsPassed: groups, runtimeErrors: 0, apiMutations: 0, externalRequests: 0, environment: 'local production build; all business input fictional', hostedAcceptance: false, providerCalls: false }, null, 2));
  console.log(`PASS: ${groups} Brand Kit browser groups; no runtime errors, API mutations or external requests. Screenshots and fictional print PDF saved.`);
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
