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

// --- Cookie helpers (survive private browsing + Stripe redirect) ---
function setCookie(name: string, value: string, maxAge: number = 7200) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// --- localStorage with cookie fallback ---
function safeGet(key: string, cookieKey?: string): string | null {
  const val = localStorage.getItem(key);
  if (val) return val;
  if (cookieKey) {
    const cookieVal = getCookie(cookieKey);
    if (cookieVal) {
      localStorage.setItem(key, cookieVal);
      return cookieVal;
    }
  }
  return null;
}

function BuildContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<BuildState | null>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const initRef = useRef(false);

  const getQuizState = useCallback(() => {
    const raw = safeGet('bootfile_quiz', 'bf_q');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const getSupplementaryData = useCallback(() => {
    const raw = safeGet('bootfile_supplementary', 'bf_s');
    if (!raw) return null;
    try {
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
        localStorage.setItem('bootfile_preview', data.preview);
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

  const generateFull = useCallback(async (paymentId: string, isCheckoutSession: boolean = false) => {
    setState('generating_full');
    setError(null);
    setClientSecret(null);

    const supplementary = getSupplementaryData();
    if (!supplementary) {
      setPendingSessionId(paymentId);
      try { localStorage.setItem('bootfile_pending_session', paymentId); } catch { /* private mode */ }
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
      const res = await fetch('/api/generate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          ...(isCheckoutSession ? { sessionId: paymentId } : { paymentIntentId: paymentId }),
        }),
      });
      const data = await res.json();

      if (data.bootfile) {
        try {
          localStorage.setItem('bootfile_output', data.bootfile);
          localStorage.removeItem('bootfile_pending_session');
        } catch { /* private mode */ }
        deleteCookie('bf_q');
        deleteCookie('bf_s');
        setBootfileText(data.bootfile);
        setState('unlocked');

        // Fire-and-forget purchase tracking
        const quizId = safeGet('bootfile_quiz_id') || null;
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

        // Clean URL
        window.history.replaceState({}, '', '/build');
      } else {
        setError({
          message: data.error || 'Generation failed. Please try again.',
          retry: () => generateFull(paymentId, isCheckoutSession),
        });
      }
    } catch {
      setError({
        message: 'Something went wrong. Please try again.',
        retry: () => generateFull(paymentId, isCheckoutSession),
      });
    }
  }, [getSupplementaryData, buildGenerateBody, router]);

  // Initialize state on mount — runs once via ref guard
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      // 1. Check for existing full output (already unlocked)
      const existingOutput = safeGet('bootfile_output');
      if (existingOutput) {
        const quizState = getQuizState();
        if (quizState) setArchetypeId(quizState.primary as ArchetypeId);
        setBootfileText(existingOutput);
        setState('unlocked');
        return;
      }

      // 2. Check for payment_intent return (3DS redirect or bank redirect)
      const paymentIntentParam = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');
      if (paymentIntentParam && redirectStatus === 'succeeded') {
        const quizState = getQuizState();
        if (quizState) setArchetypeId(quizState.primary as ArchetypeId);
        generateFull(paymentIntentParam);
        // Clean URL
        window.history.replaceState({}, '', '/build');
        return;
      }

      // 3. Check for session_id from old Stripe Checkout return (backward compat)
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        let quizState = getQuizState();

        if (!quizState) {
          try {
            const res = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
            const data = await res.json();
            if (data.paid && data.archetypeId) {
              quizState = {
                primary: data.archetypeId,
                secondary: null,
                tertiary: null,
                lowest: [],
                scores: data.scoresJson ? JSON.parse(data.scoresJson) : {},
                answers: {},
              };
              try { localStorage.setItem('bootfile_quiz', JSON.stringify(quizState)); } catch { /* private mode */ }
            }
          } catch {
            // Recovery failed
          }
        }

        if (!quizState) {
          setError({
            message: 'Quiz data not found. Please retake the quiz.',
            retry: () => router.push('/quiz'),
          });
          return;
        }

        setArchetypeId(quizState.primary as ArchetypeId);
        generateFull(sessionId, true);
        return;
      }

      // 4. Normal flow — need quiz data
      const quizState = getQuizState();
      if (!quizState) {
        router.push('/quiz');
        return;
      }
      setArchetypeId(quizState.primary as ArchetypeId);

      // 5. Check for existing preview
      const existingPreview = safeGet('bootfile_preview');
      if (existingPreview) {
        setPreviewText(existingPreview);
        setState('preview');
        return;
      }

      // 6. Check for pending session (user paid but supplementary was lost)
      const pendingSession = safeGet('bootfile_pending_session');
      if (pendingSession) {
        setPendingSessionId(pendingSession);
        setState('questions');
        return;
      }

      // 7. Supplementary data exists but no preview (tab closed during generation)
      const existingSupplementary = safeGet('bootfile_supplementary', 'bf_s');
      if (existingSupplementary) {
        generatePreview();
        return;
      }

      // 8. Default: start with questions
      setState('questions');
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuestionsSubmit = useCallback((data: SupplementaryAnswers) => {
    const dataJson = JSON.stringify(data);
    try { localStorage.setItem('bootfile_supplementary', dataJson); } catch { /* private mode */ }
    setCookie('bf_s', dataJson);

    // If user already paid, skip preview and go straight to full generation
    const sessionId = pendingSessionId || safeGet('bootfile_pending_session');
    if (sessionId) {
      setPendingSessionId(null);
      generateFull(sessionId);
    } else {
      generatePreview();
    }
  }, [pendingSessionId, generatePreview, generateFull]);

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

  // Error state
  if (error) {
    return <BuildError message={error.message} onRetry={error.retry} />;
  }

  // Loading states
  if (state === 'generating_preview') {
    return <BuildLoading stage="preview" />;
  }

  if (state === 'generating_full') {
    return <BuildLoading stage="full" />;
  }

  // Content states
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
