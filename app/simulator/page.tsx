'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const SAMPLE_PROMPTS = [
  'Should I quit my job to start a company?',
  'How should I negotiate a raise?',
  'Critique my strategy for launching a new product.',
  "I have too many priorities and can't focus. What do I do?",
  "What's the best way to learn something complex fast?",
  "I disagree with my manager's decision. How do I handle it?",
];

const ARCHETYPES = [
  { id: 'surgeon', name: 'The Surgeon', tagline: 'Cut the fluff.', color: '#DC2626', icon: '\u2702\uFE0F' },
  { id: 'architect', name: 'The Architect', tagline: 'Show me the whole board.', color: '#2563EB', icon: '\uD83C\uDFDB\uFE0F' },
  { id: 'sparring', name: 'The Sparring Partner', tagline: "Don't agree with me.", color: '#D97706', icon: '\uD83E\uDD4A' },
  { id: 'maker', name: 'The Maker', tagline: 'Less talk, more output.', color: '#EA580C', icon: '\u26A1' },
] as const;

export default function SimulatorPage() {
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState('');

  const handleSubmit = async (text?: string) => {
    const input = (text ?? prompt).trim();
    if (!input || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSubmittedPrompt(input);
    if (text) setPrompt(text);

    try {
      const res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (res.status === 429) {
        setError('You\u2019ve used all your comparisons this hour. Take the quiz instead!');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Try again.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResults(data.results);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .sim-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 740px) { .sim-grid { grid-template-columns: 1fr 1fr; } }
        .sim-card { opacity: 0; animation: simFadeIn 0.4s ease forwards; }
        .sim-card:nth-child(2) { animation-delay: 0.08s; }
        .sim-card:nth-child(3) { animation-delay: 0.16s; }
        .sim-card:nth-child(4) { animation-delay: 0.24s; }
        @keyframes simFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .sim-skeleton { background: linear-gradient(90deg, #ECEAE4 25%, #E2DED6 50%, #ECEAE4 75%); background-size: 200% 100%; animation: simShimmer 1.5s infinite; border-radius: 12px; }
        @keyframes simShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .sim-chip { cursor: pointer; border: 1px solid #DDD6CC; background: #fff; border-radius: 20px; padding: 8px 16px; font-size: 0.85rem; color: #7A746B; transition: all 0.15s ease; }
        .sim-chip:hover { border-color: #7D8B6E; color: #2D2926; background: #F7F4EF; }
        .sim-cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 8px; border: 2px solid; font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: all 0.15s ease; cursor: pointer; }
        .sim-cta-btn:hover { transform: translateY(-2px); }
        .sim-textarea { width: 100%; padding: 16px; border-radius: 10px; border: 1px solid #DDD6CC; background: #fff; color: #2D2926; font-size: 1rem; font-family: inherit; line-height: 1.6; resize: vertical; min-height: 80px; outline: none; transition: border-color 0.15s; }
        .sim-textarea:focus { border-color: #7D8B6E; }
        .sim-textarea::placeholder { color: #A39E95; }
      `}</style>

      <Header />
      <main>
        {/* Hero */}
        <section style={{ padding: '100px 20px 60px', textAlign: 'center', backgroundColor: '#F7F4EF' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1
              className="font-heading"
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.6rem)',
                lineHeight: 1.15,
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 12,
              }}
            >
              Same prompt. Four thinking styles.
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#7A746B', marginBottom: 0 }}>
              See how your AI could respond differently based on how you think.
            </p>
          </div>
        </section>

        {/* Input */}
        <section style={{ padding: '40px 20px 60px', backgroundColor: '#ECEAE4' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <textarea
              className="sim-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type a prompt, or click one below..."
              maxLength={800}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <span style={{ fontSize: '0.8rem', color: '#A39E95' }}>
                {prompt.length}/800
              </span>
              <button
                onClick={() => handleSubmit()}
                disabled={loading || !prompt.trim()}
                style={{
                  backgroundColor: '#7D8B6E',
                  color: '#fff',
                  fontWeight: 500,
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !prompt.trim() ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Comparing...' : 'Compare Styles'}
              </button>
            </div>

            {/* Sample prompts */}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: '0.8rem', color: '#A39E95', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Try a prompt that matters
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SAMPLE_PROMPTS.map((sp) => (
                  <button
                    key={sp}
                    className="sim-chip"
                    onClick={() => handleSubmit(sp)}
                    disabled={loading}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section style={{ padding: '40px 20px', backgroundColor: '#F7F4EF', textAlign: 'center' }}>
            <div style={{
              maxWidth: 500,
              margin: '0 auto',
              padding: 24,
              backgroundColor: '#FEF9E7',
              border: '1px solid #F0D878',
              borderRadius: 10,
            }}>
              <p style={{ margin: 0, color: '#5D4E37', fontSize: '0.95rem' }}>{error}</p>
              {error.includes('quiz') && (
                <Link
                  href="/quiz"
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    backgroundColor: '#7D8B6E',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                  }}
                >
                  Take the Quiz
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Loading skeletons */}
        {loading && (
          <section style={{ padding: '40px 20px 60px', backgroundColor: '#F7F4EF' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div className="sim-grid">
                {ARCHETYPES.map((a) => (
                  <div key={a.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderLeft: `3px solid ${a.color}`, backgroundColor: '#ECEAE4' }}>
                      <span style={{ fontSize: '0.85rem', color: '#7A746B' }}>{a.icon} {a.name}</span>
                    </div>
                    <div className="sim-skeleton" style={{ height: 160, margin: '0' }} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <section style={{ padding: '40px 20px 20px', backgroundColor: '#F7F4EF' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {submittedPrompt && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#A39E95',
                    marginBottom: 20,
                    textAlign: 'center',
                  }}>
                    &ldquo;{submittedPrompt.length > 120 ? submittedPrompt.slice(0, 120) + '...' : submittedPrompt}&rdquo;
                  </p>
                )}
                <div className="sim-grid">
                  {ARCHETYPES.map((a) => (
                    <div
                      key={a.id}
                      className="sim-card"
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        border: '1px solid #DDD6CC',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '14px 20px',
                        borderLeft: `3px solid ${a.color}`,
                        backgroundColor: '#ECEAE4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#2D2926' }}>{a.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#7A746B' }}>{a.tagline}</p>
                        </div>
                      </div>
                      <div style={{ padding: '16px 20px' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '0.9rem',
                          lineHeight: 1.7,
                          color: '#4A453E',
                          whiteSpace: 'pre-wrap',
                        }}>
                          {results[a.id] || 'Response unavailable.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section style={{
              padding: '48px 20px',
              backgroundColor: '#2D2926',
              textAlign: 'center',
            }}>
              <h2
                className="font-heading"
                style={{
                  fontSize: '1.4rem',
                  color: '#F7F4EF',
                  fontWeight: 400,
                  marginBottom: 24,
                }}
              >
                Which one felt most like you?
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                {ARCHETYPES.map((a) => (
                  <Link
                    key={a.id}
                    href={`/quiz?source=simulator&preferred=${a.id}`}
                    className="sim-cta-btn"
                    style={{
                      borderColor: a.color,
                      color: '#F7F4EF',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = a.color;
                      (e.currentTarget as HTMLElement).style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = '#F7F4EF';
                    }}
                  >
                    <span>{a.icon}</span>
                    <span>{a.name}</span>
                  </Link>
                ))}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#7A746B', marginTop: 24 }}>
                Generate your full BootFile in 5 minutes &rarr;
              </p>
            </section>
          </>
        )}

        {/* Empty state — no results yet, not loading */}
        {!results && !loading && !error && (
          <section style={{ padding: '60px 20px', backgroundColor: '#F7F4EF', textAlign: 'center' }}>
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <p style={{ fontSize: '1rem', color: '#A39E95', lineHeight: 1.6 }}>
                Enter a prompt above to see four AI thinking styles in action.
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
