'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { STUDIO_PRODUCT, type StudioIntake } from '@/lib/studio/types';
import { STUDIO_FIELD_LIMITS } from '@/lib/studio/validation';
import { ArrowIcon, CheckIcon, DocumentIcon, Eyebrow, StudioNotice, studioColors as c, studioContainer } from './StudioChrome';
import { useStudioBrowserReady } from './useStudioBrowserReady';

type TextField = keyof typeof STUDIO_FIELD_LIMITS;
type FormValues = Record<TextField, string>;
type CheckoutResponse = { orderId: string; accessToken: string; checkoutUrl: string };
type StudioConfig = { checkoutEnabled: boolean; price: { amount: number; currency: string; formatted: string }; productName: string };

const EMPTY_FORM: FormValues = { businessName: '', businessDescription: '', audience: '', offer: '', goal: '', approvedFacts: '', callToAction: '', voiceSample: '', constraints: '', email: '' };
const STEP_FIELDS: TextField[][] = [['businessName', 'businessDescription', 'audience'], ['offer', 'goal', 'approvedFacts', 'callToAction'], ['email']];
const LABELS: Record<TextField, string> = { businessName: 'Business name', businessDescription: 'What you do', audience: 'Who this is for', offer: 'Your offer', goal: 'Your goal', approvedFacts: 'Details we can use', callToAction: 'The next step', voiceSample: 'Your voice', constraints: 'Things to avoid', email: 'Delivery email' };
const DRAFT_KEY = 'bootfile:studio:draft:v1';

export function StudioIntakeForm() {
  const browserReady = useStudioBrowserReady();
  if (!browserReady) return <main id="main-content" style={{ ...studioContainer, maxWidth: 1020, paddingTop: 60, paddingBottom: 76, minHeight: '65vh' }}><Eyebrow>Marketing Setup</Eyebrow><h1 className="font-heading" style={{ fontSize: 38, fontWeight: 400 }}>Let’s start with your business.</h1><p role="status" style={{ color: c.muted, fontSize: 14, marginTop: 20 }}>Opening your brief…</p></main>;
  return <StudioIntakeEditor />;
}

function readStoredDraft(): FormValues {
  const restored = { ...EMPTY_FORM };
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return restored;
    const saved: unknown = JSON.parse(raw);
    if (saved && typeof saved === 'object' && 'updatedAt' in saved && 'values' in saved && typeof saved.updatedAt === 'number' && saved.updatedAt <= Date.now() && Date.now() - saved.updatedAt < 86_400_000 && saved.values && typeof saved.values === 'object') {
      const values = saved.values as Record<string, unknown>;
      for (const key of Object.keys(EMPTY_FORM) as TextField[]) {
        if (key !== 'email' && typeof values[key] === 'string') restored[key] = values[key].slice(0, STUDIO_FIELD_LIMITS[key][1]);
      }
    }
  } catch { /* The form also works when browser storage is unavailable. */ }
  return restored;
}

function StudioIntakeEditor() {
  const [form, setForm] = useState<FormValues>(readStoredDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<TextField, string>>>({});
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [draftRestored, setDraftRestored] = useState(() => Object.values(form).some(Boolean));
  const checkoutResponse = useRef<CheckoutResponse | null>(null);
  const requestKey = useRef<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/studio/config', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('unavailable'); return response.json() as Promise<StudioConfig>; })
      .then(value => setConfig(value))
      .catch(error => { if (error.name !== 'AbortError') setConfigFailed(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const { email: omittedEmail, ...values } = form;
      void omittedEmail;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ updatedAt: Date.now(), values }));
    } catch { /* Saving a draft must never block editing it. */ }
  }, [form]);

  function updateField(field: TextField, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    if (field !== 'email') setFactsConfirmed(false);
    setSubmitError('');
    checkoutResponse.current = null;
    requestKey.current = null;
  }

  function goToStep(nextStep: number) {
    setStep(nextStep);
    setErrors({});
    setSubmitError('');
    requestAnimationFrame(() => document.getElementById('studio-step-title')?.focus());
  }

  function validate(fields: TextField[]) {
    const nextErrors: Partial<Record<TextField, string>> = {};
    for (const field of fields) {
      const value = form[field].trim();
      const [min, max] = STUDIO_FIELD_LIMITS[field];
      if (!value) nextErrors[field] = `Please add ${field === 'email' ? 'your delivery email' : LABELS[field].toLowerCase()}.`;
      else if (value.length < min) nextErrors[field] = `Add a little more detail (at least ${min} characters).`;
      else if (value.length > max) nextErrors[field] = `Keep this under ${max} characters.`;
      else if (field === 'email' && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)) nextErrors.email = 'Enter a valid email address.';
    }
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (firstField) requestAnimationFrame(() => document.getElementById(`studio-${firstField}`)?.focus());
    return !firstField;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!validate(STEP_FIELDS[step])) return;
    if (step < 2) { goToStep(step + 1); return; }
    if (!factsConfirmed || !termsAccepted) { setSubmitError('Confirm your brief and accept the Terms to continue.'); return; }
    if (!config?.checkoutEnabled) { setSubmitError('Purchasing is unavailable right now. Your brief can stay here while you explore the example.'); return; }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      let result = checkoutResponse.current;
      if (!result) {
        requestKey.current ??= crypto.randomUUID();
        const intake: StudioIntake = { ...form, platform: 'chatgpt', acceptedTerms: true };
        const response = await fetch('/api/studio/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current }, body: JSON.stringify(intake), signal: AbortSignal.timeout(30_000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error?.message === 'string' ? data.error.message : typeof data.error === 'string' ? data.error : 'We couldn’t open checkout. Please try again.');
        if (typeof data.orderId !== 'string' || typeof data.accessToken !== 'string' || typeof data.checkoutUrl !== 'string') throw new Error('We couldn’t open checkout. Please try again.');
        result = data as CheckoutResponse;
        checkoutResponse.current = result;
      }
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('We couldn’t open checkout. Please contact support if this continues.');
      try {
        sessionStorage.setItem(`bootfile:studio:${result.orderId}`, result.accessToken);
        sessionStorage.setItem('bootfile:studio:last-order', result.orderId);
      } catch {
        throw new Error('Your browser couldn’t keep your private order link. Allow site storage or use another browser, then try again. You haven’t paid yet.');
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We couldn’t open checkout. Please try again.');
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  const available = config?.checkoutEnabled === true;
  const stepTitles = ['Let’s start with your business.', 'What are you promoting?', 'Make sure this sounds like you.'];
  const stepDescriptions = ['A few clear details give your marketing a better starting point.', 'Choose one offer. Add the facts a customer needs to decide.', 'This is the brief your setup will use. You can edit any detail before paying.'];

  function field(name: TextField, label: string, hint: string, placeholder: string, rows?: number) {
    return <IntakeField key={name} name={name} label={label} hint={hint} placeholder={placeholder} rows={rows} value={form[name]} error={errors[name]} onChange={value => updateField(name, value)} />;
  }

  return (
    <main id="main-content" style={{ ...studioContainer, maxWidth: 1020, paddingTop: 45, paddingBottom: 76 }}>
      <ol aria-label="Your progress" style={{ display: 'flex', listStyle: 'none', gap: '16px 26px', flexWrap: 'wrap', marginBottom: 43 }}>
        {['Your business', 'Your promotion', 'Review & checkout'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: step === index ? c.ink : c.muted }}><span style={{ width: 23, height: 23, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: step >= index ? c.green : c.wash, color: step >= index ? c.paper : c.muted }}>{step > index ? <CheckIcon size={13} /> : index + 1}</span>{label}</li>)}
      </ol>
      {config?.checkoutEnabled === false || configFailed ? <div style={{ marginBottom: 28 }}><StudioNotice>Marketing Setup isn’t accepting new orders right now. You can prepare a brief here or <Link href="/studio/sample" className="studio-text-link">explore the example</Link>.</StudioNotice></div> : null}
      <div className="studio-intake-grid">
        <div>
          <Eyebrow>Marketing Setup · Step {step + 1} of 3</Eyebrow>
          <h1 id="studio-step-title" tabIndex={-1} className="font-heading" style={{ fontWeight: 400, fontSize: 'clamp(30px, 4vw, 41px)', lineHeight: 1.18, letterSpacing: '-.02em', outline: 'none' }}>{stepTitles[step]}</h1>
          <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.8, margin: '14px 0 27px' }}>{stepDescriptions[step]}</p>
          {draftRestored && step === 0 ? <p style={{ fontSize: 12, color: c.green, marginBottom: 18 }}>Your earlier brief from this tab is here. <button type="button" className="studio-inline-button" onClick={() => { setForm(EMPTY_FORM); setDraftRestored(false); checkoutResponse.current = null; requestKey.current = null; }}>Start fresh</button></p> : null}
          <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <div className="studio-form-panel">
              {step === 0 ? <div style={{ display: 'grid', gap: 26 }}>
                {field('businessName', 'What’s your business called?', 'Use the name your customers know.', 'e.g. Juniper Home Organizing')}
                {field('businessDescription', 'What do you do?', 'One or two sentences about the service you provide.', 'e.g. I help busy households sort their spaces and create practical systems using what they already own.', 4)}
                {field('audience', 'Who do you want to reach?', 'Describe the people this particular offer is for.', 'e.g. Busy households who want a kitchen that’s easier to use.', 3)}
                <p style={{ fontSize: 11, color: c.muted, lineHeight: 1.7 }}>Use business information you’re comfortable sharing. Leave out private customer details, passwords, and sensitive records.</p>
              </div> : step === 1 ? <div style={{ display: 'grid', gap: 26 }}>
                {field('offer', 'What’s the offer?', 'Describe one service, booking opportunity, or promotion.', 'e.g. A kitchen reset session to sort everyday essentials and choose a practical place for them.', 4)}
                {field('goal', 'What should this promotion help you do?', 'Keep it focused on the next useful step.', 'e.g. Get interested households to ask about a kitchen reset.', 2)}
                {field('approvedFacts', 'Which details can we include?', 'Add confirmed prices, dates, location, inclusions, or availability. Say when something is still undecided.', 'e.g. We use the storage the customer already has. Pricing and availability are discussed before booking.', 5)}
                {field('callToAction', 'What exactly should someone do next?', 'Write a line we can use in the email and every post. Include your real link if there is one.', 'e.g. Reply KITCHEN to ask about a kitchen reset.', 3)}
                <details style={{ borderTop: `1px solid ${c.line}`, paddingTop: 22 }}>
                  <summary style={{ cursor: 'pointer', color: c.green, fontSize: 13, fontWeight: 500 }}>Make it sound more like you <span style={{ color: c.muted, fontWeight: 400 }}>(optional)</span></summary>
                  <div style={{ display: 'grid', gap: 24, marginTop: 23 }}>
                    {field('voiceSample', 'A little of your own writing', 'Paste a short example or describe the tone you want. This guides style, not business facts.', 'e.g. Warm and practical. “A home can work for you without looking like a showroom.”', 4)}
                    {field('constraints', 'Anything to avoid?', 'Words, claims, topics, or details that don’t belong in your promotion.', 'e.g. No countdowns, invented discounts, or promises about results.', 3)}
                  </div>
                </details>
              </div> : <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 23 }}><h2 style={{ fontSize: 15, fontWeight: 550 }}>Your business brief</h2><span style={{ color: c.green }}><DocumentIcon /></span></div>
                <dl style={{ display: 'grid', gap: 19 }}>
                  {(Object.keys(LABELS) as TextField[]).filter(key => key !== 'email' && form[key].trim()).map(key => <div key={key} style={{ paddingBottom: 18, borderBottom: `1px solid ${c.line}` }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}><dt style={{ fontSize: 11, color: c.muted }}>{LABELS[key]}</dt><button type="button" className="studio-inline-button" disabled={submitting} onClick={() => goToStep(STEP_FIELDS[0].includes(key) ? 0 : 1)} aria-label={`Edit ${LABELS[key].toLowerCase()}`}>Edit</button></div><dd style={{ fontSize: 14, marginTop: 5, lineHeight: 1.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{form[key]}</dd></div>)}
                </dl>
                <div style={{ marginTop: 24 }}><label className="studio-choice"><input type="checkbox" checked={factsConfirmed} onChange={event => setFactsConfirmed(event.target.checked)} disabled={submitting} /><span>I’ve checked this brief. These are the business facts I want my setup to use.</span></label></div>
                <div style={{ borderTop: `1px solid ${c.line}`, marginTop: 27, paddingTop: 27 }}>
                  {field('email', 'Where should we send your pack?', 'Use an email you can access. Your private order link and finished pack go here.', 'you@example.com')}
                  <p style={{ color: c.muted, fontSize: 11, marginTop: 9 }}>For your purchase and delivery. No newsletter signup.</p>
                </div>
                <div style={{ background: c.wash, borderRadius: 9, padding: '18px 20px', marginTop: 27 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline' }}><span style={{ fontSize: 13, fontWeight: 550 }}>Marketing Setup</span><span style={{ fontSize: 21, fontWeight: 500 }}>{STUDIO_PRODUCT.formatted}</span></div>
                  <p style={{ color: c.muted, fontSize: 11, marginTop: 5 }}>USD · one-time purchase · ChatGPT setup included</p>
                  <p style={{ fontSize: 12, color: c.green, marginTop: 12, lineHeight: 1.8 }}>Your brief, one email, three social posts, reusable setup, and review checklist.</p>
                </div>
                <div style={{ marginTop: 22 }}><label className="studio-choice"><input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} disabled={submitting} /><span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: c.green, textDecoration: 'underline' }}>Terms</Link> and have read the <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: c.green, textDecoration: 'underline' }}>Privacy Policy</Link>. I have permission to use these business details.</span></label></div>
              </>}
            </div>
            {submitError ? <div style={{ marginTop: 20 }}><StudioNotice tone="error">{submitError}</StudioNotice></div> : null}
            <div style={{ display: 'flex', justifyContent: step > 0 ? 'space-between' : 'flex-end', alignItems: 'center', gap: 18, marginTop: 25 }}>
              {step > 0 ? <button type="button" className="studio-text-link" style={{ background: 'none', border: 0, cursor: 'pointer', padding: '12px 0' }} disabled={submitting} onClick={() => goToStep(step - 1)}><ArrowIcon direction="left" />Back</button> : null}
              <button type="submit" className="studio-button" disabled={submitting || (step === 2 && (!available || !factsConfirmed || !termsAccepted))}>{submitting ? <><span className="studio-spinner" aria-hidden="true" />Opening checkout…</> : step === 0 ? <>Next: your promotion <ArrowIcon /></> : step === 1 ? <>Review my brief <ArrowIcon /></> : <>Continue to payment · {STUDIO_PRODUCT.formatted} <ArrowIcon /></>}</button>
            </div>
            {step === 2 ? <p style={{ fontSize: 11, color: c.muted, textAlign: 'right', marginTop: 13 }}>{!config && !configFailed ? 'Checking availability…' : 'Payment is handled by Stripe. 7-day refund policy.'}</p> : null}
          </form>
        </div>
        <aside className="studio-intake-aside" style={{ paddingTop: 42 }}>
          <div style={{ padding: '25px 23px', border: `1px solid ${c.line}`, borderRadius: 13, background: c.wash }}>
            <span style={{ color: c.green }}><DocumentIcon kind="spark" /></span>
            <h2 className="font-heading" style={{ fontSize: 25, lineHeight: 1.25, fontWeight: 400, margin: '16px 0 12px' }}>One offer.<br />A useful starting point.</h2>
            <p style={{ fontSize: 12, lineHeight: 1.85, color: c.muted }}>You bring the business details. Your pack connects them to a clear next step for your customers.</p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 14, margin: '23px 0', padding: '23px 0', borderTop: '1px solid #D6DDCB', borderBottom: '1px solid #D6DDCB' }}>
              {['Your confirmed business brief', 'A customer email', 'Three social posts', 'A reusable ChatGPT setup', 'A review checklist'].map(item => <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: c.green, fontSize: 12 }}><CheckIcon size={15} />{item}</li>)}
            </ul>
            <p style={{ fontSize: 13, fontWeight: 550 }}>{STUDIO_PRODUCT.formatted} once. No subscription.</p>
            <Link href="/studio/sample" target="_blank" className="studio-text-link" style={{ fontSize: 12, marginTop: 19 }}>Open the example <ArrowIcon /></Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function IntakeField({ name, label, hint, placeholder, rows, value, error, onChange }: {
  name: TextField; label: string; hint: string; placeholder: string; rows?: number; value: string; error?: string; onChange: (value: string) => void;
}) {
  const id = `studio-${name}`;
  const shared = { id, name, value, placeholder, maxLength: STUDIO_FIELD_LIMITS[name][1], 'aria-invalid': !!error, 'aria-describedby': `${id}-hint${error ? ` ${id}-error` : ''}`, className: 'studio-field', onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <div><label htmlFor={id} style={{ display: 'block', fontSize: 14, fontWeight: 550, marginBottom: 7 }}>{label}</label><p id={`${id}-hint`} style={{ fontSize: 12, color: c.muted, lineHeight: 1.75, marginBottom: 11 }}>{hint}</p>{rows ? <textarea {...shared} rows={rows} /> : <input {...shared} type={name === 'email' ? 'email' : 'text'} autoComplete={name === 'email' ? 'email' : name === 'businessName' ? 'organization' : 'off'} />}{error ? <p id={`${id}-error`} style={{ color: '#813E2E', fontSize: 12, marginTop: 7 }}>{error}</p> : null}</div>;
}
