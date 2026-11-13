'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { BrandInput } from '@/lib/brand-kit/kit';
import {
  BrandCheckoutError, brandKitCheckoutPayload, requestBrandKitCheckout,
  type BrandKitCheckoutConfig, type BrandKitCheckoutResult,
} from '@/lib/brand-kit/paid-checkout';

/**
 * The only place the Brand & AI Kit page offers a purchase. It renders nothing unless the server
 * reports checkout open, and it sends the customer's answers only when they press the payment button.
 */
export function BrandKitPurchase({ config, input, approvalSnapshot }: { config: BrandKitCheckoutConfig; input: BrandInput; approvalSnapshot: string }) {
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  // One request key per distinct payload, so a retry cannot create a second order and an edit cannot reuse an old one.
  const attempt = useRef<{ fingerprint: string; key: string; result: BrandKitCheckoutResult | null } | null>(null);

  if (!config.checkoutEnabled) {
    return config.reasonCode === 'temporarily_full'
      ? <section className="brandPurchase brandPurchaseNotice" id="brand-purchase" aria-label="The full Brand and AI Kit"><div><p className="brandEyebrow">THE FULL KIT</p><p>The paid kit is at capacity right now. Please check back shortly. Your preview stays in this tab.</p></div></section>
      : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      const payload = brandKitCheckoutPayload({ input, approvalSnapshot, email, acceptedTerms });
      const fingerprint = JSON.stringify(payload);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID(), result: null };
      const current = attempt.current;
      current.result ??= await requestBrandKitCheckout(payload, current.key);
      try {
        sessionStorage.setItem(`bootfile:studio:${current.result.orderId}`, current.result.accessToken);
        sessionStorage.setItem('bootfile:studio:last-order', current.result.orderId);
      } catch {
        throw new BrandCheckoutError('Your browser couldn’t keep your private order link. Allow site storage or use another browser, then try again. You haven’t paid yet.');
      }
      window.location.assign(current.result.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof BrandCheckoutError ? caught.message : 'We couldn’t open checkout. Please try again. You haven’t been charged.');
      setSubmitting(false);
      busy.current = false;
    }
  }

  return (
    <section className="brandPurchase" id="brand-purchase" aria-labelledby="brand-purchase-title">
      <div>
        <p className="brandEyebrow">THE FULL KIT · {config.priceFormatted} ONCE</p>
        <h2 id="brand-purchase-title">Get your Brand &amp; AI Kit.</h2>
        <p>{config.productDescription}</p>
        <p>An AI model drafts your positioning, voice guidance, customer email and three social posts from the answers you just approved, and notes which of your own words each claim came from. Your kit is saved to a private order page and emailed to you.</p>
        <p className="brandFine">It is a draft for you to review, not independently verified strategy. Nothing is published for you. One payment, no subscription.</p>
      </div>
      <form onSubmit={submit} noValidate>
        <label className="brandField"><span>Where should we send your kit?</span><small>Use an email you can access. Your private order link and finished kit go here.</small><input type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" value={email} disabled={submitting} onChange={event => { setEmail(event.target.value); setError(''); }} /></label>
        <label className="brandConfirm"><input type="checkbox" checked={acceptedTerms} disabled={submitting} onChange={event => { setAcceptedTerms(event.target.checked); setError(''); }} /><span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. I have permission to use these business details.</span></label>
        {error ? <p className="brandError" role="alert">{error}</p> : null}
        <button type="submit" className="brandButton" disabled={submitting || !acceptedTerms || !email.trim()}>{submitting ? 'Opening checkout…' : <>Continue to payment · {config.priceFormatted} <span aria-hidden="true">→</span></>}</button>
        <p className="brandFine">When you continue, your approved answers and email are sent to Bootfile to create your order. Payment is handled by Stripe. 7-day refund policy.</p>
      </form>
    </section>
  );
}
