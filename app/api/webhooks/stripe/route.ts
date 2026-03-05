import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WEBHOOK] Signature verification failed: ${message}`);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        await handleFulfillment(session);
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleFulfillment(session);
      break;
    }
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.error('[WEBHOOK] Payment failed for session:', session.id);
      break;
    }
    default:
      console.log(`[WEBHOOK] Unhandled: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleFulfillment(session: Stripe.Checkout.Session) {
  const archetypeId = session.metadata?.archetype_id;
  const scoresJson = session.metadata?.scores_json;
  const customerEmail = session.customer_details?.email;
  const sessionId = session.id;

  console.log('[WEBHOOK] Order fulfilled:', {
    sessionId,
    archetypeId,
    customerEmail,
    scoresJson,
  });
}
