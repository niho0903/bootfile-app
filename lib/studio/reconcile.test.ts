import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getStudioOrder, studioRpc } from './db';
import { reconcileStudioSession } from './payments';
import { studioOrderFixture, studioSessionFixture } from './test-fixtures';

vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }));
vi.mock('./db', () => ({ getStudioOrder: vi.fn(), studioRpc: vi.fn() }));

const stripe = {
  checkout: { sessions: { retrieve: vi.fn(), expire: vi.fn() } },
  refunds: { list: vi.fn() },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T14:00:00.000Z'));
  vi.mocked(getStripe).mockReturnValue(stripe as unknown as Stripe);
  vi.mocked(getStudioOrder).mockResolvedValue(studioOrderFixture({ payment_status: 'awaiting_payment', status: 'awaiting_payment', stripe_payment_intent_id: null }));
  vi.mocked(studioRpc).mockResolvedValue(true);
  stripe.refunds.list.mockResolvedValue({ has_more: false, data: [] });
});

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe('capacity held until the Stripe payment outcome is final', () => {
  it('expires an overdue open checkout at Stripe before releasing its reservation', async () => {
    const session = studioSessionFixture();
    session.status = 'open';
    session.payment_status = 'unpaid';
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    stripe.checkout.sessions.expire.mockResolvedValue({ ...session, status: 'expired' });
    const result = await reconcileStudioSession(session.id);
    expect(result.expired).toBe(true);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith(session.id, {}, { timeout: 10_000, maxNetworkRetries: 0 });
    expect(studioRpc).toHaveBeenCalledWith('studio_record_expired', expect.objectContaining({ p_session_id: session.id }));
    expect(stripe.checkout.sessions.expire.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(studioRpc).mock.invocationCallOrder[0]);
  });

  it('does not release capacity when provider expiration fails or races payment completion', async () => {
    const session = studioSessionFixture();
    session.status = 'open';
    session.payment_status = 'unpaid';
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    stripe.checkout.sessions.expire.mockRejectedValue(new Error('provider conflict'));
    await expect(reconcileStudioSession(session.id)).rejects.toThrow();
    expect(studioRpc).not.toHaveBeenCalled();
  });

  it('keeps a delayed payment reservation after nominal expiration while the payment is processing', async () => {
    const session = studioSessionFixture();
    session.payment_status = 'unpaid';
    (session.payment_intent as Stripe.PaymentIntent).status = 'processing';
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    expect(await reconcileStudioSession(session.id)).toMatchObject({ paid: false, expired: false });
    expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
    expect(studioRpc).not.toHaveBeenCalled();
  });

  it('releases a completed checkout only after its delayed payment has failed', async () => {
    const session = studioSessionFixture();
    session.payment_status = 'unpaid';
    const intent = session.payment_intent as Stripe.PaymentIntent;
    intent.status = 'requires_payment_method';
    (intent.latest_charge as Stripe.Charge).status = 'failed';
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    expect(await reconcileStudioSession(session.id)).toMatchObject({ paid: false, expired: true });
    expect(studioRpc).toHaveBeenCalledWith('studio_record_expired', expect.objectContaining({ p_session_id: session.id }));
    expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
  });

  it('refuses to expire or release a session with an expiration outside the persisted reservation', async () => {
    const session = studioSessionFixture();
    session.status = 'open';
    session.payment_status = 'unpaid';
    session.expires_at += 3600;
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    await expect(reconcileStudioSession(session.id)).rejects.toMatchObject({ code: 'payment_mismatch' });
    expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
    expect(studioRpc).not.toHaveBeenCalled();
  });

  it('records the provider charge time and current refund state together before fulfillment', async () => {
    const session = studioSessionFixture();
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    stripe.refunds.list.mockResolvedValue({ has_more: false, data: [{ id: 're_pending', payment_intent: 'pi_test_studio', amount: 4900, currency: 'usd', status: 'pending' }] });
    expect(await reconcileStudioSession(session.id)).toMatchObject({ paid: true, expired: false });
    expect(studioRpc).toHaveBeenCalledWith('studio_record_payment', expect.objectContaining({
      p_paid_at: '2026-10-20T12:00:00.000Z', p_refund_status: 'pending', p_refund_id: 're_pending', p_refunded_amount: 0,
    }));
    expect(stripe.refunds.list.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(studioRpc).mock.invocationCallOrder[0]);
  });
});
