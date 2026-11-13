import { assertBrandKitCheckoutConfigured, studioDailyGenerationLimit, studioDeployment, studioPaymentMode } from '@/lib/studio/config';
import { checkStudioProductSchema, studioCapacity } from '@/lib/studio/db';
import { studioJson } from '@/lib/studio/http';
import { BRAND_KIT_PRODUCT } from '@/lib/studio/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tells the Brand & AI Kit page whether to offer the paid kit. It reads nothing from the request and fails closed. */
export async function GET() {
  let checkoutEnabled = false;
  let temporarilyFull = false;
  try {
    assertBrandKitCheckoutConfigured();
    await checkStudioProductSchema();
    temporarilyFull = !(await studioCapacity(studioDailyGenerationLimit())).checkout_available;
    checkoutEnabled = !temporarilyFull;
  } catch { /* Readiness is intentionally fail-closed. */ }
  return studioJson({
    checkoutEnabled,
    ...(!checkoutEnabled ? {
      reasonCode: temporarilyFull ? 'temporarily_full' : 'checkout_unavailable',
      reason: temporarilyFull ? 'We are temporarily at capacity. Please check back shortly.' : 'The paid Brand & AI Kit is not open yet. You can keep exploring the preview while we finish testing.',
    } : {}),
    price: { amount: BRAND_KIT_PRODUCT.amount, currency: BRAND_KIT_PRODUCT.currency, formatted: BRAND_KIT_PRODUCT.formatted },
    productName: BRAND_KIT_PRODUCT.name,
    productDescription: BRAND_KIT_PRODUCT.description,
    productVersion: BRAND_KIT_PRODUCT.version,
    // Lets the page label a test checkout and lets the acceptance script refuse production before it sends anything.
    paymentMode: studioPaymentMode(),
    deployment: studioDeployment(),
  });
}
