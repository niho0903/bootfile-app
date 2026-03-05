import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'BootFile \u2014 Know Your AI Style',
  description: 'Take the free 2-minute quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
};

export default function LandingPage() {
  return (
    <>
      <Header />
      <main style={{ paddingTop: 60 }}>
        {/* Hero */}
        <section style={{ padding: '80px 0 60px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 9999,
                backgroundColor: '#f0fafa',
                color: '#0e6e6e',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 28,
              }}
            >
              Free 2-minute quiz
            </div>

            <h1
              className="font-heading"
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                lineHeight: 1.15,
                color: '#1a1a1a',
                marginBottom: 20,
                letterSpacing: '-0.01em',
              }}
            >
              Your AI doesn&apos;t know how you think.
              <br />
              <span style={{ color: '#0e6e6e' }}>Your BootFile fixes that.</span>
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: '#666',
                maxWidth: 540,
                margin: '0 auto 32px',
              }}
            >
              Take the 2-minute quiz. Get a personalized instruction profile
              that tells ChatGPT, Claude, or Gemini how to reason with
              you &mdash; not just talk at you.
            </p>

            <Link
              href="/quiz"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0e6e6e',
                color: '#fff',
                fontWeight: 600,
                padding: '16px 36px',
                borderRadius: 12,
                fontSize: 16,
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(14, 110, 110, 0.3)',
              }}
            >
              Take the Quiz &mdash; Free
            </Link>

            <p style={{ marginTop: 16, fontSize: 14, color: '#999' }}>
              8 archetypes. 2,000+ users.
            </p>
          </div>
        </section>

        {/* Why BootFile */}
        <section
          style={{
            padding: '64px 0',
            backgroundColor: '#fff',
            borderTop: '1px solid #edeae5',
            borderBottom: '1px solid #edeae5',
          }}
        >
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
            <h2
              className="font-heading"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#1a1a1a', textAlign: 'center', marginBottom: 48 }}
            >
              Why BootFile?
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {[
                {
                  icon: '🧠',
                  title: 'It prescribes reasoning, not just style',
                  desc: 'Your BootFile doesn\'t just say "be concise." It tells your AI how to think through problems in a way that matches how you make decisions.',
                },
                {
                  icon: '🚨',
                  title: 'It includes failure detection',
                  desc: 'Your BootFile teaches your AI when its own output has failed \u2014 before you have to point it out. A self-correcting AI that knows your standards.',
                },
                {
                  icon: '🎯',
                  title: "It's specific to your domain + decision style",
                  desc: 'Two marketers get different BootFiles. Two engineers get different BootFiles. Because how you think matters more than what you do.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    backgroundColor: '#fdfcfb',
                    border: '1px solid #dcd9d5',
                    borderRadius: 16,
                    padding: 28,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
                  <h3
                    className="font-heading"
                    style={{ fontSize: 18, color: '#1a1a1a', marginBottom: 8, lineHeight: 1.3 }}
                  >
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65 }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Objection */}
        <section style={{ padding: '64px 0' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid #dcd9d5',
                borderRadius: 20,
                padding: 32,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <h3
                className="font-heading"
                style={{ fontSize: 20, color: '#1a1a1a', marginBottom: 12 }}
              >
                &ldquo;Isn&apos;t this just custom instructions?&rdquo;
              </h3>
              <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
                Custom instructions tell your AI how to <em>format</em> responses.
                Your BootFile tells it how to <em>think</em>. It&apos;s the
                difference between &ldquo;be concise&rdquo; and a complete operating
                system with reasoning frameworks, failure detection, and
                domain-specific behavioral rules. Most people can&apos;t write this
                for themselves &mdash; not because they don&apos;t know what they
                want, but because translating intuitive preferences into
                concrete AI instructions is genuinely hard.
              </p>
            </div>
          </div>
        </section>

        {/* Second CTA */}
        <section style={{ padding: '48px 0 80px', textAlign: 'center' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
            <h2
              className="font-heading"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#1a1a1a', marginBottom: 12 }}
            >
              Ready to meet your AI style?
            </h2>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 16 }}>
              Free quiz. 2 minutes. No signup required.
            </p>
            <Link
              href="/quiz"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0e6e6e',
                color: '#fff',
                fontWeight: 600,
                padding: '16px 36px',
                borderRadius: 12,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(14, 110, 110, 0.3)',
              }}
            >
              Take the Quiz &mdash; Free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
