import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidArchetype, sanitizeString } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, bootfileText } = body;

    // Validate session ID
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Validate bootfile text
    const sanitizedBootfile = sanitizeString(bootfileText, 10000);
    if (!sanitizedBootfile || sanitizedBootfile.length < 100) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Verify this is a paid upgrade session
    let stripeSession;
    try {
      const stripe = getStripe();
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 403 });
    }

    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed.' }, { status: 403 });
    }

    const tier = stripeSession.metadata?.tier;
    if (tier !== 'upgrade') {
      return NextResponse.json({ error: 'Invalid session type.' }, { status: 400 });
    }

    const archetypeId = stripeSession.metadata?.archetype_id;
    if (!isValidArchetype(archetypeId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Store the bootfile
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const customerEmail = stripeSession.customer_details?.email || null;
      await supabase.from('bootfile_versions').insert({
        stripe_session_id: sessionId,
        email: customerEmail,
        archetype_id: archetypeId,
        bootfile_text: sanitizedBootfile,
        version: 1,
        tier: 'premium',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[UPGRADE ERROR]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
