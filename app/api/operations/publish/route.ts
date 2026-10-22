import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isGrowthPublisherAuthorized } from '@/lib/operations/auth';
import { runOwnedBlogPublishing } from '@/lib/operations/publishing';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { readGrowthBody } from '@/lib/operations/growth';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  if (!isGrowthPublisherAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runOwnedBlogPublishing();
    if (result.status === 'published' && result.slug) {
      revalidatePath('/blog');
      revalidatePath(`/blog/${result.slug}`);
      revalidatePath('/sitemap.xml');
    }
    return NextResponse.json(result, { status: result.status === 'failed' ? 503 : 200, headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ status: 'failed', reason: 'publication_unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

/** A reviewed operator can withdraw an unchanged article; the growth credential cannot. */
export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await readGrowthBody(request.body);
  if ('error' in payload) return NextResponse.json({ error: payload.error }, { status: payload.status });
  const body = payload.body as { id?: unknown; action?: unknown } | null;
  if (!body || body.action !== 'withdraw' || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: 'An exact publication ID and withdraw action are required' }, { status: 400 });
  }
  const client = getSupabaseAdmin();
  if (!client) return NextResponse.json({ error: 'Publication storage unavailable' }, { status: 503 });
  const { data, error } = await client.rpc('withdraw_growth_article', { p_id: body.id });
  if (error) return NextResponse.json({ error: 'Withdrawal was not confirmed' }, { status: 503 });
  if (data?.withdrawn === true && typeof data.slug === 'string') {
    revalidatePath('/blog');
    revalidatePath(`/blog/${data.slug}`);
    revalidatePath('/sitemap.xml');
  }
  return NextResponse.json(data, { status: data?.withdrawn === true ? 200 : 409, headers: { 'Cache-Control': 'private, no-store' } });
}
