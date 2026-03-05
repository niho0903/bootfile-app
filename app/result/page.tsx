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
      <div style={{ minHeight: '100vh', backgroundColor: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #0e6e6e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
          <ArchetypeReveal
            primary={quizState.primary}
            secondary={quizState.secondary}
          />

          {/* Conversion Hook */}
          <div
            style={{
              marginTop: 40,
              backgroundColor: '#fff',
              border: '2px solid rgba(14,110,110,0.15)',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(14,110,110,0.06)',
            }}
          >
            <p style={{ fontSize: 16, color: '#444', lineHeight: 1.7, marginBottom: 24 }}>
              Your AI doesn&apos;t know any of this about you. That&apos;s why it
              gives you <em style={{ color: '#1a1a1a', fontWeight: 600 }}>generic, one-size-fits-all responses</em>.
              Your BootFile fixes that in 60 seconds.
            </p>
            <button
              onClick={() => router.push('/checkout')}
              style={{
                width: '100%',
                backgroundColor: '#0e6e6e',
                color: '#fff',
                fontWeight: 600,
                padding: '16px 32px',
                borderRadius: 12,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(14,110,110,0.3)',
                fontFamily: 'inherit',
              }}
            >
              Generate My BootFile &mdash; $0.99
            </button>
            <p style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
              One-time purchase. Works on ChatGPT, Claude, Gemini &amp; more.
            </p>
          </div>

          {/* Share */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #edeae5' }}>
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 16 }}>Share your result</p>
            <ShareButtons archetypeId={quizState.primary} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
