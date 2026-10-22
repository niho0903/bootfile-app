import { StudioError } from './errors';
import { STUDIO_PLATFORMS, type StudioDraft, type StudioIntake, type StudioSourceField } from './types';

export const STUDIO_FIELD_LIMITS = {
  businessName: [2, 120], businessDescription: [15, 1500], audience: [8, 800],
  offer: [15, 1500], goal: [5, 500], approvedFacts: [10, 2500], callToAction: [5, 700],
  voiceSample: [0, 1500], constraints: [0, 1000], email: [5, 254],
} as const;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function plainText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\r\n/g, '\n').trim();
  if (text.length < min || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return null;
  return text;
}

export function validateStudioIntake(value: unknown): StudioIntake {
  if (!record(value)) throw new StudioError('invalid_intake', 'Please complete the business brief.', 400);
  const normalized: Record<string, unknown> = {};
  for (const [field, [min, max]] of Object.entries(STUDIO_FIELD_LIMITS)) {
    const text = plainText(value[field] ?? (min === 0 ? '' : undefined), min, max);
    if (text === null) throw new StudioError('invalid_intake', `Please check ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} (${min}–${max} characters).`, 400);
    normalized[field] = text;
  }
  const email = String(normalized.email).toLowerCase();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || /[\r\n]/.test(email)) throw new StudioError('invalid_email', 'Enter a valid delivery email address.', 400);
  if (!STUDIO_PLATFORMS.includes(value.platform as StudioIntake['platform'])) throw new StudioError('invalid_platform', 'Choose ChatGPT, Claude, or Gemini.', 400);
  if (value.acceptedTerms !== true) throw new StudioError('terms_required', 'Please accept the terms and confirm you can use these business details.', 400);
  return { ...normalized, email, platform: value.platform, acceptedTerms: true } as StudioIntake;
}

export const STUDIO_SOURCE_FIELDS: StudioSourceField[] = ['businessName', 'businessDescription', 'audience', 'offer', 'approvedFacts', 'callToAction'];

function draftText(value: unknown, min: number, max: number, field: string): string {
  const text = plainText(value, min, max);
  if (text === null) throw new StudioError('output_invalid', `Generated ${field} did not pass format validation.`);
  if (/<\/?[a-z][^>]*>/i.test(text) || /\[(?:insert|your|name|link|date|business|offer|cta|placeholder)[^\]]*\]/i.test(text) || /\b(?:sk-(?:live|test|ant)-[A-Za-z0-9_-]+|whsec_[A-Za-z0-9]+|BEGIN PRIVATE KEY)\b/.test(text)) {
    throw new StudioError('output_invalid', 'Generated content contains unsupported markup or placeholders.');
  }
  return text;
}

/** Structural and lexical checks, not a claim that every sentence has been fact-checked. */
export function validateStudioDraft(value: unknown, intake: StudioIntake): StudioDraft {
  if (!record(value) || !record(value.email) || !Array.isArray(value.socialPosts) || value.socialPosts.length !== 3 || !Array.isArray(value.sourceNotes) || value.sourceNotes.length < 1 || value.sourceNotes.length > 20) {
    throw new StudioError('output_invalid', 'The generated package was incomplete.');
  }
  const email = {
    subject: draftText(value.email.subject, 5, 100, 'email subject'),
    previewText: draftText(value.email.previewText, 10, 180, 'email preview'),
    body: draftText(value.email.body, 180, 3500, 'email body'),
  };
  const socialPosts = value.socialPosts.map((post: unknown, i: number) => {
    if (!record(post)) throw new StudioError('output_invalid', 'A social post was incomplete.');
    return { label: ['Introduce the offer', 'Explain the fit', 'Invite the next step'][i], body: draftText(post.body, 60, 1600, 'social post') };
  });
  const sourceNotes = value.sourceNotes.map((note: unknown) => {
    if (!record(note) || !STUDIO_SOURCE_FIELDS.includes(note.field as StudioSourceField)) throw new StudioError('output_ungrounded', 'A source reference was invalid.');
    const field = note.field as StudioSourceField;
    const quote = draftText(note.quote, 3, 900, 'source reference');
    if (!intake[field].includes(quote)) throw new StudioError('output_ungrounded', 'A source reference did not match the submitted brief.');
    return { field, quote };
  });
  const generated = [email.subject, email.previewText, email.body, ...socialPosts.map(p => p.body)].join('\n');
  const source = STUDIO_SOURCE_FIELDS.map(field => intake[field]).join('\n');
  const numbers = generated.match(/\d+(?:[.,]\d+)*(?:%|\+)?/g) || [];
  const allowedNumbers = new Set(source.match(/\d+(?:[.,]\d+)*(?:%|\+)?/g) || []);
  if (numbers.some(n => !allowedNumbers.has(n))) throw new StudioError('output_ungrounded', 'Generated content introduced a number not in the brief.');
  const links = generated.match(/(?:https?:\/\/|www\.)[^\s<>\])]+/gi) || [];
  if (links.some(link => !source.includes(link.replace(/[.,!?]+$/, '')))) throw new StudioError('output_ungrounded', 'Generated content introduced a link not in the brief.');
  const emails = generated.match(/[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  if (emails.some(email => !source.toLowerCase().includes(email.toLowerCase()))) throw new StudioError('output_ungrounded', 'Generated content introduced an email address not in the brief.');
  for (const phrase of ['guaranteed', 'award-winning', 'certified', 'limited time', 'risk-free', 'money-back', 'best-selling', 'free consultation']) {
    if (generated.toLowerCase().includes(phrase) && !source.toLowerCase().includes(phrase)) throw new StudioError('output_ungrounded', 'Generated content introduced an unsupported promotional claim.');
  }
  if (![email.body, ...socialPosts.map(p => p.body)].every(text => text.includes(intake.callToAction))) {
    throw new StudioError('output_ungrounded', 'A draft did not preserve the approved call to action.');
  }
  if (new Set(socialPosts.map(p => p.body.toLowerCase())).size !== 3) throw new StudioError('output_invalid', 'The social posts were duplicated.');
  return { email, socialPosts, sourceNotes };
}
