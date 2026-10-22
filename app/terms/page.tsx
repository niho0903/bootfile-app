import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for BootFile.',
};

export default function TermsPage() {
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
              marginBottom: 8,
            }}
          >
            Terms of Service
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#7A746B', marginBottom: 32 }}>
            Effective date: June 1, 2025 &middot; Last updated: October 20, 2026
          </p>

          <div style={{ fontSize: '0.95rem', color: '#2D2926', lineHeight: 1.8 }}>
            <Section title="1. Agreement to Terms">
              <p>
                By accessing or using BootFile (&ldquo;the Service&rdquo;), operated by BootFile
                (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), you agree to be bound by
                these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the
                Service. We reserve the right to modify these Terms at any time. Continued use after
                changes constitutes acceptance of the updated Terms.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                BootFile Studio creates a marketing setup from a business brief that you review
                before payment. The setup includes a promotional email, three coordinated social
                posts, an approved brief, reusable AI instructions, a workflow, and a review checklist.
                The original BootFile quiz and personalized AI instruction profiles remain available
                as a separate product. The Service also includes related examples, blog posts, and guides.
              </p>
            </Section>

            <Section title="3. Eligibility">
              <p>
                You must be at least 18 years old or the age of majority in your jurisdiction to use
                the Service or make a purchase. By using the Service, you represent that you meet
                this requirement.
              </p>
            </Section>

            <Section title="4. Purchases and Payment">
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>
                  Purchases are one-time payments for the deliverables described at checkout.
                  A purchase does not create a subscription or include a third-party AI subscription,
                  unlimited new generations, advertising, or automatic publication of your marketing.
                </li>
                <li>
                  <strong>7-day refund.</strong> If you&apos;re not satisfied with your BootFile, you
                  may request a full refund within 7 days of purchase from your private Studio order
                  page, when available, or by emailing{' '}
                  <strong>support@bootfile.ai</strong> from the address used at checkout. Refunds are
                  processed through Stripe and typically appear on your statement within 5–10
                  business days. We do not guarantee a specific response time. After 7 days, purchases
                  are final.
                </li>
                <li>
                  Payment is processed securely by Stripe. We never see or store your payment card
                  details. Stripe&apos;s terms and privacy policy govern all payment processing.
                </li>
                <li>
                  Prices are listed in USD and may change at any time without notice. Price changes
                  do not affect previously completed purchases.
                </li>
                <li>
                  You are responsible for any taxes applicable to your purchase based on your
                  jurisdiction.
                </li>
              </ul>
            </Section>

            <Section title="5. What You Get">
              <p>
                You may use, copy, edit, and store the content generated for your purchase.
                For Studio, this includes publishing the promotional email and social posts to
                market your own business, and reusing your brief and AI instructions in your own
                work. To the extent we hold rights in that generated content, we grant you a
                non-exclusive license for those personal and commercial uses.
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>You retain your rights in the business materials you submit.</li>
                <li>You may paste your purchased setup into your chosen AI platform.</li>
                <li>
                  You must have permission to use the materials you submit and review the output
                  for accuracy and suitability before sending or publishing it.
                </li>
                <li>
                  This permission does not transfer ownership of BootFile&apos;s software, branding,
                  quiz system, or underlying generation tools, or permit their resale as your product.
                </li>
                <li>
                  AI output may be similar to other output. We do not promise that generated content
                  is unique or that any particular intellectual property protection applies to it.
                </li>
              </ul>
            </Section>

            <Section title="6. Our Intellectual Property">
              <p>
                All content, design, code, quiz methodology, archetype frameworks, scoring systems,
                generation prompts, branding, copy, and visual identity of BootFile are the exclusive
                property of BootFile and are protected by copyright, trademark, and other
                intellectual property laws.
              </p>
              <p>
                The BootFile name, logo, green dot mark, archetype names (&ldquo;The Surgeon,&rdquo;
                &ldquo;The Architect,&rdquo; &ldquo;The Sparring Partner,&rdquo; &ldquo;The
                Translator,&rdquo; &ldquo;The Co-Pilot,&rdquo; &ldquo;The Librarian,&rdquo;
                &ldquo;The Closer,&rdquo; &ldquo;The Maker&rdquo;), and all associated branding are
                trademarks of BootFile. You may not use any of these marks without prior written
                permission.
              </p>
              <p>
                You may <strong>not</strong> copy, reproduce, reverse-engineer, scrape, or extract
                the quiz questions, scoring logic, generation prompts, archetype system, or any
                proprietary methodology used by the Service.
              </p>
            </Section>

            <Section title="7. User Conduct">
              <p>You agree not to:</p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>
                  Use the Service for any unlawful purpose or in violation of any applicable law.
                </li>
                <li>
                  Attempt to gain unauthorized access to the Service, its servers, or any connected
                  systems.
                </li>
                <li>
                  Use unauthorized automated tools, bots, scrapers, or scripts to extract the Service,
                  evade its limits, or access another customer&apos;s data.
                </li>
                <li>
                  Interfere with or disrupt the Service, including through denial-of-service attacks
                  or introduction of malware.
                </li>
                <li>
                  Resell the Service or its underlying tools, or share private order access links
                  with people you have not authorized. Publishing your Studio marketing output as
                  permitted in Section 5 is allowed.
                </li>
                <li>
                  Circumvent or attempt to circumvent any payment, access, or security mechanisms.
                </li>
              </ul>
            </Section>

            <Section title="8. AI-Generated Content Disclaimer">
              <p>
                Your BootFile is generated using artificial intelligence. While we design and tune
                the generation process carefully, AI output is inherently variable. We make{' '}
                <strong>no guarantees</strong> regarding:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>
                  The accuracy, completeness, or suitability of your BootFile for any particular
                  purpose.
                </li>
                <li>
                  The performance, behavior, or response quality of any third-party AI platform after
                  applying your BootFile.
                </li>
                <li>
                  Specific outcomes, results, or improvements in your AI interactions.
                </li>
              </ul>
              <p>
                Your setup contains suggested instructions and draft content. It is not professional
                advice. We do not guarantee marketing results, sales, or revenue. You remain responsible
                for the claims you approve and the material you choose to publish.
              </p>
            </Section>

            <Section title="9. Third-Party Platforms">
              <p>
                BootFile is not affiliated with, endorsed by, or sponsored by OpenAI (ChatGPT),
                Anthropic (Claude), Google (Gemini), xAI (Grok), DeepSeek, Microsoft (Copilot), or
                any other AI platform. These platforms may change their features, instruction
                formats, or terms at any time. We are not responsible for any changes made by
                third-party platforms that affect the functionality of your BootFile.
              </p>
            </Section>

            <Section title="10. Data and Privacy">
              <p>
                Your use of the Service is also governed by our{' '}
                <a href="/privacy" style={{ color: '#7D8B6E', textDecoration: 'underline' }}>
                  Privacy Policy
                </a>
                , which is incorporated into these Terms by reference. Key points:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>
                  We store your submitted brief, purchase record, and generated setup to fulfill your
                  order, recover delivery, and provide support. A private Studio access link is sent
                  to the delivery email address you provide.
                </li>
                <li>
                  We collect your email address during checkout for purchase fulfillment and
                  support purposes. Service providers process the information needed for generation,
                  payment, storage, hosting, and delivery as described in our Privacy Policy.
                  A purchase does not enroll you in promotional email campaigns.
                </li>
                <li>
                  We collect operational records and aggregate metrics to monitor fulfillment and
                  improve the Service. We do not include private Studio briefs or order access links
                  in advertising analytics.
                </li>
              </ul>
            </Section>

            <Section title="11. Disclaimer of Warranties">
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
              </p>
              <p>
                We do not warrant that the Service will be uninterrupted, error-free, secure, or free
                of harmful components. We do not warrant that any results obtained from the Service
                will be accurate or reliable.
              </p>
            </Section>

            <Section title="12. Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BOOTFILE, ITS
                OWNERS, OPERATORS, AFFILIATES, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA,
                OR USE, WHETHER IN AN ACTION IN CONTRACT, TORT, OR OTHERWISE, ARISING OUT OF OR
                RELATED TO YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE
                SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS
                PRECEDING THE CLAIM.
              </p>
            </Section>

            <Section title="13. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless BootFile, its owners, operators,
                and affiliates from and against any and all claims, damages, losses, liabilities,
                costs, and expenses (including reasonable attorneys&apos; fees) arising out of or
                related to:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Your use of the Service.</li>
                <li>Your violation of these Terms.</li>
                <li>Your violation of any rights of a third party.</li>
                <li>
                  Any content you submit to the Service, including quiz answers and open-text
                  responses.
                </li>
              </ul>
            </Section>

            <Section title="14. Service Availability and Modification">
              <p>
                We reserve the right to modify, suspend, or discontinue the Service (or any part of
                it) at any time, with or without notice, for any reason. We will not be liable to you
                or any third party for any modification, suspension, or discontinuation of the
                Service.
              </p>
              <p>
                We reserve the right to change pricing, features, tier structures, and product
                offerings at any time. Changes do not affect previously completed purchases.
              </p>
            </Section>

            <Section title="15. Termination">
              <p>
                We may terminate or suspend your access to the Service immediately, without prior
                notice, for any reason, including breach of these Terms. Upon termination, your right
                to use the Service ceases immediately. Any provisions of these Terms that by their
                nature should survive termination will survive (including, without limitation,
                intellectual property provisions, disclaimers, indemnification, and limitations of
                liability).
              </p>
            </Section>

            <Section title="16. Governing Law and Disputes">
              <p>
                These Terms are governed by and construed in accordance with the laws of the State of
                Delaware, United States, without regard to its conflict of law provisions.
              </p>
              <p>
                Any dispute arising from these Terms or your use of the Service shall be resolved
                exclusively in the state or federal courts located in the State of Delaware. You
                consent to the personal jurisdiction of such courts.
              </p>
              <p>
                YOU AGREE THAT ANY CLAIM OR CAUSE OF ACTION ARISING FROM OR RELATED TO THE SERVICE
                MUST BE FILED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION AROSE, OR BE PERMANENTLY
                BARRED.
              </p>
            </Section>

            <Section title="17. Severability">
              <p>
                If any provision of these Terms is held to be invalid or unenforceable, the remaining
                provisions shall continue in full force and effect. The invalid or unenforceable
                provision shall be modified to the minimum extent necessary to make it valid and
                enforceable.
              </p>
            </Section>

            <Section title="18. Entire Agreement">
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement
                between you and BootFile regarding your use of the Service. These Terms supersede all
                prior agreements, representations, and understandings.
              </p>
            </Section>

            <Section title="19. Contact">
              <p>
                Questions about these Terms? Contact us at <strong>support@bootfile.ai</strong>.
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
