import { PAID_BRAND_KIT_VERSION } from '../brand-kit/synthesis';
import { StudioError } from './errors';
import { STUDIO_PRODUCT } from './types';

/**
 * Every paid product version the commerce layer may bind a payment, refund or checkout to.
 * The version persisted on an order selects its entry; a request or the current default never does.
 * Name and description appear on the customer's Stripe checkout page, so changing them changes a
 * customer promise.
 */
export interface StudioProductDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  formatted: string;
}

export const BRAND_KIT_PRODUCT: StudioProductDefinition = {
  id: 'bootfile_brand_ai_kit',
  version: PAID_BRAND_KIT_VERSION,
  name: 'Bootfile Brand & AI Kit',
  description: 'A brand foundation, voice guide, visual starter kit, AI working instructions, and a first campaign.',
  amount: 4900,
  currency: 'usd',
  formatted: '$49',
};

const PRODUCTS: readonly StudioProductDefinition[] = [
  { ...STUDIO_PRODUCT, description: 'One promotional email, three social posts, an approved business brief, and a reusable AI workflow.' },
  BRAND_KIT_PRODUCT,
];

export function studioProductOrNull(version: unknown): StudioProductDefinition | null {
  return PRODUCTS.find(product => product.version === version) ?? null;
}

export function studioProductForVersion(version: string): StudioProductDefinition {
  const product = studioProductOrNull(version);
  if (!product) throw new StudioError('product_version_unsupported', 'This order was created for a product version this service cannot process.', 409);
  return product;
}

/** Stripe metadata carries the product id. An id this service does not sell is not its event. */
export function studioProductById(id: unknown): StudioProductDefinition | null {
  return PRODUCTS.find(product => product.id === id) ?? null;
}

export const STUDIO_PRODUCT_DEFINITIONS = PRODUCTS;
