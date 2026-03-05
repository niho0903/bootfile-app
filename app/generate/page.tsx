'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { SupplementaryQuestions } from '@/components/SupplementaryQuestions';
import { ArchetypeId } from '@/lib/questions';
import { SupplementaryAnswers } from '@/lib/supplementary';
import { ARCHETYPES } from '@/lib/archetypes';

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState('Crafting your BootFile...');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!data.paid) {
          router.push('/');
          return;
        }

        // Try sessionStorage first, fall back to Stripe metadata
        const raw = sessionStorage.getItem('bootfile_quiz');
        if (raw) {
          const quizState = JSON.parse(raw);
          setArchetypeId(quizState.primary as ArchetypeId);

          // If Stripe has scores but sessionStorage doesn't match, recover
          if (data.scoresJson && !quizState.scores) {
            const recovered = JSON.parse(data.scoresJson);
            quizState.scores = recovered;
            sessionStorage.setItem('bootfile_quiz', JSON.stringify(quizState));
          }
        } else if (data.archetypeId) {
          // Recover from Stripe metadata
          const recoveredState = {
            primary: data.archetypeId,
            secondary: null,
            tertiary: null,
            lowest: [],
            scores: data.scoresJson ? JSON.parse(data.scoresJson) : {},
            answers: {},
          };
          sessionStorage.setItem('bootfile_quiz', JSON.stringify(recoveredState));
          setArchetypeId(data.archetypeId as ArchetypeId);
        } else {
          router.push('/');
          return;
        }

        setVerified(true);
      } catch {
        router.push('/');
      }
    };

    verify();
  }, [router, searchParams]);

  const handleSubmit = async (formData: SupplementaryAnswers) => {
    setIsGenerating(true);

    // Rotate loading text
    const messages = [
      'Crafting your BootFile...',
      'Analyzing your communication style...',
      'Building reasoning frameworks...',
      'Calibrating failure detection...',
      'Finalizing your profile...',
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setGeneratingText(messages[msgIndex]);
    }, 3000);

    try {
      const raw = sessionStorage.getItem('bootfile_quiz');
      const quizState = raw ? JSON.parse(raw) : {};

      // Pass session_id for server-side payment verification
      const sessionId = searchParams.get('session_id');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          primaryArchetype: quizState.primary || archetypeId,
          secondaryArchetype: quizState.secondary || null,
          tertiaryArchetype: quizState.tertiary || null,
          lowestArchetypes: quizState.lowest || [],
          allScores: quizState.scores || {},
          domain: formData.domain,
          domainOther: formData.domainOther,
          technicalLevel: formData.technicalLevel,
          primaryUses: formData.primaryUses,
          decisionStyle: formData.decisionStyle,
          responseLength: formData.responseLength,
          petPeeves: formData.petPeeves,
          customAvoidances: formData.customAvoidances,
          openDescription: formData.openDescription,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (data.bootfile) {
        sessionStorage.setItem('bootfile_output', data.bootfile);

        // Fire-and-forget purchase tracking
        const quizId = sessionStorage.getItem('bootfile_quiz_id');
        fetch('/api/track-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            domain: formData.domain,
            technicalLevel: formData.technicalLevel,
            primaryUse: formData.primaryUses.join(', '),
            decisionStyle: formData.decisionStyle,
            responseLength: formData.responseLength,
          }),
        }).catch(() => { /* non-blocking */ });

        router.push('/bootfile');
      } else {
        setIsGenerating(false);
        alert('Generation failed. Please try again.');
      }
    } catch {
      clearInterval(interval);
      setIsGenerating(false);
      alert('Something went wrong. Please try again.');
    }
  };

  if (!verified || !archetypeId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F7F4EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #7D8B6E',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F7F4EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 384 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '2px solid #7D8B6E',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p
            className="font-heading"
            style={{
              fontSize: 18,
              color: '#2D2926',
              fontWeight: 500,
              marginBottom: 8,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {generatingText}
          </p>
          <p style={{ fontSize: 14, color: '#7A746B' }}>
            This usually takes 10-15 seconds.
          </p>
        </div>
      </div>
    );
  }

  const arch = ARCHETYPES[archetypeId];

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 9999,
                backgroundColor: '#ECEAE4',
                fontSize: 14,
                color: '#7D8B6E',
                fontWeight: 500,
                marginBottom: 16,
              }}
            >
              {arch.icon} {arch.name}
            </span>
            <h1
              className="font-heading"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#2D2926', marginBottom: 8 }}
            >
              Let&apos;s personalize your BootFile
            </h1>
            <p style={{ color: '#7A746B' }}>
              These questions help us calibrate your BootFile to your exact needs.
            </p>
          </div>

          <SupplementaryQuestions
            archetypeId={archetypeId}
            onSubmit={handleSubmit}
            isGenerating={isGenerating}
          />
        </div>
      </main>
    </>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#F7F4EF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid #7D8B6E',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}
