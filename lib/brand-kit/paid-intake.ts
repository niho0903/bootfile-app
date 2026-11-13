import { createHash } from 'node:crypto';
import { brandBackbriefSnapshot, brandIssues, normalizeBrandInput, TEXT_LIMITS, type BrandInput } from './kit';
import { STUDIO_MODEL_BUDGETS } from '../studio/model-budget';
import { PAID_BRAND_KIT_VERSION, brandRequestBytes, synthesizeBrandKit, type BrandModelCall, type PaidBrandKit } from './synthesis';

/** A separate paid contract; existing marketing-setup-v1 orders must never be reinterpreted. */
export interface PaidBrandIntake {
  productVersion: typeof PAID_BRAND_KIT_VERSION;
  brand: BrandInput;
  email: string;
  acceptedTerms: true;
  approvedBackbrief: true;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** The browser stores this only after the customer checks the displayed backbrief. Any edit invalidates it. */
export { brandBackbriefSnapshot };

export function validatePaidBrandIntake(raw: unknown): PaidBrandIntake {
  if (!record(raw) || !record(raw.brand)) throw new Error('brand_intake_invalid');
  if (raw.productVersion !== PAID_BRAND_KIT_VERSION) throw new Error('brand_product_version_invalid');
  if (raw.acceptedTerms !== true) throw new Error('brand_terms_required');
  if (raw.approvedBackbrief !== true || typeof raw.approvalSnapshot !== 'string' || raw.approvalSnapshot !== brandBackbriefSnapshot(raw.brand as unknown as BrandInput)) throw new Error('brand_backbrief_approval_required');
  if (raw.approvalSnapshot.length > 12_000) throw new Error('brand_intake_invalid');
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (email.length < 5 || email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new Error('brand_email_invalid');
  // The preview normalizer truncates text for safety. A paid order must reject rather than silently alter it.
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    const value = raw.brand[field];
    if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('brand_intake_invalid');
  }
  const brand = normalizeBrandInput(raw.brand);
  if (brandIssues(brand).length) throw new Error('brand_intake_incomplete');
  // Refuse before checkout what the per-order model budget would refuse after payment.
  if (brandRequestBytes(brand) > STUDIO_MODEL_BUDGETS[PAID_BRAND_KIT_VERSION].maxRequestBytes) throw new Error('brand_intake_too_large');
  return { productVersion: PAID_BRAND_KIT_VERSION, brand, email, acceptedTerms: true, approvedBackbrief: true };
}

/** The durable order worker should call this only after verified payment and a valid lease. */
export async function generateApprovedPaidBrandKit(
  raw: unknown,
  fetcher: typeof fetch = fetch,
  beforeCall?: (call: BrandModelCall) => void,
): Promise<{ kit: PaidBrandKit; usage: { model: string; input_tokens: number | null; output_tokens: number | null } }> {
  const intake = validatePaidBrandIntake(raw);
  return synthesizeBrandKit(intake.brand, fetcher, beforeCall);
}


/** What a paid order row stores: the validated intake plus a digest of the approved backbrief, not a second copy of it. */
export interface PersistedPaidBrandIntake extends PaidBrandIntake { approvalSnapshotSha256: string }

function snapshotDigest(brand: BrandInput): string {
  return createHash('sha256').update(brandBackbriefSnapshot(brand)).digest('hex');
}

export function persistedPaidBrandIntake(raw: unknown): PersistedPaidBrandIntake {
  const intake = validatePaidBrandIntake(raw);
  return { ...intake, approvalSnapshotSha256: snapshotDigest(intake.brand) };
}

/** Re-checked at generation time: a saved brief that no longer matches what the customer approved never reaches a model. */
export function validatePersistedPaidBrandIntake(raw: unknown): PaidBrandIntake {
  if (!record(raw) || !record(raw.brand)) throw new Error('brand_intake_invalid');
  const brand = raw.brand as unknown as BrandInput;
  if (typeof raw.approvalSnapshotSha256 !== 'string' || raw.approvalSnapshotSha256 !== snapshotDigest(brand)) throw new Error('brand_backbrief_approval_required');
  return validatePaidBrandIntake({ ...raw, approvalSnapshot: brandBackbriefSnapshot(brand) });
}

/** The durable order worker calls this only after verified payment, with a valid lease and its budget guard. */
export async function generatePersistedPaidBrandKit(
  raw: unknown,
  fetcher: typeof fetch = fetch,
  beforeCall?: (call: BrandModelCall) => void,
): Promise<{ kit: PaidBrandKit; usage: { model: string; input_tokens: number | null; output_tokens: number | null } }> {
  const intake = validatePersistedPaidBrandIntake(raw);
  return synthesizeBrandKit(intake.brand, fetcher, beforeCall);
}
