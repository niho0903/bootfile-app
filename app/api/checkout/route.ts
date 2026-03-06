import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { isValidArchetype, sanitizeString } from '@/lib/validation';

const DOMAIN = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const VALID_TIERS = new Set(['basic', 'premium', 'upgrade']);

const TIER_CONFIG: Record<string, { amount: number; name: string; description: string }> = {
  basic: {
    amount: 99,
    name: 'BootFile Basic',
    description: 'Personalized AI instruction profile',
  },
  premium: {
    amount: 299,
    name: 'BootFile Premium',
    description: 'Personalized AI instructions + saved forever, model updates, version history',
  },
  upgrade: {
    amount: 250,
    name: 'BootFile Premium Upgrade',
    description: 'Upgrade to Premium: saved forever, model updates, version history',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { archetypeId, scoresJson, tier: rawTier } = body;

    // Validate inputs
    if (!isValidArchetype(archetypeId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const tier = typeof rawTier === 'string' && VALID_TIERS.has(rawTier) ? rawTier : 'basic';
    const tierConfig = TIER_CONFIG[tier];

    const sanitizedScores = sanitizeString(scoresJson, 500);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: tierConfig.amount,
            product_data: {
              name: tierConfig.name,
              description: tierConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        archetype_id: archetypeId,
        scores_json: sanitizedScores,
        tier,
      },
      payment_intent_data: {
        metadata: {
          archetype_id: archetypeId,
          scores_json: sanitizedScores,
          tier,
        },
      },
      // {CHECKOUT_SESSION_ID} is replaced by Stripe at redirect time
      success_url: tier === 'upgrade'
        ? `${DOMAIN}/bootfile?upgraded=1&session_id={CHECKOUT_SESSION_ID}`
        : `${DOMAIN}/generate?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: tier === 'upgrade' ? `${DOMAIN}/bootfile` : `${DOMAIN}/result`,
      customer_creation: 'if_required',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('[CHECKOUT ERROR]', error);
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
  }
}
