import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Fetch bootfile versions
  const { data: bootfiles, error: bfError } = await supabase
    .from('bootfile_versions')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (bfError) {
    console.error('[ADMIN LOOKUP] bootfile_versions error:', bfError.message);
  }

  // Fetch purchases
  const { data: purchases, error: pError } = await supabase
    .from('purchases')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (pError) {
    console.error('[ADMIN LOOKUP] purchases error:', pError.message);
  }

  // Fetch quiz completions linked to purchases
  const quizIds = (purchases || [])
    .map((p) => p.quiz_completion_id)
    .filter(Boolean);

  let quizCompletions: Record<string, unknown>[] = [];
  if (quizIds.length > 0) {
    const { data: quizData } = await supabase
      .from('quiz_completions')
      .select('*')
      .in('id', quizIds);
    quizCompletions = quizData || [];
  }

  return NextResponse.json({
    email,
    bootfiles: bootfiles || [],
    purchases: purchases || [],
    quizCompletions,
  });
}
