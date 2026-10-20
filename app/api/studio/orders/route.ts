import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createStudioCheckout } from '@/lib/studio/checkout';
import { StudioError } from '@/lib/studio/errors';
import { readStudioText, studioErrorResponse, studioJson } from '@/lib/studio/http';
import { validateStudioIntake } from '@/lib/studio/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`studio-checkout:${ip}`, 10, 3600_000).allowed) throw new StudioError('order_rate_limited', 'Too many checkout attempts. Please try again later.', 429);
    const raw = await readStudioText(request, 20_000);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new StudioError('invalid_intake', 'Please complete the business brief.', 400); }
    const intake = validateStudioIntake(body);
    const checkout = await createStudioCheckout(intake, request.headers.get('idempotency-key') || '', ip);
    return studioJson(checkout, 201);
  } catch (error) { return studioErrorResponse(error); }
}
