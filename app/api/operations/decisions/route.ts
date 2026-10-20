import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid decision update' }, { status: 400 });
  const { id, status, note } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !['open', 'acknowledged', 'resolved'].includes(String(status))) {
    return NextResponse.json({ error: 'A valid decision and status are required' }, { status: 400 });
  }
  if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) return NextResponse.json({ error: 'The note must be at most 2,000 characters' }, { status: 400 });

  // Recording a review never authorizes spending, deploys a change, or sends a message.
  const { data, error } = await client.from('operations_decisions').update({
    status, ...(note !== undefined ? { owner_note: (note as string).trim() || null } : {}),
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', id).select('id,status').maybeSingle();
  if (error) return NextResponse.json({ error: 'The decision could not be saved. Check the operating ledger.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  return NextResponse.json({ decision: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
