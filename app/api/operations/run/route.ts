import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { isCronAuthorized } from '@/lib/operations/auth';
import { runOperations } from '@/lib/operations/runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function execute(source: 'cron' | 'owner') {
  try {
    const result = await runOperations(source);
    return NextResponse.json(result, {
      status: result.status === 'failed' ? 503 : 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ status: 'failed', reason: 'operations_unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return execute('cron');
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return execute('owner');
}
