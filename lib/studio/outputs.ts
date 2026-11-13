import { PAID_BRAND_KIT_VERSION, type PaidBrandKit } from '../brand-kit/synthesis';
import { StudioError } from './errors';
import { STUDIO_PRODUCT, type StudioBundle, type StudioOrderRow } from './types';

type SavedOrder = Pick<StudioOrderRow, 'product_version' | 'output'>;

const mismatch = () => new StudioError('output_version_mismatch', 'This saved package does not match its order and needs a service review.', 409);

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A saved output is only ever read as the schema of the product version persisted on its order.
 * These are the single places that narrow the stored JSON, so no renderer can be handed another
 * product's package.
 */
export function marketingBundleOf(order: SavedOrder): StudioBundle {
  if (order.product_version !== STUDIO_PRODUCT.version || !record(order.output) || order.output.schemaVersion !== 1) throw mismatch();
  return order.output as unknown as StudioBundle;
}

export function brandKitOf(order: SavedOrder): PaidBrandKit {
  if (order.product_version !== PAID_BRAND_KIT_VERSION || !record(order.output) || order.output.schemaVersion !== PAID_BRAND_KIT_VERSION
    || !record(order.output.foundation) || !record(order.output.synthesis) || order.output.requiresCustomerReview !== true) throw mismatch();
  return order.output as unknown as PaidBrandKit;
}
