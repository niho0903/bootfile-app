import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { createStudioCheckout, resumeStudioCheckout } from './checkout';
import { studioRpc } from './db';
import { STUDIO_DEMO_INTAKE } from './demo';
import { StudioError } from './errors';
import { studioOrderFixture, studioSessionFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';

vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }));
vi.mock('./db', () => ({ studioRpc: vi.fn(), studioDb: vi.fn() }));
vi.mock('./config', async importOriginal => ({ ...await importOriginal<typeof import('./config')>(), assertStudioCheckoutConfigured: vi.fn() }));

const stripe = { checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } } };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T12:45:00.000Z'));
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'studio-checkout-secret-'.repeat(3));
  vi.stubEnv('STUDIO_MAX_GENERATIONS_PER_DAY', '20');
  vi.mocked(getStripe).mockReturnValue(stripe as unknown as Stripe);
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('checkout admission and reservation deadline', () => {
  it('does not ask Stripe for a payable session when the atomic capacity reservation fails', async () => {
    vi.mocked(studioRpc).mockRejectedValue(new StudioError('temporarily_full', 'Temporarily full.', 503));
    await expect(createStudioCheckout(STUDIO_DEMO_INTAKE, STUDIO_TEST_ORDER_ID, 'test-ip')).rejects.toMatchObject({ code: 'temporarily_full', status: 503 });
    expect(studioRpc).toHaveBeenCalledWith('studio_create_order', expect.objectContaining({ p_daily_limit: 20 }));
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it('does not create a later-expiring replacement when a no-session draft is too old for Stripe’s minimum lifetime', async () => {
    const order = studioOrderFixture({ payment_status: 'awaiting_payment', status: 'awaiting_payment', stripe_checkout_session_id: null });
    order.access_token_hash = hashStudioAccessToken(createStudioAccessToken(order.id));
    vi.mocked(studioRpc).mockResolvedValue([order]);
    await expect(createStudioCheckout(STUDIO_DEMO_INTAKE, STUDIO_TEST_ORDER_ID, 'test-ip')).rejects.toMatchObject({ code: 'checkout_expired', status: 409 });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('does not return a resume URL that extends beyond the locally reserved payment window', async () => {
    const order = studioOrderFixture({ payment_status: 'awaiting_payment', status: 'awaiting_payment' });
    const session = studioSessionFixture();
    session.status = 'open'; session.payment_status = 'unpaid'; session.url = 'https://checkout.stripe.com/test';
    session.expires_at += 3600;
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    await expect(resumeStudioCheckout(order)).rejects.toMatchObject({ code: 'payment_mismatch' });
  });
});
