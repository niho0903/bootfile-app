import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SAMPLE_BOOTFILE_TEXT, SAMPLE_BOOTFILE_ARCHETYPE } from '@/lib/sample-bootfile';
import { ARCHETYPES } from '@/lib/archetypes';

export const metadata = {
  title: 'Sample BootFile | See What You Get',
  description:
    'A complete example BootFile, generated for an Architect-archetype engineer. See the full 9-section structure before you take the quiz.',
};

export default function SamplePage() {
  const arch = ARCHETYPES[SAMPLE_BOOTFILE_ARCHETYPE];

  return (
    <>
      <Header />
      <main style={{ backgroundColor: '#F7F4EF', minHeight: '100vh', padding: '64px 20px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Framing */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7A746B',
                marginBottom: 12,
              }}
            >
              Sample BootFile
            </p>
            <h1
              className="font-heading"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 16,
              }}
            >
              See exactly what you get.
            </h1>
            <p style={{ fontSize: '1rem', color: '#7A746B', lineHeight: 1.65, maxWidth: 520, margin: '0 auto' }}>
              Below is a complete BootFile, generated for an {arch.name}-archetype engineering lead.
              All nine sections. No blurring, no upsell.
              Yours will be personalized to your archetype and your quiz answers.
            </p>
          </div>

          {/* Archetype pill */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
              }}
            >
              {arch.icon} Example: The {arch.name}
            </span>
          </div>

          {/* Full sample */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #DDD6CC',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              marginBottom: 32,
            }}
          >
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 14.5,
                color: '#2D2926',
                lineHeight: 1.65,
                fontFamily: 'inherit',
                margin: 0,
              }}
            >
              {SAMPLE_BOOTFILE_TEXT}
            </pre>
          </div>

          {/* What's personalized */}
          <div
            style={{
              backgroundColor: '#ECEAE4',
              border: '1px solid #DDD6CC',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 32,
            }}
          >
            <h2
              className="font-heading"
              style={{ fontSize: '1.1rem', color: '#2D2926', fontWeight: 500, marginBottom: 12 }}
            >
              What's personalized in yours
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#5A544C', lineHeight: 1.7 }}>
              <li>Your cognitive archetype (one of eight — this sample is the Architect)</li>
              <li>How you reason — based on your quiz answers, not generic patterns</li>
              <li>Your domain, technical depth, and primary use cases</li>
              <li>Your pet peeves and the failure modes you flagged</li>
              <li>Six platform-tuned versions, formatted for ChatGPT, Claude, Gemini, Grok, DeepSeek, and Copilot</li>
            </ul>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <Link
              href="/quiz"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#7D8B6E',
                color: '#fff',
                fontWeight: 500,
                padding: '14px 32px',
                borderRadius: 8,
                fontSize: '0.95rem',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease',
              }}
            >
              Take the Quiz
            </Link>
            <p style={{ fontSize: 13, color: '#7A746B', marginTop: 12 }}>
              3 minutes &middot; Free to start &middot; $4.99 to unlock the personalized file
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
