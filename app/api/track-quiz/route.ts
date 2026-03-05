import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { categorizeOpenResponse, detectTone } from '@/lib/text-categorizer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { primary, secondary, tertiary, lowest, openResponse, consentGiven } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      // Supabase not configured — return success so UI isn't blocked
      return NextResponse.json({ ok: true, quizId: null });
    }

    const categories = openResponse ? categorizeOpenResponse(openResponse) : [];
    const tone = openResponse ? detectTone(openResponse) : null;

    const { data, error } = await supabase
      .from('quiz_completions')
      .insert({
        primary_archetype: primary,
        secondary_archetype: secondary || null,
        tertiary_archetype: tertiary || null,
        lowest_archetypes: lowest || [],
        open_response: consentGiven ? (openResponse || null) : null,
        consent_given: consentGiven || false,
        frustration_categories: categories,
        detected_tone: tone,
      })
      .select('id')
      .single();

    if (error) {
      console.error('track-quiz insert error:', error.message);
      return NextResponse.json({ ok: true, quizId: null });
    }

    return NextResponse.json({ ok: true, quizId: data.id });
  } catch (e) {
    console.error('track-quiz error:', e);
    return NextResponse.json({ ok: true, quizId: null });
  }
}
