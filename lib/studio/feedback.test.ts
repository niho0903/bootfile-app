import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GET, POST } from '@/app/api/studio/orders/[id]/feedback/route';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { readyStudioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioOrderRow } from './types';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

const context = { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) };
const requestKey = '22222222-2222-4222-8222-222222222222';
const emptyFeedback = { usefulness: null, usedAt: null, reusedAt: null, updatedAt: null };
const usefulFeedback = { ...emptyFeedback, usefulness: 'useful', updatedAt: '2026-10-20T12:00:00.000Z' };
let row: StudioOrderRow;
let token: string;
let maybeSingle: ReturnType<typeof vi.fn>;
let rpc: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'feedback-private-test-secret-'.repeat(3));
  token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
  row = readyStudioOrderFixture();
  row.access_token_hash = hashStudioAccessToken(token);
  maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  rpc = vi.fn(async (name: string) => ({ data: { outcome: name === 'studio_read_feedback' ? 'available' : 'saved', feedback: name === 'studio_read_feedback' ? emptyFeedback : usefulFeedback }, error: null }));
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }), rpc };
  vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getSupabaseAdmin>>);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

function request(method: 'GET' | 'POST', options: { access?: string | null; body?: string; key?: string | null; contentType?: string } = {}) {
  const headers: Record<string, string> = {};
  const access = options.access === undefined ? token : options.access;
  if (access) headers.Authorization = `Bearer ${access}`;
  if (method === 'POST') {
    headers['Content-Type'] = options.contentType || 'application/json';
    if (options.key !== null) headers['Idempotency-Key'] = options.key || requestKey;
  }
  return new Request(`https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/feedback`, {
    method, headers, ...(method === 'POST' ? { body: options.body ?? JSON.stringify({ event: 'useful' }) } : {}),
  });
}

describe('private customer-reported feedback', () => {
  it.each(['GET', 'POST'] as const)('rejects %s without a capability before querying customer data', async method => {
    const response = await (method === 'GET' ? GET : POST)(request(method, { access: null }), context);
    expect(response.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not accept a valid-format capability belonging to another order', async () => {
    const response = await POST(request('POST', { access: 'a'.repeat(43) }), context);
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(row.intake.businessName);
  });

  it('returns only feedback state with private cache/referrer headers', async () => {
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('vary')).toBe('Authorization');
    expect(await response.json()).toEqual({ feedback: emptyFeedback });
    expect(rpc).toHaveBeenCalledWith('studio_read_feedback', { p_order_id: row.id, p_access_token_hash: row.access_token_hash });
  });

  it.each(['pending', 'completed', 'failed'] as const)('blocks reading and writing when refund status is %s', async status => {
    row.refund_status = status;
    expect((await GET(request('GET'), context)).status).toBe(409);
    expect((await POST(request('POST'), context)).status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['awaiting_payment', 'expired', 'refunded', 'disputed'] as const)('blocks feedback when payment is %s', async status => {
    row.payment_status = status;
    expect((await POST(request('POST'), context)).status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a refund marker even if the older status snapshot still says ready and paid', async () => {
    row.refund_requested_at = '2026-10-20T12:00:00.000Z';
    expect((await GET(request('GET'), context)).status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('honors an atomic eligibility rejection after the initial authenticated read', async () => {
    rpc.mockResolvedValueOnce({ data: { outcome: 'unavailable' }, error: null });
    const response = await POST(request('POST'), context);
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('usefulness');
  });

  it.each(['{"event":"download"}', '{"event":"used","usedAt":"2020-01-01"}', '{"event":"useful","email":"private@example.invalid"}', 'null', '[]', '{'])('rejects unexpected feedback input %s', async body => {
    expect((await POST(request('POST', { body }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('requires JSON and a UUID request key', async () => {
    expect((await POST(request('POST', { contentType: 'text/plain' }), context)).status).toBe(400);
    expect((await POST(request('POST', { key: null }), context)).status).toBe(400);
    expect((await POST(request('POST', { key: 'not-a-uuid' }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('bounds actual streamed bytes and cancels an oversized request without writing', async () => {
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(80)); controller.enqueue(new Uint8Array(80)); },
      cancel() { cancelled = true; },
    });
    const req = new Request(`https://bootfile.ai/api/studio/orders/${row.id}/feedback`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }, body, duplex: 'half',
    } as RequestInit);
    expect((await POST(req, context)).status).toBe(413);
    expect(cancelled).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends the same durable hashed key on retry and returns persisted state', async () => {
    const first = await POST(request('POST'), context);
    rpc.mockResolvedValueOnce({ data: { outcome: 'replayed', feedback: usefulFeedback }, error: null });
    const replay = await POST(request('POST'), context);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(await first.json()).toEqual(await replay.json());
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    const args = rpc.mock.calls[0][1];
    expect(args.p_request_key_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_request_key_hash).not.toContain(requestKey);
    expect(args.p_access_token_hash).toBe(row.access_token_hash);
    expect(args.p_event).toBe('useful');
    expect(JSON.stringify(args)).not.toContain(token);
  });

  it('surfaces a conflicting reuse of a request key without accepting the changed report', async () => {
    rpc.mockResolvedValueOnce({ data: { outcome: 'idempotency_conflict' }, error: null });
    const response = await POST(request('POST', { body: '{"event":"not_useful"}' }), context);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('feedback_idempotency_conflict');
  });

  it('keeps private reports out of provider/database failure responses', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: `provider failure ${row.intake.email} ${token}` } });
    const response = await POST(request('POST'), context);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain(row.intake.email);
    expect(text).not.toContain(token);
    expect(console.error).toHaveBeenCalledWith('[STUDIO]', 'database_unavailable');
  });
});
