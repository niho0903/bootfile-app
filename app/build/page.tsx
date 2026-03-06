'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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

  const getQuizState = useCallback(() => {
    const raw = localStorage.getItem('bootfile_quiz');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const getSupplementaryData = useCallback(() => {
    const raw = localStorage.getItem('bootfile_supplementary');
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
      router.push('/quiz');
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

  const generateFull = useCallback(async (sessionId: string) => {
    setState('generating_full');
    setError(null);

    const supplementary = getSupplementaryData();
    if (!supplementary) {
      setState('questions');
      return;
    }

    const body = buildGenerateBody(supplementary);
    if (!body) {
      router.push('/quiz');
      return;
    }

    try {
      const res = await fetch('/api/generate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, sessionId }),
      });
      const data = await res.json();

      if (data.bootfile) {
        localStorage.setItem('bootfile_output', data.bootfile);
        setBootfileText(data.bootfile);
        setState('unlocked');

        // Fire-and-forget purchase tracking
        const quizId = localStorage.getItem('bootfile_quiz_id');
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
          retry: () => generateFull(sessionId),
        });
      }
    } catch {
      setError({
        message: 'Something went wrong. Please try again.',
        retry: () => generateFull(sessionId),
      });
    }
  }, [getSupplementaryData, buildGenerateBody, router]);

  // Initialize state on mount
  useEffect(() => {
    const quizState = getQuizState();
    if (!quizState) {
      router.push('/quiz');
      return;
    }
    setArchetypeId(quizState.primary as ArchetypeId);

    // Check for existing full output
    const existingOutput = localStorage.getItem('bootfile_output');
    if (existingOutput) {
      setBootfileText(existingOutput);
      setState('unlocked');
      return;
    }

    // Check for session_id from Stripe return
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      generateFull(sessionId);
      return;
    }

    // Check for existing preview
    const existingPreview = localStorage.getItem('bootfile_preview');
    if (existingPreview) {
      setPreviewText(existingPreview);
      setState('preview');
      return;
    }

    // Check if supplementary data exists but no preview (tab closed during generation)
    const existingSupplementary = localStorage.getItem('bootfile_supplementary');
    if (existingSupplementary) {
      generatePreview();
      return;
    }

    // Default: start with questions
    setState('questions');
  }, [router, searchParams, getQuizState, generatePreview, generateFull]);

  const handleQuestionsSubmit = useCallback((data: SupplementaryAnswers) => {
    localStorage.setItem('bootfile_supplementary', JSON.stringify(data));
    generatePreview();
  }, [generatePreview]);

  const handleUnlock = useCallback(async () => {
    const quizState = getQuizState();
    if (!quizState) return;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: quizState.primary,
          scoresJson: JSON.stringify(quizState.scores),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError({
          message: data.error || 'Checkout failed. Please try again.',
          retry: handleUnlock,
        });
      }
    } catch {
      setError({
        message: 'Something went wrong. Please try again.',
        retry: handleUnlock,
      });
    }
  }, [getQuizState]);

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
