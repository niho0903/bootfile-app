import { createStudioAccessToken, verifyStudioAccessToken } from './access';
import { studioBundleMarkdown } from './bundle';
import { studioBaseUrl } from './config';
import { StudioError } from './errors';
import type { StudioOrderRow } from './types';

/** Stable request body + key across retries; provider acceptance is persisted by the worker. */
export function studioDeliveryMessage(order: StudioOrderRow) {
  if (!order.output || order.payment_status !== 'paid' || order.refund_status !== 'none') throw new StudioError('delivery_not_ready', 'This order is not ready for delivery.');
  const token = createStudioAccessToken(order.id);
  if (!verifyStudioAccessToken(token, order.access_token_hash)) throw new StudioError('access_key_rotated', 'The original private delivery key needs recovery.');
  const link = `${studioBaseUrl()}/studio/order/${order.id}#access_token=${token}`;
  return {
    from: process.env.STUDIO_EMAIL_FROM || 'Bootfile <support@bootfile.ai>',
    to: [order.intake.email],
    reply_to: 'support@bootfile.ai',
    subject: 'Your Bootfile Marketing Setup is ready',
    text: `Your Marketing Setup is ready.\n\nOpen your private package: ${link}\n\nThe complete package is also attached as a Markdown text file you can save and open in any text editor. It includes your business brief, promotional email, three social posts, reusable workflow, and review checklist.\n\nPlease check every claim and link before publishing. The automated checks do not independently verify your business or every generated sentence.\n\nKeep this email: the link gives access to your private order.\n\nOrder: ${order.id}\n\nIf the setup is not right for you, open your private order within seven days of payment to request a full refund, or contact support@bootfile.ai.\n\nBootfile`,
    attachments: [{ filename: 'bootfile-marketing-setup.md', content: Buffer.from(studioBundleMarkdown(order.output), 'utf8').toString('base64'), content_type: 'text/markdown' }],
  };
}

export async function sendStudioDelivery(order: StudioOrderRow, fetcher: typeof fetch = fetch): Promise<string> {
  if (!process.env.RESEND_API_KEY) throw new StudioError('email_configuration_missing', 'Email delivery is unavailable.');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `studio-delivery/${order.id}/v1` },
    body: JSON.stringify(studioDeliveryMessage(order)),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new StudioError(response.status === 429 ? 'email_rate_limited' : 'email_provider_error', 'The delivery email could not be confirmed.');
  const body: unknown = await response.json();
  const id = body && typeof body === 'object' && 'id' in body ? body.id : null;
  if (typeof id !== 'string' || !id.length || id.length > 200) throw new StudioError('email_receipt_missing', 'The email provider did not return a delivery receipt.');
  return id;
}
