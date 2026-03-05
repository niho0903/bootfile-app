import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeString, sanitizeNumber, isValidDecisionStyle, isValidResponseLength } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, domain, technicalLevel, primaryUse, decisionStyle, responseLength } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    // Validate quizId format (UUID)
    const sanitizedQuizId = typeof quizId === 'string' && /^[0-9a-f-]{36}$/i.test(quizId) ? quizId : null;

    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        quiz_completion_id: sanitizedQuizId,
        domain: sanitizeString(domain, 50) || null,
        technical_level: sanitizeNumber(technicalLevel, 1, 10, 5),
        primary_use: sanitizeString(primaryUse, 200) || null,
        decision_style: isValidDecisionStyle(decisionStyle) ? decisionStyle : null,
        response_length: isValidResponseLength(responseLength) ? responseLength : null,
      });

    if (purchaseError) {
      console.error('track-purchase insert error:', purchaseError.message);
    }

    if (sanitizedQuizId) {
      const { error: updateError } = await supabase
        .from('quiz_completions')
        .update({ purchased: true })
        .eq('id', sanitizedQuizId);

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
