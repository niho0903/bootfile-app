import { after, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { handleStudioStripeEvent } from '@/lib/studio/payments';
import { runStudioWorker } from '@/lib/studio/worker';
import { studioErrorCode } from '@/lib/studio/errors';
import { recordStudioRefundEvent } from '@/lib/studio/refunds';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET is not set');
    return new Response('Server configuration error', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    console.error('[WEBHOOK] Signature verification failed');
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  try {
    if (['refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
      await recordStudioRefundEvent(event);
      return Response.json({ received: true });
    }
    const studio = await handleStudioStripeEvent(event);
    if (studio.handled) {
      if (studio.queued) after(async () => {
        try { await runStudioWorker({ limit: 1 }); } catch (error) { console.error('[STUDIO WEBHOOK WORKER]', studioErrorCode(error)); }
      });
      // Queue persistence has succeeded before acknowledging Stripe. Cron retries any crashed worker.
      return Response.json({ received: true });
    }
  } catch (error) {
    console.error('[STUDIO WEBHOOK]', studioErrorCode(error));
    // Returning 5xx is intentional: Stripe retries instead of losing a paid order.
    return new Response('Unable to persist payment event', { status: 503 });
  }

  switch (event.type) {
    // New embedded checkout flow
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.product === 'bootfile') {
        console.log('[WEBHOOK] PaymentIntent succeeded:', {
          paymentIntentId: paymentIntent.id,
          archetypeId: paymentIntent.metadata?.archetype_id,
        });
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata?.product === 'bootfile') {
        console.error('[WEBHOOK] PaymentIntent failed:', {
          paymentIntentId: paymentIntent.id,
        });
      }
      break;
    }
    // Legacy checkout session flow (backward compat)
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        console.log('[WEBHOOK] Checkout session completed:', {
          sessionId: session.id,
          archetypeId: session.metadata?.archetype_id,
        });
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[WEBHOOK] Async payment succeeded:', { sessionId: session.id });
      break;
    }
    case 'checkout.session.async_payment_failed': {
      console.error('[WEBHOOK] Async payment failed');
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
