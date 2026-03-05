import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'BootFile — Know Your AI Style',
  description: 'Take the 2-minute quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
};

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section style={{ padding: '120px 20px 80px', textAlign: 'center' }}>
          <div className="hero-animate" style={{ maxWidth: 480, margin: '0 auto' }}>
            <h1
              className="font-heading hero-animate"
              style={{
                fontSize: 'clamp(2.4rem, 6vw, 3rem)',
                lineHeight: 1.15,
                color: '#2D2926',
                letterSpacing: '-0.01em',
                fontWeight: 400,
              }}
            >
              How do you think?
            </h1>

            <p
              className="hero-animate"
              style={{
                fontSize: '1.1rem',
                lineHeight: 1.65,
                color: '#7A746B',
                maxWidth: 440,
                margin: '16px auto 32px',
                fontWeight: 400,
              }}
            >
              Your AI doesn&apos;t know yet. It takes two minutes to fix that.
            </p>

            <Link
              href="/quiz"
              className="hero-animate"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#7D8B6E',
                color: '#fff',
                fontWeight: 500,
                padding: '14px 28px',
                borderRadius: 8,
                fontSize: '0.95rem',
                letterSpacing: '0.01em',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease',
              }}
            >
              Take the Quiz
            </Link>
          </div>
        </section>

        {/* Explanation */}
        <section style={{ padding: '0 20px 80px' }}>
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              backgroundColor: '#ECEAE4',
              borderRadius: 12,
              padding: 32,
            }}
          >
            <h2
              className="font-heading"
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.3,
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 16,
              }}
            >
              A BootFile is a personalized instruction profile.
            </h2>

            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#7A746B',
                marginBottom: 20,
              }}
            >
              It tells ChatGPT, Claude, or Gemini how you reason, how you make
              decisions, and what kind of thinking earns your trust. Not a
              personality test. A thinking profile that makes every conversation
              feel like it already knows you.
            </p>

            <Link
              href="/quiz"
              style={{
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#7D8B6E',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              8 ways of thinking. Which one is yours? &rarr;
            </Link>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ padding: '0 20px 80px', textAlign: 'center' }}>
          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              color: '#2D2926',
              fontWeight: 400,
              marginBottom: 24,
            }}
          >
            Two minutes. Eight questions.
          </h2>

          <Link
            href="/quiz"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 500,
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: '0.95rem',
              letterSpacing: '0.01em',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease',
            }}
          >
            Take the Quiz
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
