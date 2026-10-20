import { createHash } from 'node:crypto';
import { STUDIO_ORDER_ID_PATTERN } from './access';
import { studioRpc } from './db';
import { StudioError } from './errors';
import { isStudioFeedbackView, type StudioFeedbackEvent, type StudioFeedbackView } from './feedback-types';
import type { StudioOrderRow } from './types';

type FeedbackRpcResult = { outcome: 'available' | 'saved' | 'replayed' | 'unavailable' | 'idempotency_conflict' | 'rate_limited' | 'invalid_request'; feedback?: StudioFeedbackView };

export function parseStudioFeedback(body: string): StudioFeedbackEvent {
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw invalidFeedback(); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || !('event' in value)
    || typeof value.event !== 'string' || !['useful', 'not_useful', 'used', 'reused'].includes(value.event)) throw invalidFeedback();
  return value.event as StudioFeedbackEvent;
}

function invalidFeedback() {
  return new StudioError('invalid_feedback', 'Choose one of the feedback options on your order page.', 400);
}

function requireAvailablePack(order: StudioOrderRow) {
  if (order.status !== 'ready' || order.payment_status !== 'paid' || !order.output || order.refund_status !== 'none' || order.refund_requested_at) {
    throw new StudioError('feedback_unavailable', 'Feedback is available while your paid pack is open.', 409);
  }
}

function feedbackResult(result: FeedbackRpcResult): StudioFeedbackView {
  if (result.outcome === 'unavailable') throw new StudioError('feedback_unavailable', 'Feedback is available while your paid pack is open.', 409);
  if (result.outcome === 'idempotency_conflict') throw new StudioError('feedback_idempotency_conflict', 'This feedback attempt has changed. Refresh the page before trying again.', 409);
  if (result.outcome === 'rate_limited') throw new StudioError('feedback_rate_limited', 'Your earlier feedback is saved. Please wait before changing it again.', 429);
  if (result.outcome === 'invalid_request') throw invalidFeedback();
  if (!['available', 'saved', 'replayed'].includes(result.outcome) || !isStudioFeedbackView(result.feedback)) throw new StudioError('feedback_unavailable', 'We couldn’t read your feedback just now. Please try again.');
  return result.feedback;
}

export async function readStudioFeedback(order: StudioOrderRow): Promise<StudioFeedbackView> {
  requireAvailablePack(order);
  return feedbackResult(await studioRpc<FeedbackRpcResult>('studio_read_feedback', { p_order_id: order.id, p_access_token_hash: order.access_token_hash }));
}

export async function saveStudioFeedback(order: StudioOrderRow, event: StudioFeedbackEvent, requestKey: string | null): Promise<StudioFeedbackView> {
  requireAvailablePack(order);
  if (!requestKey || !STUDIO_ORDER_ID_PATTERN.test(requestKey)) throw new StudioError('feedback_request_key_required', 'Please send feedback from your order page.', 400);
  const requestHash = createHash('sha256').update(`studio:feedback:v1:${order.id}:${requestKey.toLowerCase()}`).digest('hex');
  return feedbackResult(await studioRpc<FeedbackRpcResult>('studio_record_feedback', {
    p_order_id: order.id, p_access_token_hash: order.access_token_hash, p_request_key_hash: requestHash, p_event: event,
  }));
}
