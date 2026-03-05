import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidPlatform } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, platform } = body;

    // Validate inputs
    if (!quizId || typeof quizId !== 'string' || !/^[0-9a-f-]{36}$/i.test(quizId)) {
      return NextResponse.json({ ok: true });
    }
    if (!isValidPlatform(platform)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('purchases')
      .update({ primary_platform: platform })
      .eq('quiz_completion_id', quizId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('track-platform update error:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('track-platform error:', e);
    return NextResponse.json({ ok: true });
  }
}
