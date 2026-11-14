import type { PaidBrandKit, PublicPaidBrandKit } from '../brand-kit/synthesis';

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
  /** Brand & AI Kit orders only. The public allowlist: private owner preferences are never in this view. */
  brandKit?: PublicPaidBrandKit;
  /** The public assistant instructions and review checklist, exactly as the downloaded public kit carries them. */
  brandKitGuide?: { assistantInstructions: string; reviewChecklist: string[] };
  product?: { version: string; name: string };
  /** Brand & AI Kit orders only, and only once the allowance is open or has been used. */
  revision?: StudioRevisionView;
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
  /** Read it only through lib/studio/outputs.ts, which ties the schema to product_version. */
  output: StudioBundle | PaidBrandKit | null;
  paid_at: string | null;
  ready_at: string | null;
  refund_status: 'none' | 'pending' | 'completed' | 'failed';
  refund_requested_at: string | null;
  stripe_refund_id: string | null;
  refunded_amount: number;
  refund_attempts: number;
  refund_next_attempt_at: string;
  refund_last_error_code: string | null;
  /** Present after studio_product_versions_v1. Null on unmetered marketing-setup-v1 orders. */
  model_call_limit?: number | null;
  model_cost_limit_microusd?: number | null;
  model_calls?: number | null;
  model_input_tokens?: number | null;
  model_output_tokens?: number | null;
  model_cost_microusd?: number | null;
  model_cost_estimated?: boolean | null;
  /** Present after studio_order_revisions_v1. Set once, when the order's one revision is requested. */
  revision_requested_at?: string | null;
}

export type StudioRevisionStatus = 'queued' | 'generating' | 'ready' | 'needs_attention';

/** Server database row for the one revision an order may have; never return this object to a browser. */
export interface StudioRevisionRow {
  order_id: string;
  created_at: string;
  updated_at: string;
  intake: unknown;
  intake_hash: string;
  status: StudioRevisionStatus;
  attempts: number;
  call_limit: number;
  order_cost_limit_microusd: number;
  calls_recorded: number;
  lease_token: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string;
  last_error_code: string | null;
  /** Read it only through currentBrandKit, which ties the schema to the order's product version. */
  output: PaidBrandKit | null;
  ready_at: string | null;
}

/** What the order page may know about the revision. No answers and no kit: those travel separately. */
export interface StudioRevisionView {
  /** 'none' until the customer uses the allowance. */
  status: 'none' | StudioRevisionStatus;
  /** True only while a request would be accepted: open, delivered, inside the window and not yet used. */
  canRequest: boolean;
  availableUntil: string | null;
  requestedAt: string | null;
  readyAt: string | null;
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
