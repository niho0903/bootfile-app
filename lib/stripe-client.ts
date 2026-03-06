import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripeClient() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('[STRIPE] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    stripePromise = loadStripe(key || '');
  }
  return stripePromise;
}
