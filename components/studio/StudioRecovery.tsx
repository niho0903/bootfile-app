'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { ArrowIcon, Eyebrow, studioColors as c, studioContainer } from './StudioChrome';

function subscribeToOrders(notify: () => void) {
  window.addEventListener('storage', notify);
  return () => window.removeEventListener('storage', notify);
}

function recentSessionOrder() {
  try {
    const id = sessionStorage.getItem('bootfile:studio:last-order');
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) && sessionStorage.getItem(`bootfile:studio:${id}`)) return id;
  } catch { /* Email remains available when browser storage is unavailable. */ }
  return null;
}

export function StudioRecovery() {
  const recentOrder = useSyncExternalStore(subscribeToOrders, recentSessionOrder, () => null);
  return <main id="main-content" style={{ ...studioContainer, maxWidth: 740, paddingTop: 62, paddingBottom: 82, minHeight: '67vh' }}>
    <Eyebrow>Your Marketing Setup</Eyebrow>
    <h1 className="font-heading" style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 400, lineHeight: 1.18, letterSpacing: '-.025em' }}>Let’s find your pack.</h1>
    <p style={{ fontSize: 15, color: c.muted, lineHeight: 1.85, margin: '18px 0 29px', maxWidth: 580 }}>Your finished Marketing Setup comes with a private order link. That link opens your pack without an account or password.</p>
    {recentOrder ? <div style={{ padding: '24px 26px', border: '1px solid #D6DDCB', borderRadius: 12, background: c.wash, marginBottom: 24 }}><h2 style={{ fontSize: 16, fontWeight: 550, marginBottom: 9 }}>There’s an order in this browser tab.</h2><p style={{ fontSize: 13, color: c.muted, marginBottom: 18 }}>Open it to check progress or download your pack.</p><Link href={`/studio/order/${recentOrder}`} className="studio-button">Open my order <ArrowIcon /></Link></div> : null}
    <div style={{ padding: '29px 28px', background: c.paper, border: `1px solid ${c.line}`, borderRadius: 13 }}>
      <ol style={{ listStyle: 'none', display: 'grid', gap: 28 }}>
        {[
          ['Check your delivery email.', 'Search the inbox you used at checkout for “Bootfile” or “Marketing Setup.” Check spam or junk too, then open the complete link in your delivery email.'],
          ['Try the checkout browser.', 'If your pack is still being prepared, return to the browser tab where you paid. The order page can show its current status.'],
          ['Still missing? We can help.', 'Email support@bootfile.ai from the address you used for the purchase. Include your order number or Stripe receipt if you have it.'],
        ].map(([title, description], index) => <li key={title} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 18 }}><span style={{ fontSize: 11, color: c.green, paddingTop: 3 }}>0{index + 1}</span><div><h2 style={{ fontSize: 15, fontWeight: 550, marginBottom: 8 }}>{title}</h2><p style={{ color: c.muted, fontSize: 13, lineHeight: 1.85 }}>{description}</p></div></li>)}
      </ol>
      <a href="mailto:support@bootfile.ai?subject=Help%20finding%20my%20Marketing%20Setup" className="studio-button studio-button-secondary" style={{ marginTop: 28 }}>Contact support <ArrowIcon /></a>
    </div>
    <p style={{ color: c.muted, fontSize: 12, marginTop: 24 }}>For the original AI profile, your purchase email remains the place to find your file. <a href="mailto:support@bootfile.ai" className="studio-quiet-link" style={{ textDecoration: 'underline' }}>Contact support</a> if you need help with an earlier purchase.</p>
  </main>;
}
