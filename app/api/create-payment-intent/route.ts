import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { isValidArchetype, sanitizeString } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { archetypeId, scoresJson, email } = body;

    if (!isValidArchetype(archetypeId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const sanitizedScores = sanitizeString(scoresJson, 500);
    const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : undefined;
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 499,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      ...(sanitizedEmail && { receipt_email: sanitizedEmail }),
      metadata: {
        archetype_id: archetypeId,
        scores_json: sanitizedScores,
        product: 'bootfile',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error('[CREATE PAYMENT INTENT ERROR]', error);
    return NextResponse.json({ error: 'Payment setup failed.' }, { status: 500 });
  }
}
