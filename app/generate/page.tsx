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

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryArchetype: quizState.primary || archetypeId,
          secondaryArchetype: quizState.secondary || null,
          tertiaryArchetype: quizState.tertiary || null,
          lowestArchetypes: quizState.lowest || [],
          allScores: quizState.scores || {},
          domain: formData.domain,
          domainOther: formData.domainOther,
          technicalLevel: formData.technicalLevel,
          primaryUse: formData.primaryUse,
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
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#0e6e6e] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="animate-spin w-10 h-10 border-2 border-[#0e6e6e] border-t-transparent rounded-full mx-auto mb-6" />
          <p className="text-lg text-gray-900 font-medium mb-2">{generatingText}</p>
          <p className="text-sm text-gray-500">This usually takes 10-15 seconds.</p>
        </div>
      </div>
    );
  }

  const arch = ARCHETYPES[archetypeId];

  return (
    <>
      <Header />
      <main className="pt-[80px] pb-16 px-5">
        <div className="max-w-[640px] mx-auto">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0fafa] text-sm text-[#0e6e6e] font-medium mb-4">
              {arch.icon} {arch.name}
            </span>
            <h1 className="font-heading text-2xl md:text-3xl text-gray-900 mb-2">
              Let&apos;s personalize your BootFile
            </h1>
            <p className="text-gray-600">
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
        <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#0e6e6e] border-t-transparent rounded-full" />
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}
