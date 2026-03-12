import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

// Rate limit configs per route pattern
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/generate':              { max: 5,   windowMs: 3600_000 },  // 5/hour
  '/api/generate-preview':      { max: 5,   windowMs: 3600_000 },  // 5/hour
  '/api/generate-full':         { max: 5,   windowMs: 3600_000 },  // 5/hour
  '/api/create-payment-intent': { max: 10,  windowMs: 3600_000 },  // 10/hour
  '/api/verify-session': { max: 20,  windowMs: 60_000 },    // 20/min
  '/api/track-quiz':     { max: 10,  windowMs: 60_000 },    // 10/min
  '/api/track-purchase': { max: 10,  windowMs: 60_000 },    // 10/min
  '/api/track-platform': { max: 30,  windowMs: 60_000 },    // 30/min
  '/api/upgrade':        { max: 5,   windowMs: 3600_000 },  // 5/hour
  '/api/admin/generate-content': { max: 20, windowMs: 3600_000 }, // 20/hour
  '/api/admin/drafts':           { max: 60, windowMs: 60_000 },   // 60/min
  '/api/admin/publish':          { max: 20, windowMs: 3600_000 }, // 20/hour
  '/api/send-bootfile':          { max: 5,  windowMs: 3600_000 }, // 5/hour
};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Security headers applied to all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- API route protection ---
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(req);

    // Rate limiting
    const limitConfig = RATE_LIMITS[pathname];
    if (limitConfig) {
      const key = `${pathname}:${ip}`;
      const result = checkRateLimit(key, limitConfig.max, limitConfig.windowMs);

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(result.resetMs / 1000)),
              ...SECURITY_HEADERS,
            },
          },
        );
      }
    }

    // Origin/Referer check for mutating endpoints (CSRF protection)
    // Skip for webhooks (Stripe calls from their servers)
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) &&
        !pathname.startsWith('/api/webhooks/')) {
      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const allowedHost = req.nextUrl.host;

      const originOk = origin && new URL(origin).host === allowedHost;
      const refererOk = referer && new URL(referer).host === allowedHost;

      if (!originOk && !refererOk) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden.' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
          },
        );
      }
    }

    // Body size limit for POST (64KB max — prevents oversized payloads)
    if (req.method === 'POST') {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 65536) {
        return new NextResponse(
          JSON.stringify({ error: 'Request too large.' }),
          {
            status: 413,
            headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
          },
        );
      }
    }
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // HSTS (only in production)
  if (req.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes and pages (skip static assets)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
