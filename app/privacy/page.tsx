import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy',
  description: 'How BootFile handles your business brief, purchases, and generated setup.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main style={{ padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.25rem)', color: '#2D2926', fontWeight: 400, marginBottom: 8 }}>
            Privacy
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#7A746B', marginBottom: 32 }}>Last updated: October 20, 2026</p>
          <div style={{ fontSize: '0.95rem', color: '#2D2926', lineHeight: 1.8 }}>
            <Section title="Your Studio brief and setup">
              <p>
                When you submit a Studio order, we collect your delivery email and the business
                information you choose to provide: your offer, audience, goal, approved facts,
                call to action, writing sample, and constraints. We use this information to generate
                the setup you purchased. We store the submitted brief, generated output, and delivery
                record so you can retrieve your purchase and we can resolve failed orders.
              </p>
              <p>
                Submit only material you have permission to use. Do not include passwords, payment
                card details, confidential customer records, or other sensitive information that is
                unnecessary for your marketing task. Our public sample uses a fictional business.
              </p>
            </Section>
            <Section title="Service providers">
              <p>We use providers to operate the service:</p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li><strong>Anthropic</strong> processes the relevant brief and instructions to generate your setup.</li>
                <li><strong>Supabase</strong> stores order, brief, output, and operational records.</li>
                <li><strong>Stripe</strong> processes payments and refunds. We store payment references and status, not your full card number.</li>
                <li><strong>Resend</strong> processes your delivery email and the message needed to deliver your purchase.</li>
                <li><strong>Vercel</strong> hosts the website and its server functions.</li>
                <li><strong>Sentry</strong>, when configured, receives filtered technical error reports. Private Studio routes are excluded from these reports.</li>
              </ul>
              <p>
                These providers process information for their role in delivering the service under
                their own applicable terms and privacy policies. Pasting your downloaded setup into
                an AI platform is a separate action that you control, subject to that platform&apos;s policies.
              </p>
            </Section>
            <Section title="Delivery and private access">
              <p>
                We use your email for purchase delivery, payment-related messages, recovery, and
                support. A Studio purchase does not sign you up for promotional campaigns. We do
                not sell your email or business brief.
              </p>
              <p>
                Your Studio order is protected by a private access link instead of a password-based
                account. Anyone you give that link to can access the order and its available customer
                controls. Keep it private. Your browser stores the access key in session storage to
                retain access while you use that browser session. The key is kept out of URL query
                strings and is not sent to advertising analytics.
              </p>
              <p>
                The intake form also keeps a draft of your business fields in session storage in
                your current tab for up to 24 hours, so you can review or revise it. Your delivery
                email and terms acceptance are not included in that draft. You can clear it using
                your browser&apos;s site data controls or by closing the tab.
              </p>
            </Section>
            <Section title="Operations, analytics, and abuse prevention">
              <p>
                We record payment and fulfillment status, bounded retry attempts, and delivery
                events to recover failures and measure service reliability. Order creation uses
                keyed hashes of network and email identifiers to limit abuse. Operational records
                may be linked to an order; they are not represented as anonymous customer data.
              </p>
              <p>
                Vercel Web Analytics measures visits on public informational pages. Private Studio
                intake and order pages, payment pages, and administration pages are excluded.
                Query strings and fragments are removed from public analytics URLs. This version
                of the site does not load Google or Reddit advertising pixels.
              </p>
            </Section>
            <Section title="Optional product feedback">
              <p>
                On your private order page, you can choose to report whether the setup was useful
                and whether you used or reused it. We store those choices and their timestamps
                with your order to understand and improve the product. These are optional,
                customer-reported signals. We do not observe your AI conversations or infer use
                from a download. Feedback does not sign you up for a marketing email campaign.
              </p>
            </Section>
            <Section title="The original quiz">
              <p>
                The original quiz records archetype results and aggregate completion data. Individual
                scored answers are not stored. If you answer the optional open-text question and
                consent to storage, we may retain that response and its research categories to
                understand common AI communication frustrations. Do not include identifying details
                in that optional response. Original profile purchases also retain the supplementary
                answers, delivery email, and generated profile needed for fulfillment and support.
              </p>
            </Section>
            <Section title="Storage, retention, and your requests">
              <p>
                Database access to private order records is restricted to authorized server operations.
                We retain purchase and fulfillment records while needed to deliver and support the
                service, handle payment issues, and meet applicable recordkeeping obligations.
                A purchase does not promise indefinite online storage; you can download your completed setup.
              </p>
              <p>
                To request access, correction, or deletion of your information, email{' '}
                <a href="mailto:support@bootfile.ai" style={{ color: '#536449', textDecoration: 'underline' }}>support@bootfile.ai</a>{' '}
                from your purchase address. We may verify that you are authorized before acting.
                Some transaction records may need to be retained after a deletion request.
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
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2D2926', marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}
