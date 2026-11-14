// Read-only production-mode acceptance checks for a checkout-disabled preview.
// Never use customer fixtures, production credentials, or provider side effects.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.env.PRELAUNCH_SMOKE_PORT || 31841);
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port),
], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    STUDIO_CHECKOUT_ENABLED: 'false',
    STUDIO_FULFILLMENT_ENABLED: 'false',
    STUDIO_REFUNDS_ENABLED: 'false',
    GROWTH_REVIEW_ENABLED: 'false',
    GROWTH_PUBLICATION_ENABLED: 'false',
    LEGACY_GROWTH_ENABLED: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let startupDiagnostics = '';
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', chunk => { startupDiagnostics = (startupDiagnostics + chunk).slice(-2500); });
}

async function request(path, options = {}) {
  return fetch(origin + path, { cache: 'no-store', signal: AbortSignal.timeout(4000), ...options });
}
async function waitUntilReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error('Local production server exited before becoming ready');
    try {
      const response = await request('/api/studio/config');
      if (response.status === 200) return;
    } catch { /* Server may still be starting. */ }
    await sleep(300);
  }
  throw new Error('Local production server did not become ready');
}
function expectSecurityHeaders(response, path) {
  assert.equal(response.headers.get('x-frame-options'), 'DENY', path + ' frame protection');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path + ' content-type protection');
}
function expectPrivateHeaders(response, path) {
  expectSecurityHeaders(response, path);
  assert.match(response.headers.get('cache-control') || '', /no-store/, path + ' must not be cached');
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/, path + ' must not be indexed');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer', path + ' must not leak access URL');
}
async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  const outcome = await Promise.race([
    once(server, 'exit').then(() => 'stopped').catch(() => 'stopped'),
    sleep(2500).then(() => 'timeout'),
  ]);
  if (outcome === 'timeout') server.kill('SIGKILL');
}

let checks = 0;
try {
  await waitUntilReady();

  for (const path of ['/', '/studio', '/studio/sample']) {
    const response = await request(path);
    assert.equal(response.status, 200, path + ' should render in production mode');
    expectSecurityHeaders(response, path);
    checks += 1;
  }

  const config = await request('/api/studio/config');
  assert.equal(config.status, 200);
  expectPrivateHeaders(config, '/api/studio/config');
  const configBody = await config.json();
  assert.equal(configBody.checkoutEnabled, false, 'Checkout must be fail-closed in this smoke');
  assert.deepEqual(configBody.price, { amount: 4900, currency: 'usd', formatted: '$49' });
  checks += 1;

  const privatePage = await request('/studio/order/00000000-0000-4000-8000-000000000000');
  assert.ok(privatePage.status < 500, 'Private order page should not crash for missing order');
  expectPrivateHeaders(privatePage, '/studio/order/[id]');
  checks += 1;

  for (const path of ['/api/operations/status', '/api/operations/run', '/api/operations/drafts']) {
    const response = await request(path);
    assert.equal(response.status, 401, path + ' requires a credential');
    expectPrivateHeaders(response, path);
    checks += 1;
  }

  const csrf = await request('/api/studio/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(csrf.status, 403, 'Missing Origin/Referer must block browser mutations');
  expectPrivateHeaders(csrf, '/api/studio/orders');
  checks += 1;

  const foreignOrigin = await request('/api/studio/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: '{}',
  });
  assert.equal(foreignOrigin.status, 403, 'A foreign Origin must never pass the CSRF guard');
  expectPrivateHeaders(foreignOrigin, '/api/studio/orders');
  checks += 1;

  const invalidIntake = await request('/api/studio/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}',
  });
  assert.equal(invalidIntake.status, 400, 'Invalid intake must stop before payment creation');
  expectPrivateHeaders(invalidIntake, '/api/studio/orders');
  checks += 1;

  const brandClosed = await request('/api/studio/brand-orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}',
  });
  assert.equal(brandClosed.status, 503, 'Brand Kit checkout must stay closed while its flag is off');
  expectPrivateHeaders(brandClosed, '/api/studio/brand-orders');
  const brandConfig = await request('/api/studio/brand-config');
  assert.equal(brandConfig.status, 200);
  expectPrivateHeaders(brandConfig, '/api/studio/brand-config');
  const brandConfigBody = await brandConfig.json();
  assert.equal(brandConfigBody.checkoutEnabled, false, 'The Brand Kit page must be told checkout is closed');
  assert.deepEqual(brandConfigBody.price, { amount: 4900, currency: 'usd', formatted: '$49' });
  checks += 1;

  // The one-revision allowance is closed unless its own flag is on: no order is looked up, with or without a link.
  const revisionPath = '/api/studio/orders/11111111-1111-4111-8111-111111111111/revision';
  for (const init of [{ method: 'GET' }, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}' }]) {
    const closed = await request(revisionPath, init);
    assert.equal(closed.status, 503, 'The revision route must stay closed while its flag is off');
    assert.equal((await closed.json()).error.code, 'revision_unavailable');
    expectPrivateHeaders(closed, revisionPath);
  }
  const revisionCsrf = await request(revisionPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(revisionCsrf.status, 403, 'A revision request without Origin or Referer must be blocked');
  checks += 1;

  console.log('PASS: ' + checks + ' production-mode prelaunch HTTP, privacy, auth, and disabled-commerce checks.');
} catch (error) {
  console.error('FAIL: prelaunch smoke:', error instanceof Error ? error.message : 'unknown failure');
  console.error('Server diagnostics (truncated):', startupDiagnostics);
  process.exitCode = 1;
} finally {
  await stopServer();
}
