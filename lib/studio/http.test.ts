import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/studio/orders/route';
import { createStudioCheckout } from './checkout';
import { readStudioText } from './http';

vi.mock('./checkout', () => ({ createStudioCheckout: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }) }));

afterEach(() => vi.clearAllMocks());

function streamedRequest(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const cancel = vi.fn();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel,
  }, { highWaterMark: 0 });
  const request = new NextRequest('https://bootfile.ai/api/studio/orders', {
    method: 'POST', headers, body, duplex: 'half',
  } as NonNullable<ConstructorParameters<typeof NextRequest>[1]> & { duplex: 'half' });
  return { request, cancel };
}

describe('bounded public request bodies', () => {
  it('decodes UTF-8 correctly when a multibyte character crosses a chunk boundary', async () => {
    const bytes = new TextEncoder().encode('A café');
    const { request } = streamedRequest([bytes.slice(0, 6), bytes.slice(6)]);
    expect(await readStudioText(request, bytes.byteLength)).toBe('A café');
  });

  it('counts actual bytes even when Content-Length is missing or understated', async () => {
    const variants: Record<string, string>[] = [{}, { 'content-length': '1' }];
    for (const headers of variants) {
      const { request, cancel } = streamedRequest([new Uint8Array(200), new Uint8Array(100), new Uint8Array(10_000)], headers);
      await expect(readStudioText(request, 256)).rejects.toMatchObject({ code: 'intake_too_large', status: 413 });
      expect(cancel).toHaveBeenCalledTimes(1);
    }
  });

  it('rejects an oversized declared body before obtaining a reader', async () => {
    const { request, cancel } = streamedRequest([new Uint8Array(20_001)], { 'content-length': '20001' });
    const reader = vi.spyOn(request.body!, 'getReader');
    await expect(readStudioText(request, 20_000)).rejects.toMatchObject({ status: 413 });
    expect(reader).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('stops the real intake route before creating an order or checkout for a large chunked body', async () => {
    const { request, cancel } = streamedRequest([new Uint8Array(10_000), new Uint8Array(10_001), new Uint8Array(50_000)]);
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ error: { code: 'intake_too_large' } });
    expect(createStudioCheckout).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
