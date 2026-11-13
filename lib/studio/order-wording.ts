/**
 * The words on the private order page that depend on which product was bought. Browser-safe.
 * Before the order has loaded nothing is assumed, so a buyer never sees the other product's name.
 */
const BRAND_KIT_VERSION = 'brand-foundation-paid-v1';

export interface StudioOrderWording {
  /** "Marketing Setup", "Brand & AI Kit", or "order" before the order is known. */
  label: string;
  supportSubject: string;
  readyHeading: string;
  queuedHeading: string;
  generatingHeading: string;
  attentionHeading: string;
  preparing: string;
  unfinished: string;
  cancelled: string;
  deliveryFailed: string;
  readyStep: string;
  restart: { href: string; label: string };
}

export function studioOrderWording(orderId: string, product?: { version: string; name: string } | null): StudioOrderWording {
  const name = product?.name ? product.name.replace(/^Bootfile /, '') : '';
  const label = name || 'order';
  const common = { label, supportSubject: `${name || 'Bootfile'} order ${orderId}`, readyHeading: `Your ${label} is ready.` };
  if (product?.version === BRAND_KIT_VERSION) {
    return {
      ...common,
      queuedHeading: 'Your kit is next.',
      generatingHeading: 'Your kit is taking shape.',
      attentionHeading: 'Your kit needs another look.',
      preparing: 'Payment confirmed. We’re drafting your brand foundation, voice guide and first campaign from the answers you approved. We’ll send a private link to your delivery email when the kit is ready.',
      unfinished: 'Your order is saved, but we couldn’t finish the kit yet. Refresh the status to check again, or contact support with your order number below.',
      cancelled: 'You can start a new kit when you’re ready. If you made a payment and expected to see your kit here, contact support with this order number.',
      deliveryFailed: 'Your kit is ready here, but email delivery hasn’t completed. Download a copy now so you have it.',
      readyStep: 'Your kit is ready',
      restart: { href: '/brand', label: 'Start a new kit' },
    };
  }
  return {
    ...common,
    queuedHeading: 'Your setup is next.',
    generatingHeading: 'Your promotion is taking shape.',
    attentionHeading: 'Your setup needs another look.',
    preparing: 'Payment confirmed. We’re preparing your email, social posts, and reusable setup from your brief. We’ll send a private link to your delivery email when the pack is ready.',
    unfinished: 'Your order is saved, but we couldn’t finish the pack yet. Refresh the status to check again, or contact support with your order number below.',
    cancelled: 'You can start a new brief when you’re ready. If you made a payment and expected to see your pack here, contact support with this order number.',
    deliveryFailed: 'Your pack is ready here, but email delivery hasn’t completed. Download a copy now so you have it.',
    readyStep: 'Your pack is ready',
    restart: { href: '/studio', label: 'Start a new brief' },
  };
}
