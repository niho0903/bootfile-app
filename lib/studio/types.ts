/** Public, provider-independent contract for the paid Marketing Setup product. */
export const STUDIO_PRODUCT = {
  id: 'bootfile_marketing_setup',
  version: 'marketing-setup-v1',
  name: 'Bootfile Marketing Setup',
  amount: 4900,
  currency: 'usd',
  formatted: '$49',
} as const;

export const STUDIO_PLATFORMS = ['chatgpt', 'claude', 'gemini'] as const;
export type StudioPlatform = (typeof STUDIO_PLATFORMS)[number];

export interface StudioIntake {
  businessName: string;
  businessDescription: string;
  audience: string;
  offer: string;
  goal: string;
  approvedFacts: string;
  callToAction: string;
  voiceSample: string;
  constraints: string;
  email: string;
  platform: StudioPlatform;
  acceptedTerms: true;
}

export type StudioBrief = Omit<StudioIntake, 'email' | 'acceptedTerms' | 'platform'>;
export type StudioSourceField = 'businessName' | 'businessDescription' | 'audience' | 'offer' | 'goal' | 'approvedFacts' | 'callToAction' | 'constraints';

export interface StudioDraft {
  email: { subject: string; previewText: string; body: string };
  socialPosts: { label: string; body: string }[];
  sourceNotes: { field: StudioSourceField; quote: string }[];
}

export interface StudioBundle extends StudioDraft {
  schemaVersion: 1;
  businessBrief: StudioBrief;
  reusableWorkflow: {
    platform: StudioPlatform;
    setupSteps: string[];
    context: string;
    nextTaskPrompt: string;
    reviewSteps: string[];
  };
  qualityChecklist: string[];
  validation: { checks: string[]; requiresHumanReview: true };
}

export type StudioOrderStatus = 'awaiting_payment' | 'queued' | 'generating' | 'ready' | 'needs_attention' | 'cancelled';
export type StudioPaymentStatus = 'awaiting_payment' | 'paid' | 'expired' | 'refunded' | 'disputed';
export type StudioDeliveryStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface StudioOrderView {
  orderId: string;
  status: StudioOrderStatus;
  paymentStatus: StudioPaymentStatus;
  deliveryStatus: StudioDeliveryStatus | null;
  createdAt: string;
  refundStatus: 'none' | 'pending' | 'completed' | 'failed';
  refundAvailable: boolean;
  refundEligibleUntil: string | null;
  refundRequestedAt: string | null;
  result?: StudioBundle;
  error?: { code: string; message: string };
  retryAfterSeconds: number;
}

/** Server database row; never return this object directly to a browser. */
export interface StudioOrderRow {
  id: string;
  created_at: string;
  updated_at: string;
  checkout_expires_at: string;
  intake: StudioIntake;
  access_token_hash: string;
  product_version: string;
  amount_total: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: StudioPaymentStatus;
  status: StudioOrderStatus;
  generation_attempts: number;
  lease_token: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string;
  last_error_code: string | null;
  error_detail: string | null;
  output: StudioBundle | null;
  paid_at: string | null;
  ready_at: string | null;
  refund_status: 'none' | 'pending' | 'completed' | 'failed';
  refund_requested_at: string | null;
  stripe_refund_id: string | null;
  refunded_amount: number;
  refund_attempts: number;
  refund_next_attempt_at: string;
  refund_last_error_code: string | null;
}

export interface StudioDeliveryRow {
  order_id: string;
  status: StudioDeliveryStatus;
  attempts: number;
  lease_token: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string;
  first_attempt_at: string | null;
  provider_message_id: string | null;
  last_error_code: string | null;
  sent_at: string | null;
}
