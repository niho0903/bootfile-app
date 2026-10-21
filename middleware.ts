import { NextRequest, NextResponse } from 'next/server';
// Keep middleware self-contained for the Edge bundler. The application-level
// privacy helpers and rate limiter remain available to Node route handlers.
const rateStore = new Map<string, number[]>();
let lastRateStoreCleanup = 0;
const RATE_STORE_RETENTION_MS = 3_600_000; // Longest configured rate-limit window
function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  // Retain entries from longer windows even when a one-minute endpoint triggers cleanup.
  if (now - lastRateStoreCleanup >= 60_000) {
    const oldestNeeded = now - RATE_STORE_RETENTION_MS;
    for (const [entryKey, timestamps] of rateStore) {
      const current = timestamps.filter(timestamp => timestamp > oldestNeeded);
      if (current.length) rateStore.set(entryKey, current);
      else rateStore.delete(entryKey);
    }
    lastRateStoreCleanup = now;
  }
  const cutoff = now - windowMs;
  const recent = (rateStore.get(key) ?? []).filter(timestamp => timestamp > cutoff);
  if (recent.length >= maxRequests) {
    rateStore.set(key, recent);
    return { allowed: false, resetMs: Math.max(1, recent[0] + windowMs - now) };
  }
  recent.push(now);
  rateStore.set(key, recent);
  return { allowed: true, resetMs: windowMs };
}
function isPrivatePath(pathname: string): boolean {
  return ['/api/', '/operations', '/admin', '/build', '/bootfile', '/result', '/brand'].some(prefix => pathname.startsWith(prefix))
    || (pathname.startsWith('/studio') && !['/studio/sample', '/studio/sample/'].includes(pathname));
}

// Rate limit configs per route pattern
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/generate':              { max: 5,   windowMs: 3600_000 },
  '/api/generate-preview':      { max: 5,   windowMs: 3600_000 },
  '/api/generate-full':         { max: 5,   windowMs: 3600_000 },
  '/api/create-payment-intent': { max: 10,  windowMs: 3600_000 },
  '/api/verify-session': { max: 20,  windowMs: 60_000 },
  '/api/track-quiz':     { max: 10,  windowMs: 60_000 },
  '/api/track-purchase': { max: 10,  windowMs: 60_000 },
  '/api/track-platform': { max: 30,  windowMs: 60_000 },
  '/api/upgrade':        { max: 5,   windowMs: 3600_000 },
  '/api/simulator':              { max: 3,   windowMs: 3600_000 },
  '/api/admin/generate-content': { max: 20, windowMs: 3600_000 },
  '/api/admin/drafts':           { max: 60, windowMs: 60_000 },
  '/api/admin/publish':          { max: 20, windowMs: 3600_000 },
  '/api/send-bootfile':          { max: 5,  windowMs: 3600_000 },
  '/api/studio/orders':         { max: 5,  windowMs: 3600_000 },
  '/api/studio/config':         { max: 120, windowMs: 60_000 },
  '/api/studio/order-access':   { max: 90, windowMs: 60_000 },
  '/api/studio/checkout':       { max: 10, windowMs: 3600_000 },
  '/api/studio/refund':         { max: 5, windowMs: 3600_000 },
  '/api/operations':            { max: 30, windowMs: 60_000 },
};
function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-DNS-Prefetch-Control': 'off',
};
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const privatePath = isPrivatePath(pathname);
  const headers = { ...SECURITY_HEADERS, ...(privatePath ? {
    'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } : {}) };
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(req);
    const ratePath = pathname.startsWith('/api/operations/') ? '/api/operations'
      : /^\/api\/studio\/orders\/[^/]+\/refund$/.test(pathname) ? '/api/studio/refund'
      : /^\/api\/studio\/orders\/[^/]+\/checkout$/.test(pathname) ? '/api/studio/checkout'
      : pathname.startsWith('/api/studio/orders/') ? '/api/studio/order-access' : pathname;
    const limitConfig = RATE_LIMITS[ratePath];
    if (limitConfig) {
      const result = checkRateLimit(`${ratePath}:${ip}`, limitConfig.max, limitConfig.windowMs);
      if (!result.allowed) return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(result.resetMs / 1000)), ...headers },
      });
    }
    // Webhooks verify signatures; operations endpoints verify their own non-cookie bearer secret.
    const serverAuthenticatedRoute = pathname.startsWith('/api/webhooks/')
      || (pathname.startsWith('/api/operations/') && /^Bearer \S+$/.test(req.headers.get('authorization') || ''));
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !serverAuthenticatedRoute) {
      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const sameOrigin = (value: string | null) => {
        if (!value) return false;
        try {
          const supplied = new URL(value);
          if (supplied.origin === req.nextUrl.origin) return true;
          // Preserve the tested request-Host fallback for Next's localhost normalization.
          const requestHost = req.headers.get('host');
          return !!requestHost && supplied.host.toLowerCase() === requestHost.toLowerCase() && supplied.protocol === req.nextUrl.protocol;
        } catch { return false; }
      };
      if (!(origin ? sameOrigin(origin) : sameOrigin(referer))) return new NextResponse(JSON.stringify({ error: 'Forbidden.' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...headers },
      });
    }
    if (req.method === 'POST') {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 65536) return new NextResponse(JSON.stringify({ error: 'Request too large.' }), {
        status: 413, headers: { 'Content-Type': 'application/json', ...headers },
      });
    }
  }
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  if (req.nextUrl.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
