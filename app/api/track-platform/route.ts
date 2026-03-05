import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, platform } = body;

    if (!quizId || !platform) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    // Update the most recent purchase for this quiz with the selected platform
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
