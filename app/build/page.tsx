'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BuildQuestions } from '@/components/build/BuildQuestions';
import { BuildLoading } from '@/components/build/BuildLoading';
import { BuildPreview } from '@/components/build/BuildPreview';
import { BuildUnlocked } from '@/components/build/BuildUnlocked';
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
    } catch {
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
      const data = await res.json();

      if (data.bootfile) {
        try {
          localStorage.setItem('bootfile_output', data.bootfile);
        } catch { /* */ }
        setBootfileText(data.bootfile);
        setState('unlocked');

        // Fire-and-forget purchase tracking
        const quizId = localStorage.getItem('bootfile_quiz_id') || null;
        fetch('/api/track-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            domain: supplementary.domain,
            technicalLevel: supplementary.technicalLevel,
            primaryUse: supplementary.primaryUses.join(', '),
            decisionStyle: supplementary.decisionStyle,
            responseLength: supplementary.responseLength,
          }),
        }).catch(() => { /* non-blocking */ });

        // Clean URL if needed
        if (window.location.search) {
          window.history.replaceState({}, '', '/build');
        }
      } else {
        setError({
          message: data.error || 'Generation failed. Please try again.',
          retry: () => generateFull(paymentIntentId),
        });
      }
    } catch {
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

    // 1. Already have a full bootfile? → show it
    const existingOutput = localStorage.getItem('bootfile_output');
    if (existingOutput) {
      const quizState = getQuizState();
      if (quizState) setArchetypeId(quizState.primary as ArchetypeId);
      setBootfileText(existingOutput);
      setState('unlocked');
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
    if (!quizState) return;

    setPaymentLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: quizState.primary,
          scoresJson: JSON.stringify(quizState.scores),
        }),
      });
      const data = await res.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError({
          message: data.error || 'Payment setup failed. Please try again.',
          retry: handleUnlock,
        });
      }
    } catch {
      setError({
        message: 'Something went wrong. Please try again.',
        retry: handleUnlock,
      });
    } finally {
      setPaymentLoading(false);
    }
  }, [getQuizState]);

  const handlePaymentSuccess = useCallback((paymentIntentId: string) => {
    setClientSecret(null);
    generateFull(paymentIntentId);
  }, [generateFull]);

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
            paymentLoading={paymentLoading}
          />
        </main>
        <Footer />
      </>
    );
  }

  if (state === 'unlocked' && bootfileText) {
    return (
      <>
        <Header />
        <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
          <BuildUnlocked bootfileText={bootfileText} archetypeId={archetypeId} />
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
