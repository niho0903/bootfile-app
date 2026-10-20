import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getOperationsSnapshot } from '@/lib/operations/health';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getOperationsSnapshot(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Operating status could not be loaded. Check database configuration and server logs.' }, {
      status: 503, headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
