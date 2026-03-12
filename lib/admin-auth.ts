import { NextRequest } from 'next/server';

export function isAdminAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[ADMIN] ADMIN_PASSWORD environment variable is not set');
    return false;
  }

  // Expect: "Bearer <password>"
  const token = authHeader.replace('Bearer ', '');
  return token === adminPassword;
}
