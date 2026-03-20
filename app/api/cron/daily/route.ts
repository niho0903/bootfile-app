import { NextResponse } from 'next/server';

/**
 * Daily cron — runs every day at 2pm UTC.
 * Dispatches to the appropriate task based on day of week:
 *
 *   Monday    — Generate blog (comparison pillar)
 *   Tuesday   — Generate Reddit content
 *   Wednesday — Refresh declining blog content
 *   Thursday  — Generate blog (guide pillar)
 *   Friday    — Generate Reddit content
 *   Sat/Sun   — Email drip only
 *
 * Email drip runs every day regardless.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;
  const secret = process.env.CRON_SECRET!;
  const headers = { Authorization: `Bearer ${secret}` };

  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const results: Record<string, unknown> = {};

  // Always run email drip
  try {
    const res = await fetch(`${baseUrl}/api/cron/email-drip`, { headers });
    results.emailDrip = await res.json();
  } catch (err) {
    results.emailDrip = { error: err instanceof Error ? err.message : 'failed' };
  }

  // Day-specific tasks
  if (day === 1 || day === 4) {
    // Monday or Thursday — generate blog
    const url = new URL(`${baseUrl}/api/cron/generate-blog`);
    try {
      const res = await fetch(url.toString(), { headers });
      results.blog = await res.json();
    } catch (err) {
      results.blog = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  if (day === 2 || day === 5) {
    // Tuesday or Friday — generate Reddit content
    try {
      const res = await fetch(`${baseUrl}/api/cron/generate-reddit`, { headers });
      results.reddit = await res.json();
    } catch (err) {
      results.reddit = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  if (day === 3) {
    // Wednesday — refresh content
    try {
      const res = await fetch(`${baseUrl}/api/cron/refresh-content`, { headers });
      results.refresh = await res.json();
    } catch (err) {
      results.refresh = { error: err instanceof Error ? err.message : 'failed' };
    }
  }

  return NextResponse.json({ day, results });
}
