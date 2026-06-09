import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Methodology | How BootFile Works',
  description:
    'How the BootFile assessment works, what it is, and — just as important — what it isn’t. An honest accounting of the eight-archetype framework, scoring, and limits.',
};

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <main style={{ backgroundColor: '#F7F4EF', minHeight: '100vh', padding: '64px 20px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Heading */}
          <div style={{ marginBottom: 40 }}>
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
              Methodology
            </p>
            <h1
              className="font-heading"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 16,
                lineHeight: 1.25,
              }}
            >
              How BootFile works — and what it isn&rsquo;t.
            </h1>
            <p style={{ fontSize: '1rem', color: '#7A746B', lineHeight: 1.7 }}>
              We&rsquo;d rather be honest about what this is than dress it up as something it&rsquo;s not.
              Below is the actual mechanism.
            </p>
          </div>

          <Section title="What we built">
            <p>
              BootFile is an eight-archetype framework for how people prefer to reason with an AI.
              The archetypes are: the Surgeon, the Architect, the Sparring Partner, the Translator,
              the Co-Pilot, the Librarian, the Closer, and the Maker.
            </p>
            <p>
              We developed this taxonomy internally. It is not adapted from a published
              psychometric instrument, and we&rsquo;re not going to dress it up that way.
              It is a working model designed to capture differences that matter
              for AI interaction specifically — not general personality.
            </p>
          </Section>

          <Section title="How the assessment works">
            <p>
              The quiz is eight questions. Each question is designed to surface a
              preference that maps to one or more archetypes. The mapping is deterministic:
              each answer carries weighted points across the eight archetypes, and your
              top score is your primary archetype.
            </p>
            <p>
              When two archetypes are close (within 3 points), the second is shown as a
              secondary tendency. When three are tightly grouped (within 5 points), the
              third is surfaced as context, not displayed prominently. The thresholds are
              ours, set by what we&rsquo;ve seen produce useful results — not derived
              from external statistical validation.
            </p>
          </Section>

          <Section title="What the BootFile actually contains">
            <p>
              Your archetype determines tone, defaults, and the shape of the nine sections.
              Your quiz answers personalize the content within those sections. Two people
              with the same primary archetype will get visibly different files if their
              other answers differ.
            </p>
            <p>
              The nine sections: First Message, About Me, How I Think, How to Reason
              With Me, Communication Rules, Format Preferences, Failure Detection,
              Never Do This, and Quick Commands. You can see a full sample at{' '}
              <Link href="/sample" style={{ color: '#7D8B6E', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                bootfile.ai/sample
              </Link>.
            </p>
          </Section>

          <Section title="What it isn't">
            <p>
              BootFile is not a clinically validated psychometric instrument. It is not
              Big Five, not MBTI, not DiSC, and not adapted from peer-reviewed research.
              It will not tell you anything reliable about your mental health,
              relationships, or career fit.
            </p>
            <p>
              It is also self-report. Like any self-report assessment, it&rsquo;s
              shaped by how you saw yourself the day you answered the quiz.
              Retaking it later can yield a different result, especially if you&rsquo;ve
              gained clarity about how you actually want an AI to talk to you.
            </p>
          </Section>

          <Section title="How we know it works">
            <p>
              Honest answer: we observe two things. First, the file produces noticeably
              different AI behavior — that part is mechanical, it&rsquo;s just custom
              instructions. Second, people who retake the quiz often re-land on the same
              archetype, which is the minimum bar for a working classification.
            </p>
            <p>
              We have not run statistical reliability or validity studies. If we ever
              do, we&rsquo;ll publish the methodology and the data. Until then, treat the
              archetype as a useful frame, not a diagnosis.
            </p>
          </Section>

          <Section title="Limits we're aware of">
            <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, color: '#5A544C', lineHeight: 1.7 }}>
              <li>
                Eight archetypes are a compression. Real cognition doesn&rsquo;t cleanly
                bucket. Your secondary archetype matters; so do the ones at the bottom.
              </li>
              <li>
                Self-report bias applies. The quiz reflects how you describe yourself,
                not how you actually behave under pressure.
              </li>
              <li>
                The framework is English-language and likely culturally indexed to the
                kind of work people use AI for today: knowledge work, creative work,
                technical work. Other domains may need different framing.
              </li>
              <li>
                We iterate on quiz questions and content. The archetype names and
                taxonomy are stable; the surrounding language evolves.
              </li>
            </ul>
          </Section>

          <Section title="Why we built it this way">
            <p>
              Native AI memory works inside one platform. People use multiple platforms.
              A BootFile is portable — same cognitive profile, every tool — and the
              archetype framing was the cleanest abstraction we found for what to put
              in those custom instructions.
            </p>
            <p>
              The eight archetypes aren&rsquo;t arbitrary. They&rsquo;re the patterns
              we kept seeing in how people we trust prefer to be reasoned with — the
              ones who want the answer first, the ones who want the system view, the
              ones who want to be challenged. We named them and wrote down the rules
              for each.
            </p>
          </Section>

          {/* CTA */}
          <div
            style={{
              marginTop: 48,
              padding: 32,
              backgroundColor: '#ECEAE4',
              borderRadius: 16,
              textAlign: 'center',
            }}
          >
            <p
              className="font-heading"
              style={{ fontSize: '1.2rem', color: '#2D2926', fontWeight: 400, marginBottom: 16 }}
            >
              Take the quiz. Find your archetype.
            </p>
            <Link
              href="/quiz"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#7D8B6E',
                color: '#fff',
                fontWeight: 500,
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              Take the Quiz
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        className="font-heading"
        style={{
          fontSize: '1.25rem',
          color: '#2D2926',
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15, color: '#5A544C', lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
