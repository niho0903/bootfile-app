import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ paid: false }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({
      paid: session.payment_status === 'paid',
      archetypeId: session.metadata?.archetype_id ?? null,
      scoresJson: session.metadata?.scores_json ?? null,
    });
  } catch {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
}
