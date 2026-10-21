import { describe, expect, it } from 'vitest';
import { STUDIO_PLATFORMS } from './types';
import { STUDIO_DEMO_BUNDLE, STUDIO_DEMO_INTAKE } from './demo';
import { assembleStudioBundle, studioBundleMarkdown } from './bundle';
import { validateStudioDraft, validateStudioIntake } from './validation';

describe('studio intake and source-grounded delivery checks', () => {
  it('normalizes the brief without accepting a client-specified price or payment state', () => {
    const intake = validateStudioIntake({ ...STUDIO_DEMO_INTAKE, email: '  Buyer@Example.COM  ', amount: 1, payment_status: 'paid' });
    expect(intake.email).toBe('buyer@example.com');
    expect(intake).not.toHaveProperty('amount');
    expect(intake).not.toHaveProperty('payment_status');
  });

  it.each([
    { acceptedTerms: false }, { businessDescription: 'tiny' }, { email: 'buyer@example.com\r\nBcc: other@example.com' },
    { approvedFacts: 'a'.repeat(2501) }, { platform: 'unknown' },
  ])('rejects missing consent, invalid inputs and unsupported platforms: %j', patch => {
    expect(() => validateStudioIntake({ ...STUDIO_DEMO_INTAKE, ...patch })).toThrow();
  });

  it('accepts the fictional sample and preserves the original business brief and review requirement', () => {
    const draft = validateStudioDraft(STUDIO_DEMO_BUNDLE, STUDIO_DEMO_INTAKE);
    const bundle = assembleStudioBundle(STUDIO_DEMO_INTAKE, draft);
    expect(bundle.businessBrief.approvedFacts).toBe(STUDIO_DEMO_INTAKE.approvedFacts);
    expect(bundle.businessBrief).not.toHaveProperty('email');
    expect(bundle.validation.requiresHumanReview).toBe(true);
    expect(studioBundleMarkdown(bundle)).toContain('Next-task prompt');
  });

  it.each(STUDIO_PLATFORMS)('preserves the selected %s assistant in a reusable workflow', platform => {
    const intake = validateStudioIntake({ ...STUDIO_DEMO_INTAKE, platform });
    const draft = validateStudioDraft(STUDIO_DEMO_BUNDLE, intake);
    const bundle = assembleStudioBundle(intake, draft);
    const name = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' }[platform];
    expect(bundle.reusableWorkflow.platform).toBe(platform);
    expect(bundle.reusableWorkflow.setupSteps[0]).toContain(name);
    expect(bundle.reusableWorkflow.context).toContain(intake.callToAction);
    expect(bundle.businessBrief).not.toHaveProperty('email');
  });

  it.each([
    'Save 25% when you book.', 'Visit https://invented.example/book for details.', 'Our award-winning team can help.',
    'Hello [Your Name].', '<script>alert(1)</script>', 'Contact invented@example.com.', 'Visit www.invented.example for details.',
  ])('rejects ungrounded or unusable additions before saving: %s', addition => {
    const draft = structuredClone(STUDIO_DEMO_BUNDLE);
    draft.email.body += `\n\n${addition}`;
    expect(() => validateStudioDraft(draft, STUDIO_DEMO_INTAKE)).toThrow();
  });

  it('rejects a fabricated source quotation and an omitted call to action', () => {
    const fabricated = structuredClone(STUDIO_DEMO_BUNDLE);
    fabricated.sourceNotes[0].quote = 'We are certified professional organizers.';
    expect(() => validateStudioDraft(fabricated, STUDIO_DEMO_INTAKE)).toThrow();
    const missingCta = structuredClone(STUDIO_DEMO_BUNDLE);
    missingCta.socialPosts[1].body = missingCta.socialPosts[1].body.replace(STUDIO_DEMO_INTAKE.callToAction, '');
    expect(() => validateStudioDraft(missingCta, STUDIO_DEMO_INTAKE)).toThrow();
  });

  it('rejects an incomplete or duplicate post package', () => {
    const incomplete = structuredClone(STUDIO_DEMO_BUNDLE);
    incomplete.socialPosts.pop();
    expect(() => validateStudioDraft(incomplete, STUDIO_DEMO_INTAKE)).toThrow();
    const duplicate = structuredClone(STUDIO_DEMO_BUNDLE);
    duplicate.socialPosts[1].body = duplicate.socialPosts[0].body;
    expect(() => validateStudioDraft(duplicate, STUDIO_DEMO_INTAKE)).toThrow();
  });
});
