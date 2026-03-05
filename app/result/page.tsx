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
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <ArchetypeReveal
            primary={quizState.primary}
            secondary={quizState.secondary}
          />

          {/* Conversion CTA */}
          <div
            style={{
              marginTop: 40,
              backgroundColor: '#ECEAE4',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <h3
              className="font-heading"
              style={{ fontSize: '1.3rem', color: '#2D2926', fontWeight: 400, marginBottom: 12 }}
            >
              This is how you think.
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#7A746B', lineHeight: 1.7, marginBottom: 24 }}>
              Your AI doesn&apos;t know any of it. A BootFile changes that &mdash; a personalized
              instruction profile built from your quiz results that tells your AI how to
              reason with you, not just talk at you.
            </p>
            <button
              onClick={() => router.push('/checkout')}
              style={{
                width: '100%',
                backgroundColor: '#7D8B6E',
                color: '#fff',
                fontWeight: 500,
                padding: '14px 28px',
                borderRadius: 8,
                fontSize: '0.95rem',
                letterSpacing: '0.01em',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              Generate My BootFile &mdash; $0.99
            </button>
            <p style={{ marginTop: 12, fontSize: '0.85rem', color: '#7A746B' }}>
              One-time purchase. Works on ChatGPT, Claude, Gemini and more.
            </p>
          </div>

          {/* Share */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #DDD6CC' }}>
            <p style={{ fontSize: '0.85rem', color: '#7A746B', textAlign: 'center', marginBottom: 16 }}>Share your result</p>
            <ShareButtons archetypeId={quizState.primary} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
