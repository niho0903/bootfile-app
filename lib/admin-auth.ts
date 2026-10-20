import { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

export function isAdminAuthorized(req: NextRequest): boolean {
  const match = /^Bearer (\S+)$/.exec(req.headers.get('authorization') || '');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!match || !adminPassword) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(match[1]), hash(adminPassword));
}
