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
                During checkout, we collect your <strong>email address</strong> so we can deliver your BootFile
                and send a Stripe payment receipt. We also collect your supplementary question answers
                (work domain, technical level, AI use cases, decision style, response length preferences)
                to personalize your BootFile.
              </p>
              <p>
                If you choose to answer the optional open-text question (Q9) and check the consent box,
                we store your anonymous response for aggregate research purposes.
              </p>
            </Section>

            <Section title="Your BootFile">
              <p>
                Your generated BootFile is stored securely in our database so we can provide customer
                support, resend your BootFile if needed, and improve the product. Your BootFile is also
                emailed to the address you provide during checkout.
              </p>
              <p>
                We do <strong>not</strong> share your BootFile content with third parties or use it for
                purposes other than delivering the product and providing support.
              </p>
            </Section>

            <Section title="Email">
              <p>
                We use your email address to:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Deliver your BootFile after purchase</li>
                <li>Send your Stripe payment receipt</li>
                <li>Respond to support requests</li>
              </ul>
              <p>
                We do <strong>not</strong> send marketing emails, newsletters, or share your email
                with third parties. Email delivery is handled by <strong>Resend</strong>.
              </p>
            </Section>

            <Section title="Payment">
              <p>
                Payment is processed entirely by <strong>Stripe</strong>. We never see or store your
                credit card number. Stripe&apos;s privacy policy applies to all payment data.
              </p>
            </Section>

            <Section title="Data storage">
              <p>
                Your data (quiz results, purchase details, BootFile text, email) is stored securely
                in <strong>Supabase</strong> with row-level security enabled. We retain this data to
                provide customer support and product improvements.
              </p>
              <p>We do <strong>not</strong>:</p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Sell your data to third parties</li>
                <li>Use your data for advertising</li>
                <li>Track you across other websites</li>
                <li>Create user accounts or profiles beyond what is needed for purchase fulfillment</li>
              </ul>
            </Section>

            <Section title="Analytics">
              <p>
                We use <strong>Vercel Web Analytics</strong> to track anonymous, aggregate page views and
                site performance. We also track aggregate metrics (quiz completions, purchase counts) in
                our database. This data contains no personally identifiable information beyond the email
                you provide during checkout.
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

            <Section title="Contact">
              <p>
                Questions about your data? Reach out at <strong>support@bootfile.ai</strong>.
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
