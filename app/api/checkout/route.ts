import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { isValidArchetype, sanitizeString } from '@/lib/validation';

const DOMAIN = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { archetypeId, scoresJson, email } = body;

    // Validate inputs
    if (!isValidArchetype(archetypeId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const sanitizedScores = sanitizeString(scoresJson, 500);
    const sanitizedEmail = sanitizeString(email, 254);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 99,
            product_data: {
              name: 'BootFile \u2014 Personalized AI Instructions',
              description: 'Your personalized AI instruction profile',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        archetype_id: archetypeId,
        scores_json: sanitizedScores,
        user_email: sanitizedEmail,
      },
      payment_intent_data: {
        metadata: {
          archetype_id: archetypeId,
          scores_json: sanitizedScores,
          user_email: sanitizedEmail,
        },
      },
      // {CHECKOUT_SESSION_ID} is replaced by Stripe at redirect time
      success_url: `${DOMAIN}/generate?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/result`,
      customer_creation: 'if_required',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('[CHECKOUT ERROR]', error);
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
  }
}
