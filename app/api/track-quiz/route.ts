import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendRedditEvent } from '@/lib/reddit';
import { categorizeOpenResponse, detectTone } from '@/lib/text-categorizer';
import { isValidArchetype, sanitizeString, sanitizeStringArray } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { primary, secondary, tertiary, lowest, openResponse, consentGiven } = body;

    // Validate required fields
    if (!isValidArchetype(primary)) {
      return NextResponse.json({ ok: true, quizId: null });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: true, quizId: null });
    }

    const sanitizedResponse = sanitizeString(openResponse, 280);
    const validatedLowest = sanitizeStringArray(lowest, 4, 20)
      .filter(a => isValidArchetype(a));

    const categories = sanitizedResponse ? categorizeOpenResponse(sanitizedResponse) : [];
    const tone = sanitizedResponse ? detectTone(sanitizedResponse) : null;

    const { data, error } = await supabase
      .from('quiz_completions')
      .insert({
        primary_archetype: primary,
        secondary_archetype: isValidArchetype(secondary) ? secondary : null,
        tertiary_archetype: isValidArchetype(tertiary) ? tertiary : null,
        lowest_archetypes: validatedLowest,
        open_response: consentGiven === true ? (sanitizedResponse || null) : null,
        consent_given: consentGiven === true,
        frustration_categories: categories,
        detected_tone: tone,
      })
      .select('id')
      .single();

    if (error) {
      console.error('track-quiz insert error:', error.message);
      return NextResponse.json({ ok: true, quizId: null });
    }

    // Reddit CAPI: server-side Lead event (deduplicates with client-side pixel via conversionId)
    sendRedditEvent({
      eventType: 'Lead',
      conversionId: data.id,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => { /* non-blocking */ });

    return NextResponse.json({ ok: true, quizId: data.id });
  } catch (e) {
    console.error('track-quiz error:', e);
    return NextResponse.json({ ok: true, quizId: null });
  }
}
