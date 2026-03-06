import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import {
  organizationJsonLd,
  webApplicationJsonLd,
  faqPageJsonLd,
  breadcrumbJsonLd,
} from '@/lib/json-ld';

const faqs = [
  {
    question: 'What is a BootFile?',
    answer:
      'A BootFile is a personalized AI instruction profile based on how you think. It tells your AI how to reason with you, how to format responses, and what to avoid, so every conversation feels like the AI already knows you.',
  },
  {
    question: 'How long does the quiz take?',
    answer:
      'About five minutes. A short quiz identifies your reasoning style, then a few follow-up questions personalize your BootFile to your exact needs.',
  },
  {
    question: 'Which AI platforms does BootFile work with?',
    answer:
      'BootFile generates custom instructions formatted for ChatGPT, Claude, Google Gemini, Grok, DeepSeek, and Microsoft Copilot. Each format is optimized for the platform\u2019s specific instruction system.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'The quiz is free. A BootFile is $4.99, one-time. It includes all 6 AI platform formats.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. Your quiz answers are used only to generate your BootFile. We don\u2019t sell your data or share it with third parties. See our Privacy Policy for full details.',
  },
];

export const metadata = {
  title: 'BootFile | Know Your AI Style',
  description:
    'Take the quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
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
              Your AI doesn&apos;t know yet. It takes five minutes to fix that.
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

        {/* Explanation — stone background */}
        <section style={{ padding: '80px 20px', backgroundColor: '#ECEAE4' }}>
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              padding: 0,
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
              It tells your AI how you reason, how you make decisions, and what
              kind of thinking earns your trust. Not a personality test. A thinking
              profile that makes every conversation feel like it already knows you.
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
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 600,
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
            Five minutes. One profile that changes everything.
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
