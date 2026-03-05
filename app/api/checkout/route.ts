import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

const DOMAIN = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { archetypeId, scoresJson, email } = body;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 299,
            product_data: {
              name: 'BootFile \u2014 Personalized AI Instructions',
              description: `Your personalized BootFile for ${archetypeId} archetype`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        archetype_id: archetypeId,
        scores_json: scoresJson,
        user_email: email ?? '',
      },
      payment_intent_data: {
        metadata: {
          archetype_id: archetypeId,
          scores_json: scoresJson,
          user_email: email ?? '',
        },
      },
      // {CHECKOUT_SESSION_ID} is replaced by Stripe at redirect time — NOT a JS template literal
      success_url: `${DOMAIN}/generate?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/result`,
      customer_creation: 'if_required',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CHECKOUT ERROR]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
