import { NextRequest, NextResponse } from 'next/server';
import { isGrowthAgentAuthorized } from '@/lib/operations/auth';
import { growthDraftId, readGrowthBody, validateGrowthDraft } from '@/lib/operations/growth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isGrowthAgentAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = growthDraftId(request.nextUrl.searchParams.get('channel') || '', request.nextUrl.searchParams.get('jobKey') || '');
  if (!id) return NextResponse.json({ error: 'Invalid draft key' }, { status: 400 });
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: 'Draft storage unavailable' }, { status: 503 });
  const { data, error } = await client.from('content_drafts').select('id,status,created_at').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Draft storage query failed' }, { status: 503 });
  return NextResponse.json({ exists: Boolean(data), draft: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  if (!isGrowthAgentAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await readGrowthBody(request.body);
  if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: payload.status });
  const result = validateGrowthDraft(payload.body);
  if ('error' in result) return NextResponse.json(result, { status: 400 });
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: 'Draft storage unavailable' }, { status: 503 });
  const { error } = await client.from('content_drafts').upsert({
    id: result.id, channel: result.channel, status: 'pending', content: result.content, metadata: result.metadata,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: 'Draft could not be persisted' }, { status: 503 });
  return NextResponse.json({ id: result.id, persisted: true, publicationAuthority: 'draft-only' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
