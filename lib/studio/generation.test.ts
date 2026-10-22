import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateStudioBundle } from './generation';
import { STUDIO_DEMO_BUNDLE, STUDIO_DEMO_INTAKE } from './demo';
import { studioDeliveryMessage, sendStudioDelivery } from './delivery';
import { createStudioAccessToken, hashStudioAccessToken } from './access';
import { readyStudioOrderFixture, STUDIO_TEST_ORDER_ID } from './test-fixtures';

afterEach(() => vi.unstubAllEnvs());

describe('bounded generation and durable email request', () => {
  it('makes one capped structured provider call and excludes the customer delivery email', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'deliver_marketing_setup', input: STUDIO_DEMO_BUNDLE }], usage: { input_tokens: 500, output_tokens: 800 } }), { status: 200 })) as unknown as typeof fetch;
    const generated = await generateStudioBundle(STUDIO_DEMO_INTAKE, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).max_tokens).toBe(4000);
    expect(String(request.body)).not.toContain(STUDIO_DEMO_INTAKE.email);
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(generated.bundle.email.subject).toBe(STUDIO_DEMO_BUNDLE.email.subject);
  });

  it('does not loop or deliver partial content when the provider refuses or truncates', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'partial' }] }), { status: 200 })) as unknown as typeof fetch;
    await expect(generateStudioBundle(STUDIO_DEMO_INTAKE, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('replays exactly the same email body and idempotency key, including the saved attachment', async () => {
    vi.stubEnv('STUDIO_ACCESS_TOKEN_SECRET', 'test-capability-secret-'.repeat(3));
    vi.stubEnv('RESEND_API_KEY', 'test-only');
    const order = readyStudioOrderFixture();
    const token = createStudioAccessToken(STUDIO_TEST_ORDER_ID);
    order.access_token_hash = hashStudioAccessToken(token);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'email_test_receipt' }), { status: 200 })) as unknown as typeof fetch;
    await sendStudioDelivery(order, fetcher);
    await sendStudioDelivery(order, fetcher);
    const calls = (fetcher as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1].body).toBe(calls[1][1].body);
    expect(calls[0][1].headers['Idempotency-Key']).toBe(calls[1][1].headers['Idempotency-Key']);
    const message = studioDeliveryMessage(order);
    expect(message.text).toContain(`#access_token=${token}`);
    expect(Buffer.from(message.attachments[0].content, 'base64').toString('utf8')).toContain(order.output!.email.subject);
  });

  it('never sends an unpaid, refund-pending or incomplete order', () => {
    const order = readyStudioOrderFixture();
    expect(() => studioDeliveryMessage({ ...order, payment_status: 'awaiting_payment' })).toThrow();
    expect(() => studioDeliveryMessage({ ...order, refund_status: 'pending' })).toThrow();
    expect(() => studioDeliveryMessage({ ...order, refund_status: 'failed' })).toThrow();
    expect(() => studioDeliveryMessage({ ...order, output: null })).toThrow();
  });
});
