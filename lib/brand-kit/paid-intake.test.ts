import { afterEach, describe, expect, it, vi } from 'vitest';
import { FICTIONAL_BRAND_INPUT } from './kit';
import { PAID_BRAND_KIT_VERSION } from './synthesis';
import { brandBackbriefSnapshot, generateApprovedPaidBrandKit, validatePaidBrandIntake } from './paid-intake';

function fixture() {
  const brand = structuredClone(FICTIONAL_BRAND_INPUT);
  return { productVersion: PAID_BRAND_KIT_VERSION, brand, email: 'Customer@Example.com', acceptedTerms: true, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(brand) };
}

afterEach(() => vi.unstubAllEnvs());

describe('paid Brand Kit intake', () => {
  it('binds approval to the exact backbrief and validates the paid version', () => {
    const intake = validatePaidBrandIntake(fixture());
    expect(intake.productVersion).toBe('brand-foundation-paid-v1');
    expect(intake.email).toBe('customer@example.com');
    expect(intake.approvedBackbrief).toBe(true);
    expect(intake).not.toHaveProperty('approvalSnapshot');
  });

  it('rejects an edited brief without new approval', () => {
    const changed = fixture(); changed.brand.offer = 'A different offer';
    expect(() => validatePaidBrandIntake(changed)).toThrow('brand_backbrief_approval_required');
  });

  it('does not silently truncate paid text or accept an incomplete quiz', () => {
    const long = fixture(); long.brand.businessName = 'x'.repeat(81); long.approvalSnapshot = brandBackbriefSnapshot(long.brand);
    expect(() => validatePaidBrandIntake(long)).toThrow('brand_intake_invalid');
    const incomplete = fixture(); incomplete.brand.answers = {}; incomplete.approvalSnapshot = brandBackbriefSnapshot(incomplete.brand);
    expect(() => validatePaidBrandIntake(incomplete)).toThrow('brand_intake_incomplete');
  });

  it('never contacts the model without approved intake, payment dispatch still absent', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-only');
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(generateApprovedPaidBrandKit({ ...fixture(), approvedBackbrief: false }, fetcher)).rejects.toThrow('brand_backbrief_approval_required');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

