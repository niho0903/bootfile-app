import { brandIssues, normalizeBrandInput, TEXT_LIMITS, type BrandInput } from './kit';
import { PAID_BRAND_KIT_VERSION, synthesizeBrandKit, type PaidBrandKit } from './synthesis';

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
export function brandBackbriefSnapshot(input: BrandInput): string {
  return JSON.stringify(normalizeBrandInput(input));
}

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
  return { productVersion: PAID_BRAND_KIT_VERSION, brand, email, acceptedTerms: true, approvedBackbrief: true };
}

/** The durable order worker should call this only after verified payment and a valid lease. */
export async function generateApprovedPaidBrandKit(
  raw: unknown,
  fetcher: typeof fetch = fetch,
): Promise<{ kit: PaidBrandKit; usage: { model: string; input_tokens: number | null; output_tokens: number | null } }> {
  const intake = validatePaidBrandIntake(raw);
  return synthesizeBrandKit(intake.brand, fetcher);
}

