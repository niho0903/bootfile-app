import { brandBackbriefSnapshot, type BrandInput } from './kit';
import type { PAID_BRAND_KIT_VERSION } from './synthesis';

/**
 * The browser's half of paid Brand & AI Kit checkout. It imports no server configuration and no
 * model code, reads every server answer as untrusted, and treats anything unexpected as closed.
 */
export const PAID_BRAND_KIT_CHECKOUT_VERSION: typeof PAID_BRAND_KIT_VERSION = 'brand-foundation-paid-v1';

const CONFIG_PATH = '/api/studio/brand-config';
const ORDERS_PATH = '/api/studio/brand-orders';
const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC = 'We couldn’t open checkout. Please try again. You haven’t been charged.';

/** Its message is written for the customer and is safe to show. */
export class BrandCheckoutError extends Error {}

export interface BrandKitCheckoutConfig {
  checkoutEnabled: boolean;
  reasonCode?: 'temporarily_full' | 'checkout_unavailable';
  productName: string;
  productDescription: string;
  priceFormatted: string;
  /** True when the server reports Stripe test keys. No real payment can be taken. */
  testMode?: boolean;
}
export interface BrandKitCheckoutPayload {
  productVersion: typeof PAID_BRAND_KIT_VERSION;
  brand: BrandInput;
  email: string;
  acceptedTerms: true;
  approvedBackbrief: true;
  approvalSnapshot: string;
}
export interface BrandKitCheckoutResult { orderId: string; accessToken: string; checkoutUrl: string }

export const BRAND_KIT_CHECKOUT_CLOSED: BrandKitCheckoutConfig = { checkoutEnabled: false, reasonCode: 'checkout_unavailable', productName: '', productDescription: '', priceFormatted: '' };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function shortText(value: unknown, limit: number): string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit ? value : '';
}

/** Open only when the server says so and also supplies the name, description and price the customer will be shown. */
export function parseBrandKitCheckoutConfig(data: unknown): BrandKitCheckoutConfig {
  if (!record(data)) return BRAND_KIT_CHECKOUT_CLOSED;
  const productName = shortText(data.productName, 80);
  const productDescription = shortText(data.productDescription, 300);
  const priceFormatted = shortText(record(data.price) ? data.price.formatted : '', 12);
  const described = !!productName && !!productDescription && !!priceFormatted && data.productVersion === PAID_BRAND_KIT_CHECKOUT_VERSION;
  if (data.checkoutEnabled === true && described) return { checkoutEnabled: true, productName, productDescription, priceFormatted, ...(data.paymentMode === 'test' ? { testMode: true } : {}) };
  return { checkoutEnabled: false, reasonCode: data.checkoutEnabled !== true && data.reasonCode === 'temporarily_full' ? 'temporarily_full' : 'checkout_unavailable', productName, productDescription, priceFormatted };
}

/** Sends nothing about the customer. Any failure reads as closed. */
export async function loadBrandKitCheckoutConfig(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<BrandKitCheckoutConfig> {
  try {
    const response = await fetcher(CONFIG_PATH, { cache: 'no-store', signal });
    if (!response.ok) return BRAND_KIT_CHECKOUT_CLOSED;
    return parseBrandKitCheckoutConfig(await response.json());
  } catch { return BRAND_KIT_CHECKOUT_CLOSED; }
}

/**
 * Builds the paid intake from the answers on screen. It refuses unless the stored approval still
 * describes those answers exactly, so nothing the customer has not reviewed can be bought.
 */
export function brandKitCheckoutPayload(options: { input: BrandInput; approvalSnapshot: string; email: string; acceptedTerms: boolean }): BrandKitCheckoutPayload {
  if (!options.approvalSnapshot || options.approvalSnapshot !== brandBackbriefSnapshot(options.input)) {
    throw new BrandCheckoutError('Your answers changed after you approved them. Review and approve your foundation again before paying.');
  }
  const email = options.email.trim();
  if (email.length < 5 || email.length > 254 || !EMAIL.test(email)) throw new BrandCheckoutError('Enter a valid delivery email address.');
  if (options.acceptedTerms !== true) throw new BrandCheckoutError('Please accept the Terms to continue.');
  return { productVersion: PAID_BRAND_KIT_CHECKOUT_VERSION, brand: options.input, email, acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: options.approvalSnapshot };
}

/** The browser is sent only to Stripe's own hosted checkout, never to an address a response merely claims. */
export function trustedBrandKitCheckout(data: unknown): BrandKitCheckoutResult {
  if (!record(data) || typeof data.orderId !== 'string' || !ORDER_ID.test(data.orderId) || typeof data.accessToken !== 'string' || data.accessToken.length < 20 || data.accessToken.length > 200 || typeof data.checkoutUrl !== 'string' || data.checkoutUrl.length > 2000) throw new BrandCheckoutError(GENERIC);
  let url: URL;
  try { url = new URL(data.checkoutUrl); } catch { throw new BrandCheckoutError(GENERIC); }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password || url.port) throw new BrandCheckoutError(GENERIC);
  return { orderId: data.orderId, accessToken: data.accessToken, checkoutUrl: url.href };
}

/** One POST. The same request key must be reused when the same payload is retried. */
export async function requestBrandKitCheckout(payload: BrandKitCheckoutPayload, requestKey: string, fetcher: typeof fetch = fetch): Promise<BrandKitCheckoutResult> {
  let response: Response;
  try {
    response = await fetcher(ORDERS_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }, body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  } catch { throw new BrandCheckoutError('We couldn’t reach checkout. Check your connection and try again. You haven’t been charged.'); }
  let data: unknown = null;
  try { data = await response.json(); } catch { /* Handled below as an unusable answer. */ }
  if (!response.ok) {
    const message = record(data) && record(data.error) ? shortText(data.error.message, 300) : '';
    throw new BrandCheckoutError(message || GENERIC);
  }
  return trustedBrandKitCheckout(data);
}
