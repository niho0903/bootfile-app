import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GET } from '@/app/api/studio/orders/[id]/download/route';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { readyStudioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';
import type { StudioOrderRow } from './types';

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

let row: StudioOrderRow;
let token: string;
let maybeSingle: ReturnType<typeof vi.fn>;
const context = { params: Promise.resolve({ id: STUDIO_TEST_ORDER_ID }) };

beforeEach(() => {
  vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'test-private-download-secret-'.repeat(3));
  token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
  row = readyStudioOrderFixture();
  row.access_token_hash = hashStudioAccessToken(token);
  maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) };
  vi.mocked(getSupabaseAdmin).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getSupabaseAdmin>>);
});

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

function request(accessToken?: string) {
  return new NextRequest(`https://bootfile.ai/api/studio/orders/${STUDIO_TEST_ORDER_ID}/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

describe('private order download boundary', () => {
  it('does not query customer data without a bearer capability', async () => {
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(row.intake.businessName);
  });

  it('does not reveal an order to someone holding a different valid-format capability', async () => {
    const response = await GET(request('a'.repeat(43)), context);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(row.intake.businessName);
  });

  it('returns the saved package only to its holder with explicit private cache/referrer headers', async () => {
    const response = await GET(request(token), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(await response.text()).toContain(row.output!.email.subject);
  });

  it.each(['pending', 'failed', 'completed'] as const)('withholds output while refund status is %s', async refundStatus => {
    row.refund_status = refundStatus;
    const response = await GET(request(token), context);
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain(row.output!.email.subject);
  });

  it('fails closed when the durable database is unavailable', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue(null);
    const response = await GET(request(token), context);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
