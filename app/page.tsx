import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { ARCHETYPES } from '@/lib/archetypes';
import { SAMPLE_BOOTFILE_TEXT } from '@/lib/sample-bootfile';
import {
  organizationJsonLd,
  webApplicationJsonLd,
  faqPageJsonLd,
  breadcrumbJsonLd,
} from '@/lib/json-ld';

const faqs: {
  question: string;
  answer: string;
  link?: { href: string; label: string };
}[] = [
  {
    question: 'What is a BootFile?',
    answer:
      'A BootFile is the output of an eight-archetype cognitive assessment — a portable profile that tells any AI how you reason, how you make decisions, and what kind of thinking earns your trust. Same file, works across ChatGPT, Claude, Gemini, and every major AI you use.',
  },
  {
    question: 'How long does the quiz take?',
    answer:
      'About three minutes. A short assessment identifies your cognitive archetype, then a few follow-up questions personalize the profile to your work and your context.',
  },
  {
    question: 'How does the assessment work?',
    answer:
      'Eight questions measure how you prefer to reason — how you process information, how you make decisions, and what kind of answers earn your trust. Your answer pattern maps to one of eight cognitive archetypes. We developed the framework specifically for AI interaction, and we publish exactly how it works.',
    link: { href: '/methodology', label: 'Read the full methodology' },
  },
  {
    question: 'Which AI platforms does BootFile work with?',
    answer:
      'Every major AI: ChatGPT, Claude, Google Gemini, Grok, DeepSeek, and Microsoft Copilot. Your BootFile is formatted for each platform’s custom-instruction system, so it’s the same cognitive profile expressed in the way each tool expects.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'The quiz is free. A BootFile is $4.99, one-time. It includes formatted output for all 6 AI platforms.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. Your quiz answers are used only to generate your BootFile. We don’t sell your data or share it with third parties. See our Privacy Policy for full details.',
  },
];

export const metadata = {
  title: 'BootFile | Find Your Cognitive Archetype',
  description:
    'Find your cognitive archetype in three minutes. Get a portable AI profile that works the same across ChatGPT, Claude, Gemini, and every tool you use.',
};

export default function LandingPage() {
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          webApplicationJsonLd(),
          faqPageJsonLd(faqs),
          breadcrumbJsonLd([{ name: 'Home', href: '/' }]),
        ]}
      />
      <Header />
      <main>
        {/* Hero — cream background */}
        <section className="hero-glow" style={{ padding: '120px 20px 80px', textAlign: 'center', backgroundColor: '#F7F4EF' }}>
          <div className="hero-animate" style={{ maxWidth: 480, margin: '0 auto' }}>
            <p
              className="hero-animate"
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#7D8B6E',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                marginBottom: 16,
              }}
            >
              The first personality test your AI can read
            </p>
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
              Find your cognitive archetype. Get a profile every AI understands.
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

        {/* Archetype grid — stone background */}
        <section style={{ padding: '80px 20px', backgroundColor: '#ECEAE4' }}>
          <div
            style={{
              maxWidth: 800,
              margin: '0 auto',
              padding: 0,
              textAlign: 'center',
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
              Eight cognitive archetypes. One belongs to you.
            </h2>

            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#7A746B',
                maxWidth: 600,
                margin: '0 auto 40px',
              }}
            >
              Take the three-minute quiz to find yours. Your BootFile is a portable
              thinking profile — paste it into any AI you use, and every
              conversation starts with the AI already understanding how you reason.
            </p>

            <style>{`
              .bf-archetype-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
              @media (min-width: 700px) { .bf-archetype-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
            `}</style>
            <div className="bf-archetype-grid" style={{ marginBottom: 32 }}>
              {Object.values(ARCHETYPES).map((archetype) => (
                <div
                  key={archetype.name}
                  style={{
                    backgroundColor: '#F7F4EF',
                    borderRadius: 12,
                    padding: '24px 16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: 10 }} aria-hidden>
                    {archetype.icon}
                  </div>
                  <p
                    className="font-heading"
                    style={{
                      fontSize: '1rem',
                      color: '#2D2926',
                      fontWeight: 400,
                      marginBottom: 6,
                    }}
                  >
                    {archetype.name}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#7A746B', lineHeight: 1.4 }}>
                    {archetype.tagline}
                  </p>
                </div>
              ))}
            </div>

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

        {/* Artifact — cream background */}
        <section style={{ padding: '80px 20px', backgroundColor: '#F7F4EF' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2
              className="font-heading"
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.3,
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              You get a file, not a feeling.
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#7A746B',
                textAlign: 'center',
                maxWidth: 480,
                margin: '0 auto 32px',
              }}
            >
              Most personality tests end with a label. This one ends with a
              nine-section instruction file your AI actually reads — paste it
              once and every conversation starts calibrated to you.
            </p>

            <div
              style={{
                backgroundColor: '#2D2926',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#3A3633',
                  fontSize: 12,
                  color: '#A09B93',
                  letterSpacing: '0.03em',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                bootfile-architect.txt
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '20px 16px 28px',
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: '#C4BFB6',
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent)',
                }}
              >
                {SAMPLE_BOOTFILE_TEXT.split('\n').slice(0, 14).join('\n')}
              </pre>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
              <Link
                href="/sample"
                style={{
                  color: '#7D8B6E',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                See the complete sample BootFile &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* Before/After Comparison — dark background */}
        <section style={{ padding: '80px 20px', backgroundColor: '#2D2926' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2
              className="font-heading"
              style={{
                fontSize: '1.5rem',
                lineHeight: 1.3,
                color: '#F7F4EF',
                fontWeight: 400,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Same AI. Different results.
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#A09B93',
                textAlign: 'center',
                marginBottom: 32,
              }}
            >
              &ldquo;Should I ask for a raise now or wait until my next review?&rdquo;
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <style>{`@media (min-width: 700px) { .bf-compare-row { flex-direction: row !important; } }`}</style>
              <div className="bf-compare-row" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Without BootFile */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#3A3633',
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#A09B93',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      marginBottom: 16,
                    }}
                  >
                    Without BootFile
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: '#C4BFB6',
                    }}
                  >
                    &ldquo;There are several factors to consider when deciding whether to ask for a raise. Let&apos;s break this down:
                    <br /><br />
                    Timing considerations:
                    <br />
                    - Performance reviews are typically...
                    <br />
                    - Market conditions may affect...
                    <br /><br />
                    Preparation steps:
                    <br />
                    - Document your accomplishments...
                    <br /><br />
                    It depends on your specific situation...&rdquo;
                  </p>
                </div>

                {/* With BootFile */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#3A3633',
                    borderRadius: 12,
                    padding: 24,
                    borderLeft: '3px solid #7D8B6E',
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#7D8B6E',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      marginBottom: 16,
                    }}
                  >
                    With BootFile
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: '#F7F4EF',
                    }}
                  >
                    &ldquo;Ask now. Here&apos;s why:
                    <br /><br />
                    You closed $340K in new business last quarter — 40% above target. Your review isn&apos;t for 5 months, and waiting signals you don&apos;t know your leverage. Market rate for your role in your city is $115-130K. You&apos;re at $98K.
                    <br /><br />
                    One risk: if layoffs are actively being discussed, wait. Are they?&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 14,
                color: '#7D8B6E',
                textAlign: 'center',
                marginTop: 24,
                marginBottom: 24,
              }}
            >
              Same question. Same AI. The only difference is a BootFile.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link
                href="/simulator"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#7D8B6E',
                  color: '#fff',
                  fontWeight: 500,
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Try It
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ — cream background */}
        <section style={{ padding: '80px 20px', backgroundColor: '#F7F4EF' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2
              className="font-heading"
              style={{
                fontSize: '1.5rem',
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 32,
                textAlign: 'center',
              }}
            >
              Frequently Asked Questions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h3
                    className="font-heading"
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 400,
                      color: '#2D2926',
                      marginBottom: 8,
                    }}
                  >
                    {faq.question}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                      color: '#7A746B',
                    }}
                  >
                    {faq.answer}
                  </p>
                  {faq.link && (
                    <p style={{ marginTop: 8, fontSize: '0.95rem' }}>
                      <Link
                        href={faq.link.href}
                        style={{
                          color: '#7D8B6E',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        {faq.link.label} &rarr;
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA — stone background */}
        <section style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: '#ECEAE4' }}>
          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              color: '#2D2926',
              fontWeight: 400,
              marginBottom: 24,
            }}
          >
            Three minutes. One profile. Every AI you use, finally on the same page about you.
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
          <p style={{ marginTop: 16, fontSize: 14 }}>
            <Link
              href="/sample"
              style={{
                color: '#7A746B',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Or see a complete sample BootFile first &rarr;
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
