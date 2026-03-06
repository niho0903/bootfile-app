import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  // Validate session_id format (Stripe session IDs start with cs_)
  if (!sessionId || sessionId.length > 200 || !/^cs_/.test(sessionId)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({
      paid: session.payment_status === 'paid',
      archetypeId: session.metadata?.archetype_id ?? null,
      scoresJson: session.metadata?.scores_json ?? null,
      tier: session.metadata?.tier ?? 'basic',
    });
  } catch {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
}
