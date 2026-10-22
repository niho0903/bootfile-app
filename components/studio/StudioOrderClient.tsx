'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { StudioOrderView } from '@/lib/studio/types';
import { CopyButton, StudioBundleView } from './StudioBundleView';
import { StudioRefund } from './StudioRefund';
import { StudioFeedback } from './StudioFeedback';
import { ArrowIcon, CheckIcon, DocumentIcon, Eyebrow, StudioNotice, studioColors as c, studioContainer } from './StudioChrome';
import { useStudioBrowserReady } from './useStudioBrowserReady';

const ACTIVE_STATUSES = ['awaiting_payment', 'queued', 'generating'];

export function StudioOrderClient({ orderId }: { orderId: string }) {
  const browserReady = useStudioBrowserReady();
  if (!browserReady) return <main id="main-content" style={{ ...studioContainer, maxWidth: 820, paddingTop: 54, paddingBottom: 76, minHeight: '65vh' }}><Eyebrow>Your Marketing Setup</Eyebrow><h1 className="font-heading" style={{ fontSize: 'clamp(33px, 4.7vw, 47px)', fontWeight: 400, lineHeight: 1.16 }}>Opening your order…</h1><p role="status" style={{ color: c.muted, fontSize: 14, marginTop: 26 }}>Checking your private order link.</p></main>;
  return <StudioOrderContent key={orderId} orderId={orderId} />;
}

function readOrderAccess(orderId: string) {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  let token = fragment.get('access_token');
  try { token ||= sessionStorage.getItem(`bootfile:studio:${orderId}`); } catch { /* A private email link also works without browser storage. */ }
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return { token: null, privateUrl: '' };
  return { token, privateUrl: `${window.location.origin}/studio/order/${encodeURIComponent(orderId)}#access_token=${encodeURIComponent(token)}` };
}

function StudioOrderContent({ orderId }: { orderId: string }) {
  const [{ token, privateUrl }] = useState(() => readOrderAccess(orderId));
  const [order, setOrder] = useState<StudioOrderView | null>(null);
  const [error, setError] = useState('');
  const [accessError, setAccessError] = useState(false);
  const [checking, setChecking] = useState(!!token);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    try {
      if (token) {
        sessionStorage.setItem(`bootfile:studio:${orderId}`, token);
        sessionStorage.setItem('bootfile:studio:last-order', orderId);
      }
    } catch { /* A private email link can still open the order without browser storage. */ }
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.has('access_token')) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [orderId, token]);

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    async function loadOrder() {
      try {
        const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]), cache: 'no-store' });
        if (response.status === 401 || response.status === 404) {
          if (!stopped) { setAccessError(true); setError('This private link couldn’t open the order. Use the complete link from your delivery email, or contact support.'); }
          return;
        }
        if (!response.ok) throw new Error('unavailable');
        const view = await response.json() as StudioOrderView;
        if (!view || view.orderId !== orderId || !['awaiting_payment', 'queued', 'generating', 'ready', 'needs_attention', 'cancelled'].includes(view.status)) throw new Error('invalid_response');
        if (stopped) return;
        setOrder(view);
        setError('');
        attempts += 1;
        if (ACTIVE_STATUSES.includes(view.status) || view.refundStatus === 'pending') {
          if (attempts < 16) timer = setTimeout(() => { setChecking(true); void loadOrder(); }, Math.max(5, Math.min(view.retryAfterSeconds || 15, 60)) * 1000);
          else setPollingPaused(true);
        }
      } catch (failure) {
        if (stopped || (failure instanceof Error && failure.name === 'AbortError')) return;
        setError('We couldn’t check your order just now. Your order is still saved. Try refreshing the status.');
        setPollingPaused(true);
      } finally { if (!stopped) setChecking(false); }
    }
    void loadOrder();
    return () => { stopped = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [orderId, token, refresh]);

  function refreshStatus() {
    setPollingPaused(false);
    setAccessError(false);
    setChecking(true);
    setRefresh(value => value + 1);
  }

  async function resumeCheckout() {
    if (!token || openingCheckout) return;
    setOpeningCheckout(true);
    setCheckoutError('');
    try {
      const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/checkout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
      const data = await response.json();
      if (!response.ok || typeof data.checkoutUrl !== 'string') throw new Error('Checkout is no longer open for this order. Refresh the status, or contact support if you need help.');
      const url = new URL(data.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('We couldn’t reopen checkout. Please contact support.');
      try { sessionStorage.setItem(`bootfile:studio:${orderId}`, token); } catch { throw new Error('Allow site storage before returning to checkout so this browser can reopen your order.'); }
      window.location.assign(url.href);
    } catch (failure) {
      setCheckoutError(failure instanceof Error ? failure.message : 'We couldn’t reopen checkout. Please try again.');
      setOpeningCheckout(false);
    }
  }

  const supportHref = `mailto:support@bootfile.ai?subject=${encodeURIComponent(`Marketing Setup order ${orderId}`)}`;
  const paid = order?.paymentStatus === 'paid';
  const isRefunded = order?.paymentStatus === 'refunded' || order?.refundStatus === 'completed';
  const refundPending = order?.refundStatus === 'pending';
  const refundFailed = order?.refundStatus === 'failed';
  const ready = order?.status === 'ready' && order.paymentStatus === 'paid' && !!order.result && !order.refundRequestedAt && !refundPending && !refundFailed && !isRefunded;
  const heading = !order && !error && token ? 'Opening your order…' : !token || accessError ? 'Your private order link opens this page.' : isRefunded ? 'This order has been refunded.' : refundPending ? 'Your refund is processing.' : refundFailed ? 'Your refund request needs attention.' : order?.paymentStatus === 'disputed' ? 'There’s a payment issue to resolve.' : ready ? 'Your Marketing Setup is ready.' : order?.status === 'awaiting_payment' ? 'Your brief is saved.' : order?.status === 'queued' ? 'Your setup is next.' : order?.status === 'generating' ? 'Your promotion is taking shape.' : order?.status === 'needs_attention' ? 'Your setup needs another look.' : order?.status === 'cancelled' ? 'This checkout has closed.' : 'Let’s check your order.';

  return (
    <main id="main-content" style={{ ...studioContainer, maxWidth: ready ? 1060 : 820, paddingTop: 54, paddingBottom: 76, minHeight: '65vh' }}>
      <Eyebrow>Your Marketing Setup</Eyebrow>
      <h1 aria-live="polite" className="font-heading" style={{ fontSize: 'clamp(33px, 4.7vw, 47px)', fontWeight: 400, lineHeight: 1.16, letterSpacing: '-.025em', maxWidth: 760 }}>{heading}</h1>
      {!order && !error && token ? <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, color: c.muted, fontSize: 14, marginTop: 26 }}><span className="studio-spinner" aria-hidden="true" />Checking your private order link.</div> : !token || accessError ? <div style={{ marginTop: 28 }}>
        <StudioNotice>Open the complete link from your Bootfile delivery email, or return to the browser tab you used for checkout.</StudioNotice>
        {accessError ? <p style={{ fontSize: 13, color: '#813E2E', marginTop: 18 }}>{error}</p> : null}
        <div className="studio-result-actions" style={{ marginTop: 25 }}><Link href="/studio/recover" className="studio-button">Find my order <ArrowIcon /></Link><a href={supportHref} className="studio-button studio-button-secondary">Contact support</a></div>
      </div> : <>
        <div style={{ marginTop: 20, marginBottom: 30 }}>
          {ready ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85, maxWidth: 730 }}>Start with your email and posts, then keep the setup for your next promotion. Review the facts and make any edits before publishing.</p> : isRefunded ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>Your refund has been recorded. Your bank or card provider controls when it appears on your statement.</p> : refundPending ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>Your full $49 USD refund was requested through Stripe. This page will update when the refund is confirmed.</p> : refundFailed ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>Your refund hasn’t been confirmed as complete. Contact support with your order number so we can help resolve it.</p> : order?.status === 'awaiting_payment' ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>We haven’t confirmed a payment for this order yet. If you just paid, this page will update when confirmation arrives. If you left checkout, you can return to it below.</p> : paid && (order?.status === 'queued' || order?.status === 'generating') ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>Payment confirmed. We’re preparing your email, social posts, and reusable setup from your brief. We’ll send a private link to your delivery email when the pack is ready.</p> : order?.status === 'needs_attention' ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>Your order is saved, but we couldn’t finish the pack yet. Refresh the status to check again, or contact support with your order number below.</p> : order?.status === 'cancelled' ? <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85 }}>You can start a new brief when you’re ready. If you made a payment and expected to see your pack here, contact support with this order number.</p> : null}
        </div>
        {error && !accessError ? <div style={{ marginBottom: 22 }}><StudioNotice tone="error">{error}</StudioNotice></div> : null}
        {ready && order?.result ? <>
          {order.deliveryStatus === 'failed' ? <div style={{ marginBottom: 26 }}><StudioNotice>Your pack is ready here, but email delivery hasn’t completed. Download a copy now so you have it.</StudioNotice></div> : null}
          <StudioBundleView bundle={order.result} />
          <StudioFeedback orderId={orderId} token={token} />
        </> : <div style={{ background: c.paper, border: `1px solid ${c.line}`, borderRadius: 13, padding: '28px 30px' }}>
          {paid && !refundPending && !refundFailed && order?.status !== 'needs_attention' ? <ol aria-label="Order progress" style={{ listStyle: 'none', display: 'grid', gap: 20, marginBottom: 26 }}>
            {[['Payment confirmed', true], ['Preparing your Marketing Setup', false], ['Your pack is ready', false]].map(([label, completed], index) => <li key={String(label)} style={{ display: 'flex', gap: 13, alignItems: 'center', color: completed || index === 1 ? c.green : c.muted, fontSize: 13 }}><span style={{ width: 25, height: 25, background: completed ? c.wash : c.cream, border: `1px solid ${c.line}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{completed ? <CheckIcon size={15} /> : index + 1}</span>{label}</li>)}
          </ol> : <span style={{ display: 'inline-flex', color: c.green, marginBottom: 18 }}><DocumentIcon /></span>}
          <div className="studio-result-actions">
            {order?.status === 'awaiting_payment' && !isRefunded ? <button type="button" className="studio-button" onClick={resumeCheckout} disabled={openingCheckout}>{openingCheckout ? 'Opening checkout…' : 'Return to payment'}<ArrowIcon /></button> : null}
            {order?.status === 'cancelled' && !paid && !isRefunded ? <Link href="/studio" className="studio-button">Start a new brief <ArrowIcon /></Link> : null}
            {!isRefunded ? <button type="button" className="studio-button studio-button-secondary" disabled={checking} onClick={refreshStatus}>{checking ? 'Checking…' : 'Refresh status'}</button> : null}
            <a href={supportHref} className="studio-button studio-button-secondary">Contact support</a>
          </div>
          {checkoutError ? <div style={{ marginTop: 20 }}><StudioNotice tone="error">{checkoutError}</StudioNotice></div> : null}
          {pollingPaused && !isRefunded ? <p role="status" style={{ color: c.muted, fontSize: 12, marginTop: 20 }}>Automatic checking has paused. Use Refresh status to check again{refundPending ? '.' : ', or watch for your delivery email.'}</p> : order && (ACTIVE_STATUSES.includes(order.status) || refundPending) ? <p style={{ color: c.muted, fontSize: 12, marginTop: 20 }} role="status">This page checks for updates automatically.</p> : null}
        </div>}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${c.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18 }}>
          <div><p style={{ color: c.muted, fontSize: 11 }}>Order number</p><p style={{ fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' }}>{orderId}</p></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 19, flexWrap: 'wrap' }}>{privateUrl ? <CopyButton text={privateUrl} label="Copy private order link" /> : null}<a href={supportHref} className="studio-text-link" style={{ fontSize: 12 }}>Get help <ArrowIcon /></a></div>
        </div>
        {ready && order?.deliveryStatus === 'sent' ? <p style={{ color: c.muted, fontSize: 11, marginTop: 15 }}>Your private link was also sent to the delivery email on your order.</p> : null}
        {order && (paid || isRefunded || refundPending || refundFailed) ? <StudioRefund orderId={orderId} token={token} status={order.refundStatus} available={order.refundAvailable} eligibleUntil={order.refundEligibleUntil} onRefresh={refreshStatus} onRequested={status => { setOrder(current => current ? { ...current, refundStatus: status, refundAvailable: false, refundRequestedAt: new Date().toISOString(), result: undefined, ...(status === 'completed' ? { paymentStatus: 'refunded' as const } : {}) } : current); refreshStatus(); }} /> : null}
      </>}
    </main>
  );
}
