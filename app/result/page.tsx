'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ArchetypeReveal } from '@/components/ArchetypeReveal';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArchetypeId } from '@/lib/questions';
import { useBrowserStorage } from '@/lib/use-browser-storage';

interface QuizState {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  scores: Record<ArchetypeId, number>;
}

export default function ResultPage() {
  const router = useRouter();
  const raw = useBrowserStorage('bootfile_quiz');
  const quizState = useMemo(() => {
    try {
      const parsed = raw ? JSON.parse(raw) as QuizState : null;
      return parsed && typeof parsed.primary === 'string' ? parsed : null;
    } catch { return null; }
  }, [raw]);

  useEffect(() => {
    if (raw !== undefined && !quizState) router.replace('/quiz');
  }, [raw, quizState, router]);

  // result_page_bridge_seen event
  useEffect(() => {
    if (!quizState) return;
    try {
      track('result_page_bridge_seen', { archetype: quizState.primary });
    } catch { /* analytics not loaded */ }
  }, [quizState]);

  if (!quizState) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main
        className="result-page-content"
        style={{ padding: '80px 20px 120px' }}
      >
        <ArchetypeReveal
          primary={quizState.primary}
          secondary={quizState.secondary}
        />
      </main>
      <Footer />
    </>
  );
}
