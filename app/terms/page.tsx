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
            Effective date: June 1, 2025 &middot; Last updated: June 1, 2025
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
                BootFile provides a quiz-based tool that identifies your AI reasoning style and
                generates a personalized instruction profile (&ldquo;BootFile&rdquo;) for use with
                third-party AI platforms. The Service includes the quiz, the generated BootFile
                content, platform-specific formatting, and related educational content (blog posts,
                guides).
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
                  <strong>All purchases are final.</strong> Because your BootFile is a digital product
                  generated instantly and delivered immediately, we do not offer refunds, returns, or
                  exchanges.
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
                When you purchase a BootFile, you receive a <strong>personal, non-exclusive,
                non-transferable license</strong> to use the generated content for your own private,
                individual use. Specifically:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>You may paste your BootFile into AI platforms for your personal use.</li>
                <li>You may copy and store your BootFile for your own records.</li>
                <li>
                  You may <strong>not</strong> resell, redistribute, sublicense, or commercially
                  exploit your BootFile or any part of it.
                </li>
                <li>
                  You may <strong>not</strong> use your BootFile to build a competing product or
                  service.
                </li>
                <li>
                  You may <strong>not</strong> present BootFile-generated content as your own
                  original methodology, framework, or system for commercial purposes.
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
                  Use automated tools, bots, scrapers, or scripts to access or interact with the
                  Service.
                </li>
                <li>
                  Interfere with or disrupt the Service, including through denial-of-service attacks
                  or introduction of malware.
                </li>
                <li>
                  Share, resell, or distribute purchased BootFiles, or create derivative products
                  based on our methodology.
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
                Your BootFile is a set of suggested instructions, not professional advice. You use it
                at your own discretion.
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
                  Your BootFile is stored only in your browser&apos;s session storage. We do not
                  retain a copy after generation.
                </li>
                <li>
                  If you lose your BootFile (by closing your browser, clearing storage, etc.), it
                  cannot be recovered. We are not responsible for lost content.
                </li>
                <li>
                  We collect anonymous, aggregate data about quiz completions and product usage. We
                  do not collect personal information.
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
                Questions about these Terms? Contact us at <strong>hello@bootfile.ai</strong>.
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
