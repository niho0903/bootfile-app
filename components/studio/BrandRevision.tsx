'use client';

import { useMemo, useRef, useState } from 'react';
import { QUESTIONS, type AnswerKey } from '@/lib/questions';
import { BRAND_COLOR_LABELS, BRAND_FIELD_COPY, BRAND_STEP_FIELDS, BRAND_STEP_NAMES } from '@/lib/brand-kit/fields';
import {
  PALETTES, TEXT_LIMITS, VOICES, brandBackbriefSnapshot, brandIssues, normalizeBrandInput, ownerProfile, visualSystem,
  type BrandInput, type BrandTextField, type PaletteId, type VoiceId,
} from '@/lib/brand-kit/kit';
import { answerChanges, revisionDay } from '@/lib/brand-kit/revision-changes';
import type { StudioRevisionView } from '@/lib/studio/types';
import './revision.css';

const [ABOUT, BUSINESS, VOICE, LOOK, CAMPAIGN] = BRAND_STEP_NAMES;
const NOT_SENT = 'We could not send your revision, and it has not been used. Please try again.';

/**
 * The one revision a paid Brand & AI Kit order may use. Shown only while a request would be accepted.
 * The customer's answers are fetched on their click, edited here, checked, approved and sent once.
 * Nothing is saved or sent before "Send my revision".
 */
export function BrandRevision({ orderId, token, revision, onSent }: { orderId: string; token: string; revision: StudioRevisionView; onSent: () => void }) {
  const [original, setOriginal] = useState<BrandInput | null>(null);
  const [input, setInput] = useState<BrandInput | null>(null);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [approved, setApproved] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const changes = useMemo(() => original && input ? answerChanges(original, input) : [], [original, input]);
  const issues = useMemo(() => input ? brandIssues(input) : [], [input]);
  const until = revisionDay(revision.availableUntil);
  const address = `/api/studio/orders/${encodeURIComponent(orderId)}/revision`;

  if (!revision.canRequest) return null;

  async function open() {
    if (opening) return;
    setOpening(true);
    setError('');
    try {
      const response = await fetch(address, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data.answers !== 'object') throw new Error(typeof data?.error?.message === 'string' ? data.error.message : 'We could not open your answers just now. Please try again.');
      const answers = normalizeBrandInput(data.answers);
      setOriginal(answers);
      setInput(answers);
      setApproved(false);
      requestAnimationFrame(() => title.current?.focus());
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : 'We could not open your answers just now. Please try again.');
    } finally { setOpening(false); }
  }

  function change<K extends keyof BrandInput>(field: K, value: BrandInput[K]) {
    setInput(current => current ? { ...current, [field]: value } : current);
    setApproved(false);
    setError('');
  }

  function cancel() { setOriginal(null); setInput(null); setApproved(false); setError(''); }

  async function send() {
    if (!input || sending || !approved || !changes.length || issues.length) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(address, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ brand: input, approvedBackbrief: true, approvalSnapshot: brandBackbriefSnapshot(input) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error?.message === 'string' ? data.error.message : NOT_SENT);
      setSent(true);
      onSent();
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'TimeoutError' ? failure.message : NOT_SENT);
      setSending(false);
    }
  }

  if (sent) {
    // The page's own notice takes over as soon as the order is read again. This covers the moment before.
    return <section className="kitRevise" role="status"><p className="kitReviseEyebrow">YOUR ONE REVISION</p><h2>Your revision was sent.</h2><p className="kitReviseLead">Your revised kit is being built from your new answers. Until it is ready, this page shows your first kit.</p></section>;
  }
  if (!input || !original) {
    return (
      <section className="kitRevise" aria-labelledby="kit-revise-title">
        <p className="kitReviseEyebrow">ONE REVISION INCLUDED</p>
        <h2 id="kit-revise-title">Something off? Change your answers once.</h2>
        <p className="kitReviseLead">If the kit missed because of what you told us, change your answers and we will build it again from them. You can do this one time{until ? `, until ${until}` : ''}. Editing the words yourself is yours to do as often as you like.</p>
        <div className="kitReviseActions"><button type="button" className="studio-button studio-button-small studio-button-secondary" onClick={open} disabled={opening}>{opening ? 'Opening your answers…' : 'Change my answers'}</button></div>
        <p className="kitReviseNote">Nothing changes until you send. Your first kit stays available to download.</p>
        {error ? <p role="alert" className="kitReviseError">{error}</p> : null}
      </section>
    );
  }

  const profile = ownerProfile(input);
  const look = visualSystem(input);
  const canSend = changes.length > 0 && issues.length === 0;
  const text = (name: BrandTextField) => {
    const { label, hint, placeholder, rows } = BRAND_FIELD_COPY[name];
    return (
      <label className="kitReviseField" key={name}>
        <span>{label}</span><small>{hint}</small>
        {rows === 1
          ? <input name={name} value={input[name]} maxLength={TEXT_LIMITS[name]} placeholder={placeholder} onChange={event => change(name, event.target.value)} />
          : <textarea name={name} value={input[name]} rows={rows} maxLength={TEXT_LIMITS[name]} placeholder={placeholder} onChange={event => change(name, event.target.value)} />}
        <em>{input[name].length} / {TEXT_LIMITS[name]}</em>
      </label>
    );
  };

  return (
    <section className="kitRevise kitReviseOpen" aria-labelledby="kit-revise-title">
      <p className="kitReviseEyebrow">YOUR ONE REVISION</p>
      <h2 id="kit-revise-title" tabIndex={-1} ref={title}>Change what you told us.</h2>
      <p className="kitReviseLead">Open the part you want to change. Everything else stays as you approved it. Nothing is sent until you choose Send my revision.</p>

      <details>
        <summary><span>{ABOUT}</span><small>{profile.name}</small></summary>
        <p className="kitReviseNote">Eight quick choices that say how you like to work with an AI assistant. They stay in your private copy.</p>
        {QUESTIONS.map((question, index) => (
          <fieldset className="kitReviseChoices" key={question.id}>
            <legend>{index + 1}. {question.text}</legend>
            {(Object.entries(question.answers) as [AnswerKey, { text: string }][]).map(([key, answer]) => (
              <label key={key} className={input.answers[question.id] === key ? 'selected' : ''}>
                <input type="radio" name={`revise-${question.id}`} value={key} checked={input.answers[question.id] === key} onChange={() => change('answers', { ...input.answers, [question.id]: key })} />
                <span>{answer.text}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </details>

      <details>
        <summary><span>{BUSINESS}</span><small>{input.businessName || 'Not yet named'}</small></summary>
        <fieldset className="kitReviseChoices kitReviseInline">
          <legend>Where are you starting?</legend>
          {([['new', 'Define an emerging brand'], ['existing', 'Organize my existing brand']] as const).map(([value, label]) => (
            <label key={value} className={input.stage === value ? 'selected' : ''}><input type="radio" name="revise-stage" checked={input.stage === value} onChange={() => change('stage', value)} /><span>{label}</span></label>
          ))}
        </fieldset>
        {BRAND_STEP_FIELDS.business.map(text)}
      </details>

      <details>
        <summary><span>{VOICE}</span><small>{VOICES[input.voice].name}</small></summary>
        <fieldset className="kitReviseChoices">
          <legend>Choose a public brand voice</legend>
          {(Object.entries(VOICES) as [VoiceId, (typeof VOICES)[VoiceId]][]).map(([key, voice]) => (
            <label key={key} className={input.voice === key ? 'selected' : ''}><input type="radio" name="revise-voice" checked={input.voice === key} onChange={() => change('voice', key)} /><span><b>{voice.name}</b> {voice.description}</span></label>
          ))}
        </fieldset>
        {BRAND_STEP_FIELDS.voice.map(text)}
      </details>

      <details>
        <summary><span>{LOOK}</span><small>{look.name}</small></summary>
        <fieldset className="kitReviseChoices">
          <legend>Choose your colors</legend>
          {(Object.entries(PALETTES) as [Exclude<PaletteId, 'existing'>, (typeof PALETTES)[Exclude<PaletteId, 'existing'>]][]).map(([key, palette]) => (
            <label key={key} className={input.palette === key ? 'selected' : ''}>
              <input type="radio" name="revise-palette" checked={input.palette === key} onChange={() => change('palette', key)} />
              <span><i className="kitReviseSwatches" aria-hidden="true">{[palette.background, palette.ink, palette.accent].map(color => <i key={color} style={{ background: color }} />)}</i><b>{palette.name}</b> {palette.description}</span>
            </label>
          ))}
          <label className={input.palette === 'existing' ? 'selected' : ''}><input type="radio" name="revise-palette" checked={input.palette === 'existing'} onChange={() => change('palette', 'existing')} /><span><b>Keep my existing colors</b> Use your real colors instead.</span></label>
        </fieldset>
        {input.palette === 'existing' ? <>
          <div className="kitReviseColors">{(['background', 'ink', 'accent'] as const).map(key => (
            <label key={key}><span>{BRAND_COLOR_LABELS[key]}</span><input type="color" value={input[key]} onChange={event => change(key, event.target.value.toUpperCase())} /><code>{input[key]}</code></label>
          ))}</div>
          {BRAND_STEP_FIELDS.look.map(text)}
        </> : null}
        <p className={look.textContrast >= 4.5 ? 'kitReviseNote' : 'kitReviseError'}>Text on background contrast: {look.textContrast.toFixed(2)}:1. {look.textContrast >= 4.5 ? 'Readable for normal text.' : 'Too faint. Choose a darker text color or a lighter background.'}</p>
      </details>

      <details>
        <summary><span>{CAMPAIGN}</span><small>{input.offer || 'No offer yet'}</small></summary>
        {BRAND_STEP_FIELDS.campaign.map(text)}
      </details>

      <div className="kitReviseReview">
        <h3>Check your changes</h3>
        <div aria-live="polite">
          {changes.length ? <ul className="kitReviseChanges">{changes.map(item => <li key={`${item.step}-${item.label}`}><small>{item.step}</small><b>{item.label}</b><span>{item.value}</span></li>)}</ul> : <p className="kitReviseNote">You have not changed anything yet. Open a part above to begin.</p>}
          {issues.length ? <ul className="kitReviseError">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
        </div>
        <label className="kitReviseConfirm"><input type="checkbox" checked={approved} disabled={!canSend || sending} onChange={event => setApproved(event.target.checked)} /><span>I have checked my answers, including these changes. Build my kit again from them. This uses my one revision.</span></label>
        <div className="kitReviseActions">
          <button type="button" className="studio-button studio-button-small" disabled={!approved || !canSend || sending} onClick={send}>{sending ? 'Sending…' : 'Send my revision'}</button>
          <button type="button" className="studio-button studio-button-small studio-button-secondary" disabled={sending} onClick={cancel}>Keep my kit as it is</button>
        </div>
        {error ? <p role="alert" className="kitReviseError">{error}</p> : null}
        <p className="kitReviseNote">The revised kit is a new draft. Check every claim in it before you publish, as you did with the first.</p>
      </div>
    </section>
  );
}
