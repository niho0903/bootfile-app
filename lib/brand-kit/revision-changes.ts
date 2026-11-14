import { QUESTIONS } from '@/lib/questions';
import { BRAND_FIELD_COPY, BRAND_STEP_FIELDS, BRAND_STEP_NAMES } from './fields';
import { VOICES, ownerProfile, visualSystem, type BrandInput, type BrandTextField } from './kit';

/** One changed answer, in the words the customer saw when they first gave it. */
export interface AnswerChange { step: string; label: string; value: string }

const [ABOUT, BUSINESS, VOICE, LOOK, CAMPAIGN] = BRAND_STEP_NAMES;
const EMPTY = 'Left empty';

function textChanges(step: string, fields: readonly BrandTextField[], before: BrandInput, after: BrandInput): AnswerChange[] {
  return fields.filter(field => before[field].trim() !== after[field].trim())
    .map(field => ({ step, label: BRAND_FIELD_COPY[field].label, value: after[field].trim() || EMPTY }));
}

/**
 * What a customer changed between the answers they first approved and the ones they are about to
 * send, in step order. Pure. A change in spacing alone is not a change, so the one revision cannot be
 * spent on it. Colors and named fonts count only while "keep my existing colors" is chosen, because
 * that is the only time they are used.
 */
export function answerChanges(before: BrandInput, after: BrandInput): AnswerChange[] {
  const changes: AnswerChange[] = [];
  const answered = QUESTIONS.filter(question => (before.answers[question.id] || '') !== (after.answers[question.id] || '')).length;
  if (answered) changes.push({ step: ABOUT, label: 'How you like to work', value: `${answered} of ${QUESTIONS.length} answers changed. Your style is now ${ownerProfile(after).name}.` });
  if (before.stage !== after.stage) changes.push({ step: BUSINESS, label: 'Where you are starting', value: after.stage === 'existing' ? 'Organize my existing brand' : 'Define an emerging brand' });
  changes.push(...textChanges(BUSINESS, BRAND_STEP_FIELDS.business, before, after));
  if (before.voice !== after.voice) changes.push({ step: VOICE, label: 'Your public voice', value: VOICES[after.voice].name });
  changes.push(...textChanges(VOICE, BRAND_STEP_FIELDS.voice, before, after));
  const own = (input: BrandInput) => input.palette === 'existing';
  const colors = (input: BrandInput) => [input.background, input.ink, input.accent].join(', ').toUpperCase();
  if (before.palette !== after.palette || (own(after) && colors(before) !== colors(after))) {
    const look = visualSystem(after);
    changes.push({ step: LOOK, label: 'Your colors', value: `${look.name}: ${[look.background, look.ink, look.accent].join(', ')}` });
  }
  if (own(after)) changes.push(...textChanges(LOOK, BRAND_STEP_FIELDS.look, before, after));
  changes.push(...textChanges(CAMPAIGN, BRAND_STEP_FIELDS.campaign, before, after));
  return changes;
}

/** "November 20" for the day the allowance runs until. Empty when there is no date to show. */
export function revisionDay(iso: string | null | undefined): string {
  const time = new Date(iso || '').getTime();
  return Number.isFinite(time) ? new Date(time).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
}
