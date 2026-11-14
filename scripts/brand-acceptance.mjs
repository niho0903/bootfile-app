// Hosted acceptance for the paid Brand & AI Kit, in provider test modes only.
// It creates at most one synthetic order for a fictional business on a preview or local deployment.
// It never targets production, never proceeds on live Stripe keys, and never prints or records the
// order's access token, the delivery address, the payment address or any provider secret.
// See docs/PROVIDER_ACCEPTANCE_RUNBOOK.md. Nothing here runs in CI.
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  AcceptanceRefusal, acceptanceTarget, assertEvidenceClean, digest, isProtectionWall, preflightRefusals,
  requireFlag, statePathAllowed, syntheticIntake, testCheckout,
} from './lib/acceptance-guards.mjs';

const USAGE = `Usage: node scripts/brand-acceptance.mjs <preflight|create|observe|refund> --url <origin> [options]
  preflight                      Read-only. Reports whether the target may be used.
  create   --email <address> --confirm-test-order
                                 Creates one synthetic order and saves its private state outside the repository.
  observe  [--minutes <n>] [--email <address>]
                                 Follows that order until it is ready and checks the page data and downloads.
                                 With the same --email it also replays the paid intake and expects a refusal.
  refund   --confirm-test-refund Requests the full refund of that order in Stripe test mode.
Options: --state <file> (private state, default in the system temp folder), --show-checkout-url
Environment: VERCEL_AUTOMATION_BYPASS_SECRET, only if the owner generated one for a protected preview.`;

const argv = process.argv.slice(2);
const command = argv[0];
const option = name => { const index = argv.indexOf(name); return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : ''; };
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const evidence = { script: 'brand-acceptance', command, startedAt: new Date().toISOString(), steps: [] };
const forbidden = [bypass];
const step = (name, result) => { evidence.steps.push({ name, at: new Date().toISOString(), ...result }); console.log(`${name}: ${JSON.stringify(result)}`); };

async function call(target, path, { method = 'GET', token = '', body, key } = {}) {
  const headers = { Accept: 'application/json' };
  if (bypass) headers['x-vercel-protection-bypass'] = bypass;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== 'GET') { headers.Origin = target.origin; headers['Content-Type'] = 'application/json'; }
  if (key) headers['Idempotency-Key'] = key;
  const response = await fetch(target.origin + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(60_000) });
  const text = await response.text();
  if (isProtectionWall(response.status, response.headers.get('content-type'), text)) {
    throw new AcceptanceRefusal('deployment_protected', 'this preview is behind Vercel Authentication; the owner must generate a Protection Bypass for Automation secret and supply it as VERCEL_AUTOMATION_BYPASS_SECRET');
  }
  let json = null;
  try { json = JSON.parse(text); } catch { /* A non-JSON answer is reported by status alone. */ }
  return { status: response.status, json, text, headers: response.headers };
}

async function preflight(target, needsOpenCheckout) {
  const config = await call(target, '/api/studio/brand-config');
  const reasons = config.status === 200 ? preflightRefusals(target, config.json, { needsOpenCheckout }) : [`config_status_${config.status}`];
  step('preflight', { host: target.host, status: config.status, deployment: config.json?.deployment ?? null, paymentMode: config.json?.paymentMode ?? null, checkoutEnabled: config.json?.checkoutEnabled === true, refusals: reasons });
  if (reasons.length) throw new AcceptanceRefusal('preflight_refused', reasons.join(', '));
}

function statePath(target) {
  const chosen = resolve(option('--state') || join(tmpdir(), 'bootfile-acceptance', `${digest(target.host).slice(0, 12)}.json`));
  if (!statePathAllowed(chosen, resolve('.'), sep)) throw new AcceptanceRefusal('state_inside_repository', 'the state file holds a private access token; keep it outside the repository');
  return chosen;
}
async function loadState(target) {
  try { return JSON.parse(await readFile(statePath(target), 'utf8')); }
  catch { throw new AcceptanceRefusal('state_missing', 'run create first, or pass the same --state file'); }
}

async function create(target) {
  requireFlag(argv, '--confirm-test-order');
  const intake = syntheticIntake(option('--email'));
  forbidden.push(intake.email);
  await preflight(target, true);
  const requestKey = randomUUID();
  const answer = await call(target, '/api/studio/brand-orders', { method: 'POST', body: intake, key: requestKey });
  if (answer.status !== 201) { step('create', { status: answer.status, code: answer.json?.error?.code ?? null }); throw new AcceptanceRefusal('order_not_created'); }
  const checkout = testCheckout(answer.json);
  forbidden.push(checkout.accessToken, checkout.checkoutUrl);
  const file = statePath(target);
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify({ host: target.host, orderId: checkout.orderId, accessToken: checkout.accessToken, checkoutUrl: checkout.checkoutUrl, requestKey, createdAt: new Date().toISOString() }), { mode: 0o600 });
  await chmod(file, 0o600);
  evidence.orderId = checkout.orderId;
  step('create', { status: 201, stripeSession: 'test', stateSaved: true });
  console.log(`Private state saved to ${file}. It holds the access token and the Stripe test checkout address. Do not share or commit it.`);
  console.log(argv.includes('--show-checkout-url') ? `Pay with a Stripe test card here: ${checkout.checkoutUrl}` : 'Open the checkoutUrl from that file in a browser and pay with a Stripe test card, or rerun with --show-checkout-url.');
}

async function observe(target) {
  const state = await loadState(target);
  if (state.host !== target.host) throw new AcceptanceRefusal('state_is_for_another_host');
  forbidden.push(state.accessToken, state.checkoutUrl);
  evidence.orderId = state.orderId;
  await preflight(target, false);
  const minutes = Math.min(Math.max(Number(option('--minutes')) || 6, 1), 20);
  const deadline = Date.now() + minutes * 60_000;
  const seen = [];
  let view = null;
  while (Date.now() < deadline) {
    const answer = await call(target, `/api/studio/orders/${state.orderId}`, { token: state.accessToken });
    if (answer.status !== 200) { step('order', { status: answer.status, code: answer.json?.error?.code ?? null }); throw new AcceptanceRefusal('order_unreadable'); }
    view = answer.json;
    const label = `${view.paymentStatus}/${view.status}/${view.deliveryStatus ?? 'none'}`;
    if (seen.at(-1) !== label) { seen.push(label); step('order', { payment: view.paymentStatus, status: view.status, delivery: view.deliveryStatus ?? null }); }
    if (view.status === 'ready' || view.status === 'needs_attention' || view.status === 'cancelled') break;
    await sleep(5000);
  }
  if (view?.status !== 'ready') throw new AcceptanceRefusal('order_not_ready', `last state ${seen.at(-1) ?? 'unknown'}; an unpaid order stays awaiting_payment until the test payment is made`);
  const serialized = JSON.stringify(view);
  step('view', {
    productVersion: view.product?.version ?? null, hasKit: !!view.brandKit, requiresCustomerReview: view.brandKit?.requiresCustomerReview === true,
    hasAssistantInstructions: typeof view.brandKitGuide?.assistantInstructions === 'string', privatePreferencesInPage: /ownerPreferences|HOW TO WORK WITH ME/.test(serialized),
    emailPostCount: Array.isArray(view.brandKit?.synthesis?.posts) ? view.brandKit.synthesis.posts.length : 0, sourceNoteCount: Array.isArray(view.brandKit?.synthesis?.sourceNotes) ? view.brandKit.synthesis.sourceNotes.length : 0,
  });
  for (const [name, query, wantsPrivate] of [['download_public', '', false], ['download_json', '?format=json', false], ['download_private', '?scope=private', true]]) {
    const file = await call(target, `/api/studio/orders/${state.orderId}/download${query}`, { token: state.accessToken });
    const hasPrivate = /Private work-style notes|ownerPreferences/.test(file.text);
    step(name, { status: file.status, bytes: Buffer.byteLength(file.text), sha256: digest(file.text).slice(0, 16), disposition: file.headers.get('content-disposition'), privatePreferences: hasPrivate, asExpected: file.status === 200 && hasPrivate === wantsPrivate });
  }
  const noToken = await call(target, `/api/studio/orders/${state.orderId}`);
  step('access_without_token', { status: noToken.status, refused: noToken.status === 401 || noToken.status === 404 });
  // Replaying the identical paid intake needs the same delivery address, which is never stored.
  if (option('--email')) {
    const intake = syntheticIntake(option('--email'));
    forbidden.push(intake.email);
    const replay = await call(target, '/api/studio/brand-orders', { method: 'POST', body: intake, key: state.requestKey });
    step('replay_same_request', { status: replay.status, code: replay.json?.error?.code ?? null, createdSecondCheckout: replay.status === 201 });
  } else step('replay_same_request', { skipped: 'pass --email with the same address to replay the paid intake' });
}

async function refund(target) {
  requireFlag(argv, '--confirm-test-refund');
  const state = await loadState(target);
  if (state.host !== target.host) throw new AcceptanceRefusal('state_is_for_another_host');
  forbidden.push(state.accessToken, state.checkoutUrl);
  evidence.orderId = state.orderId;
  await preflight(target, false);
  const answer = await call(target, `/api/studio/orders/${state.orderId}/refund`, { method: 'POST', token: state.accessToken, body: { confirmed: true } });
  step('refund', { status: answer.status, code: answer.json?.error?.code ?? null, refundStatus: answer.json?.refundStatus ?? null, paymentStatus: answer.json?.paymentStatus ?? null });
}

try {
  if (!['preflight', 'create', 'observe', 'refund'].includes(command) || !option('--url')) { console.log(USAGE); process.exit(command ? 2 : 0); }
  const target = acceptanceTarget(option('--url'));
  evidence.host = target.host;
  if (command === 'preflight') await preflight(target, false);
  if (command === 'create') await create(target);
  if (command === 'observe') await observe(target);
  if (command === 'refund') await refund(target);
  evidence.outcome = 'completed';
} catch (error) {
  evidence.outcome = error instanceof AcceptanceRefusal ? `refused:${error.code}` : 'failed';
  console.error(error instanceof AcceptanceRefusal ? `REFUSED ${error.message}` : `FAILED ${error instanceof Error ? error.name : 'error'}`);
  process.exitCode = 1;
} finally {
  if (evidence.host) {
    try {
      evidence.finishedAt = new Date().toISOString();
      const file = resolve('artifacts/acceptance', `brand-${command}-${evidence.startedAt.replace(/[:.]/g, '-')}.json`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(assertEvidenceClean(evidence, forbidden), null, 2));
      console.log(`Evidence written to ${file}`);
    } catch (error) { console.error(`Evidence not written: ${error instanceof AcceptanceRefusal ? error.code : 'write_failed'}`); process.exitCode = 1; }
  }
}
