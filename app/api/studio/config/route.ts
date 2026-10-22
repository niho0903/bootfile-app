import { assertStudioCheckoutConfigured, studioDailyGenerationLimit } from '@/lib/studio/config';
import { checkStudioSchema, studioCapacity } from '@/lib/studio/db';
import { studioJson } from '@/lib/studio/http';
import { STUDIO_PRODUCT } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let checkoutEnabled = false;
  let temporarilyFull = false;
  try {
    assertStudioCheckoutConfigured();
    await checkStudioSchema();
    temporarilyFull = !(await studioCapacity(studioDailyGenerationLimit())).checkout_available;
    checkoutEnabled = !temporarilyFull;
  } catch { /* Readiness is intentionally fail-closed. */ }
  return studioJson({
    checkoutEnabled,
    ...(!checkoutEnabled ? {
      reasonCode: temporarilyFull ? 'temporarily_full' : 'checkout_unavailable',
      reason: temporarilyFull ? 'We are temporarily at capacity. Please check back shortly.' : 'Paid setups are not open yet. Explore the sample while we finish testing.',
    } : {}),
    price: { amount: STUDIO_PRODUCT.amount, currency: STUDIO_PRODUCT.currency, formatted: STUDIO_PRODUCT.formatted },
    productName: STUDIO_PRODUCT.name,
  });
}
