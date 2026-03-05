'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArchetypeReveal } from '@/components/ArchetypeReveal';
import { ShareButtons } from '@/components/ShareButtons';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArchetypeId } from '@/lib/questions';

interface QuizState {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  scores: Record<ArchetypeId, number>;
}

export default function ResultPage() {
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('bootfile_quiz');
    if (!raw) {
      router.push('/quiz');
      return;
    }
    try {
      setQuizState(JSON.parse(raw));
    } catch {
      router.push('/quiz');
    }
  }, [router]);

  if (!quizState) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#0e6e6e] border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <>
      <Header />
      <main className="pt-[80px] pb-16 px-5">
        <div className="max-w-[640px] mx-auto">
          {/* Archetype Reveal */}
          <ArchetypeReveal
            primary={quizState.primary}
            secondary={quizState.secondary}
          />

          {/* Conversion Hook */}
          <div className="mt-10 bg-white border-2 border-[#0e6e6e]/20 rounded-2xl p-8 text-center">
            <p className="text-base text-gray-700 leading-relaxed mb-6">
              Your AI doesn&apos;t know any of this about you. That&apos;s why it
              gives you <em className="text-gray-900 font-medium">generic, one-size-fits-all responses</em>.
              Your BootFile fixes that in 60 seconds.
            </p>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#0e6e6e] hover:bg-[#0a5454] active:bg-[#073d3d] text-white font-medium px-8 py-4 rounded-lg min-h-[52px] text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer"
            >
              Generate My BootFile &mdash; $2.99
            </button>
            <p className="mt-3 text-xs text-gray-400">
              One-time purchase. Works on ChatGPT, Claude, Gemini &amp; more.
            </p>
          </div>

          {/* Share */}
          <div className="mt-10 pt-8 border-t border-[#edeae5]">
            <p className="text-sm text-gray-500 text-center mb-4">Share your result</p>
            <ShareButtons archetypeId={quizState.primary} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
