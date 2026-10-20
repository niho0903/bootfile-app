'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioOrderView } from '@/lib/studio/types';
import { STUDIO_PRODUCT } from '@/lib/studio/types';
import { StudioNotice, studioColors as c } from './StudioChrome';

export function StudioRefund({ orderId, token, status, available, eligibleUntil, onRequested, onRefresh }: {
  orderId: string;
  token: string;
  status: StudioOrderView['refundStatus'];
  available: boolean;
  eligibleUntil: string | null;
  onRequested: (status: StudioOrderView['refundStatus']) => void;
  onRefresh: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const supportHref = `mailto:support@bootfile.ai?subject=${encodeURIComponent(`Refund help for Marketing Setup order ${orderId}`)}`;
  const deadline = eligibleUntil && !Number.isNaN(Date.parse(eligibleUntil)) ? new Date(eligibleUntil).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : null;

  useEffect(() => { if (confirming) confirmationHeading.current?.focus(); }, [confirming]);

  async function requestRefund() {
    if (!available || !confirming || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/refund`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true }), signal: AbortSignal.timeout(30_000),
      });
      const data = await response.json();
      if (!response.ok || !['pending', 'completed', 'needs_attention'].includes(data.status)) throw new Error('unconfirmed');
      onRequested(data.status === 'needs_attention' ? 'failed' : data.status);
      setConfirming(false);
    } catch {
      setError('We couldn’t confirm the refund request. Refresh your order status before trying again, or contact support.');
      onRefresh();
    } finally { inFlight.current = false; setSubmitting(false); }
  }

  if (status === 'pending') return <div style={{ marginTop: 26 }}><StudioNotice><strong style={{ fontWeight: 550 }}>Refund processing.</strong> Your full {STUDIO_PRODUCT.formatted} USD refund has been requested through Stripe. It has not been confirmed as complete. This order’s online pack is no longer available while the refund is processed.</StudioNotice></div>;
  if (status === 'completed') return <p style={{ fontSize: 12, color: c.muted, marginTop: 22 }}>Full {STUDIO_PRODUCT.formatted} USD refund recorded. <a href={supportHref} className="studio-quiet-link" style={{ textDecoration: 'underline' }}>Get refund help</a>.</p>;
  if (status === 'failed') return <div style={{ marginTop: 26 }}><StudioNotice tone="error">Your refund request needs attention and has not been confirmed as complete. <a href={supportHref} style={{ color: 'inherit', textDecoration: 'underline' }}>Contact support</a> with your order number.</StudioNotice></div>;

  return <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${c.line}` }}>
    {!available ? <p style={{ fontSize: 12, color: c.muted }}>Questions about your purchase or a refund? <a href={supportHref} className="studio-quiet-link" style={{ textDecoration: 'underline' }}>Contact support</a>.</p> : !confirming ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'baseline' }}><p style={{ fontSize: 12, color: c.muted }}>Not the right fit? Your order is eligible for a full refund.</p><button id="studio-request-refund" type="button" className="studio-inline-button" onClick={() => setConfirming(true)}>Request a refund</button></div> : <div style={{ maxWidth: 660, padding: '24px 25px', background: c.paper, border: `1px solid ${c.line}`, borderRadius: 11 }}>
      <h2 ref={confirmationHeading} tabIndex={-1} className="font-heading" style={{ fontSize: 27, fontWeight: 400, lineHeight: 1.25, marginBottom: 12 }}>Refund your Marketing Setup?</h2>
      <p style={{ fontSize: 13, lineHeight: 1.85, color: c.muted }}>This requests a full <strong style={{ fontWeight: 550, color: c.ink }}>{STUDIO_PRODUCT.formatted} USD refund to your original payment method.</strong> Work on this order stops, and its online pack will no longer be available.</p>
      {deadline ? <p style={{ fontSize: 11, color: c.muted, marginTop: 13 }}>Refund window ends {deadline}.</p> : null}
      <div className="studio-result-actions" style={{ marginTop: 23 }}><button type="button" className="studio-button" disabled={submitting} onClick={requestRefund}>{submitting ? 'Requesting refund…' : `Confirm ${STUDIO_PRODUCT.formatted} refund`}</button><button type="button" className="studio-button studio-button-secondary" disabled={submitting} onClick={() => { setConfirming(false); setError(''); requestAnimationFrame(() => document.getElementById('studio-request-refund')?.focus()); }}>Keep my setup</button></div>
    </div>}
    {error ? <div style={{ marginTop: 18 }}><StudioNotice tone="error">{error}</StudioNotice></div> : null}
  </div>;
}
