import { timingSafeEqual } from 'node:crypto';

export function isCronAuthorized(request: Request): boolean {
  return hasBearerSecret(request, process.env.CRON_SECRET);
}

export function isGrowthAgentAuthorized(request: Request): boolean {
  return hasBearerSecret(request, process.env.GROWTH_AGENT_SECRET);
}

export function isGrowthPublisherAuthorized(request: Request): boolean {
  return hasBearerSecret(request, process.env.GROWTH_PUBLISHER_SECRET);
}

function hasBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const supplied = request.headers.get('authorization');
  if (!supplied?.startsWith('Bearer ')) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
