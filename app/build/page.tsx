'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BuildQuestions } from '@/components/build/BuildQuestions';
import { BuildLoading } from '@/components/build/BuildLoading';
import { BuildPreview } from '@/components/build/BuildPreview';
import { BuildError } from '@/components/build/BuildError';
import { ArchetypeId } from '@/lib/questions';
import { SupplementaryAnswers } from '@/lib/supplementary';

type BuildState = 'questions' | 'generating_preview' | 'preview' | 'generating_full' | 'unlocked';

function BuildContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<BuildState | null>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const initRef = useRef(false);

  // --- Helpers ---

  const getQuizState = useCallback(() => {
    try {
      const raw = localStorage.getItem('bootfile_quiz');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const getSupplementaryData = useCallback((): SupplementaryAnswers | null => {
    try {
      const raw = localStorage.getItem('bootfile_supplementary');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const buildGenerateBody = useCallback((supplementary: SupplementaryAnswers) => {
    const quizState = getQuizState();
    if (!quizState) return null;
    return {
      primaryArchetype: quizState.primary,
      secondaryArchetype: quizState.secondary || null,
      tertiaryArchetype: quizState.tertiary || null,
      lowestArchetypes: quizState.lowest || [],
      allScores: quizState.scores || {},
      domain: supplementary.domain,
      domainOther: supplementary.domainOther,
      technicalLevel: supplementary.technicalLevel,
      primaryUses: supplementary.primaryUses,
      decisionStyle: supplementary.decisionStyle,
      responseLength: supplementary.responseLength,
      petPeeves: supplementary.petPeeves,
      customAvoidances: supplementary.customAvoidances,
      openDescription: supplementary.openDescription,
    };
  }, [getQuizState]);

  // --- Actions ---

  const generatePreview = useCallback(async () => {
    setState('generating_preview');
    setError(null);

    const supplementary = getSupplementaryData();
    if (!supplementary) {
      setState('questions');
      return;
    }

    const body = buildGenerateBody(supplementary);
    if (!body) {
      setError({
        message: 'Quiz data not found. Please retake the quiz.',
        retry: () => router.push('/quiz'),
      });
      return;
    }

    try {
      const res = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errMsg = `Server error ${res.status}`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { /* non-JSON response */ }
        setError({ message: errMsg, retry: generatePreview });
        return;
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/plain') && res.body) {
        // Streaming response — show text as it arrives
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setPreviewText(text);
          if (text.length > 0) setState('preview');
        }

        if (text.length > 0) {
          try { localStorage.setItem('bootfile_preview', text); } catch { /* */ }
        } else {
          setError({ message: 'Preview generation returned empty.', retry: generatePreview });
        }
      } else {
        // JSON response (fallback)
        const data = await res.json();
        if (data.preview) {
          try { localStorage.setItem('bootfile_preview', data.preview); } catch { /* */ }
          setPreviewText(data.preview);
          setState('preview');
        } else {
          setError({
            message: data.error || 'Preview generation failed. Please try again.',
            retry: generatePreview,
          });
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError({
        message: 'Something went wrong. Please try again.',
        retry: generatePreview,
      });
    }
  }, [getSupplementaryData, buildGenerateBody, router]);

  const generateFull = useCallback(async (paymentIntentId: string) => {
    setState('generating_full');
    setError(null);
    setClientSecret(null);

    const supplementary = getSupplementaryData();
    if (!supplementary) {
      setError({
        message: 'Session data was lost. Please start over.',
        retry: () => {
          try { localStorage.removeItem('bootfile_preview'); } catch { /* */ }
          setState('questions');
        },
      });
      return;
    }

    const body = buildGenerateBody(supplementary);
    if (!body) {
      setError({
        message: 'Quiz data not found. Please retake the quiz.',
        retry: () => router.push('/quiz'),
      });
      return;
    }

    try {
      const res = await fetch('/api/generate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, paymentIntentId }),
      });

      if (!res.ok) {
        let errMsg = `Server error ${res.status}`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { /* non-JSON response */ }
        setError({ message: errMsg, retry: () => generateFull(paymentIntentId) });
        return;
      }

      const text = await res.text();
      let bootfile: string;

      try {
        const data = JSON.parse(text);
        if (data.bootfile) {
          bootfile = data.bootfile;
        } else {
          setError({
            message: data.error || 'Generation failed. Please try again.',
            retry: () => generateFull(paymentIntentId),
          });
          return;
        }
      } catch {
        // Raw text from streaming response
        bootfile = text;
      }

      if (bootfile.length > 0) {
        try {
          localStorage.setItem('bootfile_output', bootfile);
          localStorage.setItem('bootfile_payment_intent', paymentIntentId);
        } catch { /* */ }

        // Fire-and-forget purchase tracking
        const quizId = localStorage.getItem('bootfile_quiz_id') || null;
        fetch('/api/track-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            paymentIntentId,
            email: supplementary.email,
            domain: supplementary.domain,
            technicalLevel: supplementary.technicalLevel,
            primaryUse: supplementary.primaryUses.join(', '),
            decisionStyle: supplementary.decisionStyle,
            responseLength: supplementary.responseLength,
          }),
        }).catch(() => { /* non-blocking */ });

        // Fire-and-forget: email the bootfile to the user
        if (supplementary.email) {
          fetch('/api/send-bootfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: supplementary.email,
              bootfileText: bootfile,
              archetypeId: body?.primaryArchetype,
            }),
          }).catch(() => { /* non-blocking */ });
        }

        // Redirect to success page (conversion pixels fire there)
        router.push('/build/success');
      } else {
        setError({
          message: 'Generation returned empty. Please try again.',
          retry: () => generateFull(paymentIntentId),
        });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError({
        message: 'Something went wrong. Please try again.',
        retry: () => generateFull(paymentIntentId),
      });
    }
  }, [getSupplementaryData, buildGenerateBody, router]);

  // --- Init (runs once) ---

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // 1. Already have a full bootfile? → redirect to success page
    const existingOutput = localStorage.getItem('bootfile_output');
    if (existingOutput) {
      router.push('/build/success');
      return;
    }

    // 2. Returning from 3DS/bank redirect with payment_intent?
    const piParam = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');
    if (piParam && redirectStatus === 'succeeded') {
      const quizState = getQuizState();
      if (quizState) {
        setArchetypeId(quizState.primary as ArchetypeId);
        generateFull(piParam);
      } else {
        setError({
          message: 'Quiz data not found. Please retake the quiz.',
          retry: () => router.push('/quiz'),
        });
      }
      window.history.replaceState({}, '', '/build');
      return;
    }

    // 3. Need quiz data to proceed
    const quizState = getQuizState();
    if (!quizState) {
      router.push('/quiz');
      return;
    }
    setArchetypeId(quizState.primary as ArchetypeId);

    // 4. Already have a preview? → show it
    const existingPreview = localStorage.getItem('bootfile_preview');
    if (existingPreview) {
      setPreviewText(existingPreview);
      setState('preview');
      return;
    }

    // 5. Have supplementary data but no preview? (tab closed during generation)
    const existingSupplementary = localStorage.getItem('bootfile_supplementary');
    if (existingSupplementary) {
      generatePreview();
      return;
    }

    // 6. Default: show supplementary questions
    setState('questions');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Handlers ---

  const handleQuestionsSubmit = useCallback((data: SupplementaryAnswers) => {
    try {
      localStorage.setItem('bootfile_supplementary', JSON.stringify(data));
    } catch { /* */ }
    generatePreview();
  }, [generatePreview]);

  const handleUnlock = useCallback(async () => {
    const quizState = getQuizState();
    if (!quizState) {
      console.error('[BUILD] Quiz data missing when trying to unlock');
      setError({
        message: 'Quiz data not found. Please retake the quiz.',
        retry: () => router.push('/quiz'),
      });
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      console.log('[BUILD] Creating payment intent...');
      const supplementary = getSupplementaryData();
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: quizState.primary,
          scoresJson: JSON.stringify(quizState.scores),
          email: supplementary?.email,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[BUILD] Payment intent API error:', res.status, text);
        setError({
          message: 'Payment setup failed. Please try again.',
          retry: handleUnlock,
        });
        return;
      }

      const data = await res.json();

      if (data.clientSecret) {
        console.log('[BUILD] Payment intent created, showing payment form');
        setClientSecret(data.clientSecret);
      } else {
        console.error('[BUILD] No clientSecret in response:', data);
        setError({
          message: data.error || 'Payment setup failed. Please try again.',
          retry: handleUnlock,
        });
      }
    } catch (err) {
      console.error('[BUILD] Payment intent fetch error:', err);
      setError({
        message: 'Something went wrong. Please try again.',
        retry: handleUnlock,
      });
    } finally {
      setPaymentLoading(false);
    }
  }, [getQuizState, router]);

  const handlePaymentSuccess = useCallback((paymentIntentId: string) => {
    console.log('[BUILD] Payment succeeded:', paymentIntentId);
    setClientSecret(null);
    generateFull(paymentIntentId);
  }, [generateFull]);

  const handlePaymentError = useCallback((message: string) => {
    console.error('[BUILD] Payment error:', message);
    setClientSecret(null);
    setError({
      message,
      retry: handleUnlock,
    });
  }, [handleUnlock]);

  // --- Render ---

  if (error) {
    return <BuildError message={error.message} onRetry={error.retry} />;
  }

  if (state === 'generating_preview') {
    return <BuildLoading stage="preview" />;
  }

  if (state === 'generating_full') {
    return <BuildLoading stage="full" />;
  }

  // Still initializing
  if (!state || !archetypeId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (state === 'questions') {
    return (
      <>
        <Header />
        <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <BuildQuestions archetypeId={archetypeId} onSubmit={handleQuestionsSubmit} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (state === 'preview' && previewText) {
    return (
      <>
        <Header />
        <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
          <BuildPreview
            previewText={previewText}
            archetypeId={archetypeId}
            onUnlock={handleUnlock}
            clientSecret={clientSecret}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            paymentLoading={paymentLoading}
          />
        </main>
        <Footer />
      </>
    );
  }

  // Fallback spinner
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <BuildContent />
    </Suspense>
  );
}
