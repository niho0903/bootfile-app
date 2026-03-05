import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, domain, technicalLevel, primaryUse, decisionStyle, responseLength } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    // Insert purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        quiz_completion_id: quizId || null,
        domain: domain || null,
        technical_level: technicalLevel ?? null,
        primary_use: primaryUse || null,
        decision_style: decisionStyle || null,
        response_length: responseLength || null,
      });

    if (purchaseError) {
      console.error('track-purchase insert error:', purchaseError.message);
    }

    // Update quiz_completions.purchased flag
    if (quizId) {
      const { error: updateError } = await supabase
        .from('quiz_completions')
        .update({ purchased: true })
        .eq('id', quizId);

      if (updateError) {
        console.error('track-purchase update error:', updateError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('track-purchase error:', e);
    return NextResponse.json({ ok: true });
  }
}
