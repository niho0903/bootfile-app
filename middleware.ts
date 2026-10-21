import { NextRequest, NextResponse } from 'next/server';
// Keep middleware self-contained for the Edge bundler. The application-level
// privacy helpers and rate limiter remain available to Node route handlers.
const rateStore = new Map<string, number[]>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (rateStore.get(key) ?? []).filter(t => t > cutoff);
  if (recent.length >= maxRequests) return { allowed: false, resetMs: Math.max(1, recent[0] + windowMs - now) };
  recent.push(now);
  rateStore.set(key, recent);
  return { allowed: true, resetMs: windowMs };
}
function isPrivatePath(pathname: string): boolean {
  return ['/api/', '/operations', '/admin', '/build', '/bootfile', '/result'].some(prefix => pathname.startsWith(prefix))
    || (pathname.startsWith('/studio') && !['/studio/sample', '/studio/sample/'].includes(pathname));
}

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
  '/api/simulator':              { max: 3,   windowMs: 3600_000 },  // 3/hour
  '/api/admin/generate-content': { max: 20, windowMs: 3600_000 }, // 20/hour
  '/api/admin/drafts':           { max: 60, windowMs: 60_000 },   // 60/min
  '/api/admin/publish':          { max: 20, windowMs: 3600_000 }, // 20/hour
  '/api/send-bootfile':          { max: 5,  windowMs: 3600_000 }, // 5/hour
  '/api/studio/orders':         { max: 5,  windowMs: 3600_000 },
  '/api/studio/config':         { max: 120, windowMs: 60_000 },
  '/api/studio/order-access':   { max: 90, windowMs: 60_000 },
  '/api/studio/checkout':       { max: 10, windowMs: 3600_000 },
  '/api/studio/refund':         { max: 5, windowMs: 3600_000 },
  '/api/operations':            { max: 30, windowMs: 60_000 },
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
  const privatePath = isPrivatePath(pathname);
  const headers = {
    ...SECURITY_HEADERS,
    ...(privatePath ? {
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    } : {}),
  };

  // --- API route protection ---
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(req);

    // Rate limiting
    const ratePath = pathname.startsWith('/api/operations/') ? '/api/operations'
      : /^\/api\/studio\/orders\/[^/]+\/refund$/.test(pathname) ? '/api/studio/refund'
      : /^\/api\/studio\/orders\/[^/]+\/checkout$/.test(pathname) ? '/api/studio/checkout'
      : pathname.startsWith('/api/studio/orders/') ? '/api/studio/order-access'
      : pathname;
    // This is a per-instance first filter. Studio order creation also has durable DB limits.
    const limitConfig = RATE_LIMITS[ratePath];
    if (limitConfig) {
      const key = `${ratePath}:${ip}`;
      const result = checkRateLimit(key, limitConfig.max, limitConfig.windowMs);

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(result.resetMs / 1000)),
              ...headers,
            },
          },
        );
      }
    }

    // Origin/Referer check for mutating endpoints (CSRF protection)
    // Webhooks verify provider signatures; operations verifies a non-cookie bearer secret.
    const serverAuthenticatedRoute = pathname.startsWith('/api/webhooks/')
      || (pathname.startsWith('/api/operations/') && /^Bearer \S+$/.test(req.headers.get('authorization') || ''));
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) &&
        !serverAuthenticatedRoute) {
      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const sameOrigin = (value: string | null) => {
        if (!value) return false;
        try { return new URL(value).origin === req.nextUrl.origin; }
        catch { return false; }
      };

      if (!(origin ? sameOrigin(origin) : sameOrigin(referer))) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden.' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...headers },
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
            headers: { 'Content-Type': 'application/json', ...headers },
          },
        );
      }
    }
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
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
