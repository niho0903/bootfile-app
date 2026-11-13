// Guards for the hosted acceptance script. Pure functions with no network or file access, so every
// refusal can be unit-tested. The script may create one synthetic order in provider test modes and nothing else.
import { createHash } from 'node:crypto';

export const PAID_BRAND_KIT_VERSION = 'brand-foundation-paid-v1';
/** Hosts that serve customers. The script never sends them a request. */
export const PRODUCTION_HOSTS = ['bootfile.ai', 'www.bootfile.ai', 'bootfile-app.vercel.app'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The exact canonical brief of a fictional business. It is its own approval snapshot. */
export const SYNTHETIC_BRAND_SNAPSHOT = "{\"answers\":{\"Q1\":\"B\",\"Q2\":\"B\",\"Q3\":\"B\",\"Q4\":\"B\",\"Q5\":\"B\",\"Q6\":\"B\",\"Q7\":\"B\",\"Q8\":\"B\"},\"stage\":\"new\",\"businessName\":\"Juniper Home Organizing (acceptance test)\",\"description\":\"We help households sort everyday spaces and create practical organizing systems using the storage they already own.\",\"audience\":\"Busy households who want a kitchen that is easier to use.\",\"difference\":\"We begin with everyday routines and existing storage, not a shopping list.\",\"proof\":\"This is a synthetic acceptance-test order for a fictional business. No customer results or certifications are claimed.\",\"voice\":\"warm\",\"voiceNotes\":\"Warm, practical and encouraging. A home need not look like a showroom.\",\"avoid\":\"No guilt, countdowns, invented discounts or promises of a transformation.\",\"palette\":\"sage\",\"background\":\"#F5F2E9\",\"ink\":\"#243A30\",\"accent\":\"#7A8F72\",\"headingFont\":\"\",\"bodyFont\":\"\",\"offer\":\"A practical kitchen reset\",\"facts\":\"The session covers sorting kitchen items and arranging everyday essentials. We use existing storage. Pricing and availability are discussed before booking.\",\"callToAction\":\"Reply KITCHEN to ask about a kitchen reset.\"}";

export class AcceptanceRefusal extends Error {
  constructor(code, detail = '') { super(detail ? `${code}: ${detail}` : code); this.code = code; }
}
const refuse = (code, detail) => { throw new AcceptanceRefusal(code, detail); };

/** Accepts only a bare origin that is local or a Vercel-generated address and is not a known production host. */
export function acceptanceTarget(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { refuse('target_url_invalid'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') refuse('target_must_be_a_bare_origin');
  const host = url.hostname.toLowerCase();
  const local = LOCAL_HOSTS.includes(host);
  if (!local && url.protocol !== 'https:') refuse('target_must_use_https');
  if (PRODUCTION_HOSTS.includes(host) || host === 'bootfile.ai' || host.endsWith('.bootfile.ai')) refuse('target_is_production', host);
  if (!local && !host.endsWith('.vercel.app')) refuse('target_host_not_allowed', host);
  if (/-git-(master|main)-/.test(host)) refuse('target_is_production_branch', host);
  return { origin: url.origin, host, local };
}

/** Every reason the server's own readiness answer rules this run out. An empty list means it may proceed. */
export function preflightRefusals(target, config, { needsOpenCheckout }) {
  const reasons = [];
  if (!config || typeof config !== 'object') return ['config_unreadable'];
  const allowed = target.local ? ['local', 'development'] : ['preview'];
  if (!allowed.includes(config.deployment)) reasons.push(`deployment_is_${String(config.deployment)}`);
  if (config.paymentMode !== 'test') reasons.push(`payment_mode_is_${String(config.paymentMode)}`);
  if (config.productVersion !== PAID_BRAND_KIT_VERSION) reasons.push('product_version_mismatch');
  if (config.price?.amount !== 4900 || config.price?.currency !== 'usd') reasons.push('price_mismatch');
  if (needsOpenCheckout && config.checkoutEnabled !== true) reasons.push(`checkout_closed_${String(config.reasonCode || 'unknown')}`);
  return reasons;
}

/** A second, independent check after the order exists: the session itself must be a Stripe test session. */
export function testCheckout(result) {
  if (!result || typeof result !== 'object' || typeof result.orderId !== 'string' || !ORDER_ID.test(result.orderId) || typeof result.accessToken !== 'string' || result.accessToken.length < 20 || typeof result.checkoutUrl !== 'string') refuse('checkout_answer_invalid');
  let url;
  try { url = new URL(result.checkoutUrl); } catch { refuse('checkout_url_invalid'); }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') refuse('checkout_url_not_stripe');
  if (url.pathname.includes('cs_live_')) refuse('live_checkout_session');
  if (!url.pathname.includes('cs_test_')) refuse('checkout_session_not_test');
  return { orderId: result.orderId, accessToken: result.accessToken, checkoutUrl: url.href };
}

export function requireFlag(argv, flag) {
  if (!argv.includes(flag)) refuse('confirmation_required', `pass ${flag} to proceed`);
}

export function syntheticIntake(email) {
  const address = String(email || '').trim();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) || address.length > 254) refuse('delivery_email_required', 'pass --email with an inbox you control');
  return { productVersion: PAID_BRAND_KIT_VERSION, brand: JSON.parse(SYNTHETIC_BRAND_SNAPSHOT), email: address, acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: SYNTHETIC_BRAND_SNAPSHOT };
}

/** A Vercel sign-in wall, as opposed to an answer from the application. */
export function isProtectionWall(status, contentType, body) {
  return status === 401 && /text\/html/i.test(contentType || '') && /vercel/i.test(body || '');
}

export const digest = value => createHash('sha256').update(String(value)).digest('hex');

/** Evidence must never carry a secret, the delivery address, the access token or the payment address. */
export function assertEvidenceClean(evidence, forbidden) {
  const text = JSON.stringify(evidence);
  for (const value of forbidden) if (typeof value === 'string' && value.length >= 6 && text.includes(value)) refuse('evidence_contains_private_value');
  if (/cs_(test|live)_|whsec_|sk_(test|live)_|rk_(test|live)_|access_token|@/.test(text)) refuse('evidence_contains_private_pattern');
  return evidence;
}

/** State holds the order's private access token, so it may not live inside the repository. */
export function statePathAllowed(statePath, repoRoot, separator = '/') {
  const root = repoRoot.endsWith(separator) ? repoRoot : repoRoot + separator;
  return statePath !== repoRoot && !statePath.startsWith(root);
}
