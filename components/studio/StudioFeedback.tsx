'use client';

import { useEffect, useRef, useState } from 'react';
import { isStudioFeedbackView, type StudioFeedbackEvent, type StudioFeedbackView } from '@/lib/studio/feedback-types';
import { CheckIcon, studioColors as c } from './StudioChrome';

export function StudioFeedback({ orderId, token }: { orderId: string; token: string }) {
  const [feedback, setFeedback] = useState<StudioFeedbackView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState<StudioFeedbackEvent | null>(null);
  const [message, setMessage] = useState('');
  const pendingRequest = useRef<{ event: StudioFeedbackEvent; key: string } | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadFeedback() {
      try {
        const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/feedback`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        });
        const data = await response.json();
        if (!response.ok || !isStudioFeedbackView(data.feedback)) throw new Error('unavailable');
        if (!controller.signal.aborted) setFeedback(data.feedback);
      } catch { if (!controller.signal.aborted) setLoadError(true); }
    }
    void loadFeedback();
    return () => controller.abort();
  }, [orderId, token, reload]);

  async function report(event: StudioFeedbackEvent) {
    if (!feedback || savingRef.current) return;
    savingRef.current = true;
    setSaving(event);
    setMessage('');
    if (!pendingRequest.current || pendingRequest.current.event !== event) pendingRequest.current = { event, key: crypto.randomUUID() };
    try {
      const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/feedback`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': pendingRequest.current.key },
        body: JSON.stringify({ event }), signal: AbortSignal.timeout(15_000),
      });
      const data = await response.json();
      if (!response.ok || !isStudioFeedbackView(data.feedback)) throw new Error(typeof data.error?.message === 'string' ? data.error.message : 'We couldn’t save that just now. Please try again.');
      setFeedback(data.feedback);
      pendingRequest.current = null;
      setMessage('Saved. Thanks for letting us know.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We couldn’t save that just now. Please try again.'); }
    finally { savingRef.current = false; setSaving(null); }
  }

  function choice(event: StudioFeedbackEvent, label: string, selected: boolean, milestone = false) {
    return <button type="button" aria-pressed={selected} className="studio-button studio-button-secondary" style={{ fontSize: 12, padding: '10px 14px', minHeight: 42, background: selected ? c.wash : c.paper, borderColor: selected ? '#AEBCA2' : c.line }} disabled={!feedback || !!saving || (milestone && selected)} onClick={() => void report(event)}>{saving === event ? 'Saving…' : <>{selected ? <CheckIcon size={14} /> : null}{label}{milestone && selected ? <span style={{ fontSize: 10, color: c.muted }}>Reported</span> : null}</>}</button>;
  }

  return <section aria-labelledby="studio-feedback-title" style={{ marginTop: 34, border: `1px solid ${c.line}`, borderRadius: 12, padding: '24px 25px', background: c.paper }}>
    <h2 id="studio-feedback-title" style={{ fontSize: 15, fontWeight: 550 }}>Was this pack useful?</h2>
    <p style={{ fontSize: 12, lineHeight: 1.8, color: c.muted, marginTop: 7, maxWidth: 650 }}>Optional. Tell us what you think, or return here after using your pack. Your answers help us improve Bootfile and don’t affect access to your pack.</p>
    {loadError ? <p style={{ fontSize: 12, color: c.muted, marginTop: 16 }} role="status">Feedback is unavailable right now. <button type="button" className="studio-inline-button" onClick={() => { setLoadError(false); setReload(value => value + 1); }}>Try again</button></p> : <>
      <div role="group" aria-label="How useful was your pack?" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 17 }}>
        {choice('useful', 'Useful', feedback?.usefulness === 'useful')}
        {choice('not_useful', 'Not useful', feedback?.usefulness === 'not_useful')}
      </div>
      <p style={{ fontSize: 12, color: c.muted, margin: '21px 0 10px' }}>Have you put it to use?</p>
      <div role="group" aria-label="Report how you used your pack" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {choice('used', 'I used this', !!feedback?.usedAt, true)}
        {choice('reused', 'I used it again', !!feedback?.reusedAt, true)}
      </div>
      <p role="status" aria-live="polite" style={{ fontSize: 12, lineHeight: 1.7, color: c.green, marginTop: 15, minHeight: 20 }}>{message || (!feedback ? 'Loading your feedback…' : 'We record use only when you tell us here.')}</p>
    </>}
  </section>;
}
