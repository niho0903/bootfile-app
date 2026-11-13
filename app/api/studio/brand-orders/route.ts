import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createBrandKitCheckout } from '@/lib/studio/checkout';
import { assertBrandKitCheckoutConfigured } from '@/lib/studio/config';
import { StudioError } from '@/lib/studio/errors';
import { readStudioText, studioErrorResponse, studioJson } from '@/lib/studio/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Paid Brand & AI Kit checkout. Closed by default: nothing is read from the request while either flag is off. */
export async function POST(request: NextRequest) {
  try {
    assertBrandKitCheckoutConfigured();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`brand-checkout:${ip}`, 10, 3600_000).allowed) throw new StudioError('order_rate_limited', 'Too many checkout attempts. Please try again later.', 429);
    // The largest accepted brief measures about 23 KB with its approval snapshot.
    const raw = await readStudioText(request, 40_000);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new StudioError('brand_intake_invalid', 'Please complete your brand brief.', 400); }
    const checkout = await createBrandKitCheckout(body, request.headers.get('idempotency-key') || '', ip);
    return studioJson(checkout, 201);
  } catch (error) { return studioErrorResponse(error); }
}
