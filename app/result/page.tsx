'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ArchetypeReveal } from '@/components/ArchetypeReveal';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StickyBottomCTA } from '@/components/StickyBottomCTA';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';
import { BRIDGE_LINES } from '@/lib/archetype-copy';

interface QuizState {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  scores: Record<ArchetypeId, number>;
}

export default function ResultPage() {
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('bootfile_quiz');
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

  // Reddit pixel ViewContent event
  useEffect(() => {
    if (!quizState) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.rdt) {
        w.rdt('track', 'ViewContent');
      }
    } catch { /* pixel not loaded */ }
  }, [quizState]);

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

  const arch = ARCHETYPES[quizState.primary];
  const article = /^[aeiou]/i.test(arch.name) ? 'an' : 'a';
  const bridgeLine = BRIDGE_LINES[quizState.primary];

  return (
    <>
      <Header />
      <main
        className="result-page-content"
        style={{ paddingTop: 80, paddingBottom: 120, padding: '80px 20px 120px' }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <ArchetypeReveal
            primary={quizState.primary}
            secondary={quizState.secondary}
          />

          {/* Conversion CTA — shortened copy */}
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
              You&apos;re {article} {arch.name}. Your AI doesn&apos;t know that yet.
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#7A746B', lineHeight: 1.7, marginBottom: 20 }}>
              A BootFile is a personalized instruction profile that tells your AI how to
              work with you — built from your quiz results. Takes 3 minutes.
            </p>

            {/* Section 6 — archetype-specific bridge tease */}
            <div
              style={{
                textAlign: 'left',
                maxWidth: 480,
                margin: '0 auto 28px',
                padding: '16px 18px',
                backgroundColor: '#F7F4EF',
                borderRadius: 10,
                borderLeft: '3px solid #7D8B6E',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5C6650',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 6px',
                }}
              >
                One thing your BootFile will tell your AI:
              </p>
              <p
                style={{
                  fontSize: 14.5,
                  color: '#2D2926',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                &ldquo;{bridgeLine}&rdquo;
              </p>
            </div>

            <button
              onClick={() => router.push('/build')}
              style={{
                width: '100%',
                maxWidth: 320,
                backgroundColor: '#7D8B6E',
                color: '#fff',
                fontWeight: 600,
                padding: '16px 32px',
                borderRadius: 12,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5C6650')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7D8B6E')}
            >
              Build my BootFile &rarr;
            </button>
          </div>
        </div>
      </main>
      <Footer />
      <StickyBottomCTA />
    </>
  );
}
