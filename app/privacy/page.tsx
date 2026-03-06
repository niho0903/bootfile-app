import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy | BootFile',
  description: 'How BootFile handles your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1
            className="font-heading"
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 2.25rem)',
              color: '#2D2926',
              fontWeight: 400,
              marginBottom: 32,
            }}
          >
            Privacy
          </h1>

          <div style={{ fontSize: '0.95rem', color: '#2D2926', lineHeight: 1.8 }}>
            <Section title="What we collect">
              <p>
                When you take the quiz, we store your <strong>archetype results</strong> (primary, secondary, tertiary)
                and aggregate scores. We do <strong>not</strong> store your individual question answers.
              </p>
              <p>
                If you choose to answer the optional open-text question (Q9) and check the consent box,
                we store your anonymous response for aggregate research purposes. We never tie this to
                your name, email, or any personally identifiable information.
              </p>
            </Section>

            <Section title="What we don't collect">
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>No email addresses</li>
                <li>No names or account info</li>
                <li>No cookies for tracking across sites</li>
                <li>No selling of data to third parties</li>
              </ul>
            </Section>

            <Section title="Payment">
              <p>
                Payment is processed entirely by <strong>Stripe</strong>. We never see or store your
                credit card number. Stripe&apos;s privacy policy applies to all payment data.
              </p>
            </Section>

            <Section title="Your BootFile">
              <p>
                Your generated BootFile is stored only in your browser&apos;s session storage. We do not
                keep a copy on our servers after generation. If you close your browser, your BootFile
                is gone unless you&apos;ve copied it elsewhere.
              </p>
            </Section>

            <Section title="Anonymous research data">
              <p>
                If you consent, your optional open-text response may be used in aggregate (never individually)
                to study AI communication frustrations and improve the BootFile product. This data is:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Fully anonymous, no personal identifiers attached</li>
                <li>Used only in aggregate analysis</li>
                <li>Never shared with third parties in raw form</li>
                <li>Categorized automatically (e.g., &ldquo;verbosity&rdquo;, &ldquo;hedging&rdquo;) for research</li>
              </ul>
            </Section>

            <Section title="Analytics">
              <p>
                We track basic aggregate metrics (quiz completions, purchase counts, platform tab clicks)
                to understand how people use BootFile. This data is anonymous and contains no personal information.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about your data? Reach out at <strong>hello@bootfile.ai</strong>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2D2926', marginBottom: 8 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
