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
            <p style={{ fontSize: '0.95rem', color: '#7A746B', lineHeight: 1.7, marginBottom: 28 }}>
              Your AI doesn&apos;t know any of it. A BootFile changes that &mdash; a personalized
              instruction profile built from your quiz results that tells your AI how to
              reason with you, not just talk at you.
            </p>

            {/* Tier Cards */}
            <div style={{ display: 'flex', gap: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Basic */}
              <div
                style={{
                  flex: '1 1 240px',
                  maxWidth: 300,
                  backgroundColor: '#F7F4EF',
                  border: '1px solid #DDD6CC',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: '#7A746B', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Basic</p>
                <p style={{ fontSize: 28, fontWeight: 600, color: '#2D2926', marginBottom: 16 }}>$0.99</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 14, color: '#5C6650', lineHeight: 2 }}>
                  <li>&#10003; Personalized BootFile</li>
                  <li>&#10003; All 6 AI platforms</li>
                  <li>&#10003; Quick Commands</li>
                  <li>&#10003; Starter prompt</li>
                </ul>
                <button
                  onClick={() => router.push('/checkout?tier=basic')}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#7D8B6E',
                    fontWeight: 500,
                    padding: '12px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    border: '1.5px solid #7D8B6E',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7D8B6E'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7D8B6E'; }}
                >
                  Get Basic
                </button>
              </div>

              {/* Premium */}
              <div
                style={{
                  flex: '1 1 240px',
                  maxWidth: 300,
                  backgroundColor: '#2D2926',
                  border: '2px solid #7D8B6E',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'left',
                  position: 'relative' as const,
                }}
              >
                <span style={{
                  position: 'absolute' as const,
                  top: -12,
                  right: 16,
                  backgroundColor: '#7D8B6E',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  letterSpacing: '0.03em',
                }}>
                  BEST VALUE
                </span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#A09B93', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>Premium</p>
                <p style={{ fontSize: 28, fontWeight: 600, color: '#F7F4EF', marginBottom: 16 }}>$2.99</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 14, color: '#C4BFB6', lineHeight: 2 }}>
                  <li>&#10003; Everything in Basic</li>
                  <li>&#10003; Saved forever &mdash; any device</li>
                  <li>&#10003; Updates for new AI models</li>
                  <li>&#10003; Version history &amp; rollback</li>
                </ul>
                <button
                  onClick={() => router.push('/checkout?tier=premium')}
                  style={{
                    width: '100%',
                    backgroundColor: '#7D8B6E',
                    color: '#fff',
                    fontWeight: 500,
                    padding: '12px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5C6650')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7D8B6E')}
                >
                  Get Premium
                </button>
              </div>
            </div>

            <p style={{ marginTop: 16, fontSize: '0.8rem', color: '#7A746B' }}>
              One-time purchase. Works on any AI platform. Basic users can upgrade later for $2.50.
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
