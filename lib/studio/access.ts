import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { StudioError } from './errors';

export const STUDIO_ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tokenSecret(): string {
  const secret = process.env.STUDIO_ACCESS_TOKEN_SECRET || '';
  if (secret.length < 32) throw new StudioError('access_configuration_missing', 'The private delivery service is unavailable.');
  return secret;
}

/** Deterministic private capability; only its hash is persisted. No email or intake enters the token. */
export function createStudioAccessToken(orderId: string): string {
  if (!STUDIO_ORDER_ID_PATTERN.test(orderId)) throw new StudioError('invalid_order', 'Order not found.', 404);
  return createHmac('sha256', tokenSecret()).update(`bootfile:studio:access:v1:${orderId}`).digest('base64url');
}

export function hashStudioAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyStudioAccessToken(token: string, storedHash: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashStudioAccessToken(token), 'hex'), Buffer.from(storedHash, 'hex'));
}

export function studioRequestHash(value: string, purpose: 'ip' | 'email'): string {
  return createHmac('sha256', tokenSecret()).update(`bootfile:studio:${purpose}:${value}`).digest('hex');
}

export function bearerStudioToken(request: Request): string {
  const value = request.headers.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) throw new StudioError('private_link_required', 'Open the private order link from this browser or your delivery email.', 401);
  return match[1];
}
