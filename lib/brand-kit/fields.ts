import type { BrandTextField } from './kit';

/**
 * The wording of each written question, and the names of the five steps. One copy, shared by the
 * preview flow and the revision editor on the paid order page, so the two cannot drift apart.
 */
export interface BrandFieldCopy { label: string; hint: string; placeholder: string; rows: number }

export const BRAND_FIELD_COPY: Record<BrandTextField, BrandFieldCopy> = {
  businessName: { label: 'What is your business called?', hint: 'The name your customers know.', placeholder: 'e.g. Juniper Home Organizing', rows: 1 },
  description: { label: 'What do you help people do?', hint: 'One or two plain-language sentences.', placeholder: 'We help busy households organize everyday spaces.', rows: 3 },
  audience: { label: 'Who is a particularly good fit?', hint: 'Describe a situation or need, not “everyone.”', placeholder: 'Households who want an easier-to-use kitchen.', rows: 2 },
  difference: { label: 'What is different about your approach?', hint: 'Optional. An honest difference is better than “the best.”', placeholder: 'We start with routines and storage people already have.', rows: 2 },
  proof: { label: 'What can you substantiate?', hint: 'Optional. Leave unknown results, credentials and guarantees out.', placeholder: 'Approved qualifications or evidence you can actually support.', rows: 2 },
  voiceNotes: { label: 'Make the voice more specific', hint: 'Optional. What would you say—or never sound like?', placeholder: 'Warm and practical, never precious.', rows: 2 },
  avoid: { label: 'What should your communications avoid?', hint: 'These exclusions travel with your public voice guidance.', placeholder: 'No guilt, fabricated scarcity, jargon or pressure.', rows: 2 },
  headingFont: { label: 'Existing heading font', hint: 'Optional. We preserve the name; no font file is installed or included.', placeholder: 'e.g. Georgia', rows: 1 },
  bodyFont: { label: 'Existing body font', hint: 'Optional. Check the font’s license and availability in your tool.', placeholder: 'e.g. Arial', rows: 1 },
  offer: { label: 'What is the one offer?', hint: 'Give this first campaign a clear focus.', placeholder: 'A practical kitchen reset', rows: 2 },
  facts: { label: 'Which details are confirmed?', hint: 'Use real prices, dates, location and inclusions. Say when something is undecided.', placeholder: 'We use existing storage. Pricing and availability are discussed before booking.', rows: 4 },
  callToAction: { label: 'What exactly should someone do next?', hint: 'This wording appears unchanged in the email and all three captions.', placeholder: 'Reply KITCHEN to ask about a kitchen reset.', rows: 2 },
};

export const BRAND_STEP_NAMES = ['About you', 'Your business', 'Your voice', 'Your look', 'Your first campaign'] as const;

/** Which written questions belong to which step. Step one is the eight choice questions. */
export const BRAND_STEP_FIELDS = {
  business: ['businessName', 'description', 'audience', 'difference', 'proof'],
  voice: ['voiceNotes', 'avoid'],
  look: ['headingFont', 'bodyFont'],
  campaign: ['offer', 'facts', 'callToAction'],
} as const satisfies Record<string, readonly BrandTextField[]>;

export const BRAND_COLOR_LABELS = { background: 'Background', ink: 'Text', accent: 'Accent' } as const;
