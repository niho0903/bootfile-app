import Link from 'next/link';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { faqPageJsonLd } from '@/lib/json-ld';
import { ArrowIcon, CheckIcon, DocumentIcon, Eyebrow, StudioFooter, StudioHeader, studioColors as c, studioContainer } from '@/components/studio/StudioChrome';

export const metadata: Metadata = {
  title: 'Bootfile — Your next promotion, ready to work on',
  description: 'Turn one business offer into a customer email, three social posts, and a reusable ChatGPT setup. Marketing Setup by Bootfile. $49 once, no subscription.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'One offer. Your next promotion. A better way to use AI.',
    description: 'A customer email, three social posts, and a reusable AI setup built around your business. $49 once.',
    url: '/',
  },
};

const faqs = [
  { question: 'What exactly will I get?', answer: 'Your Marketing Setup includes a business brief based on the facts you confirm, one customer email, three coordinated social posts for one offer, a reusable ChatGPT setup, a prompt for your next promotion, and a review checklist. You can copy the sections individually or download the complete pack.' },
  { question: 'Who is this for?', answer: 'Solo service-business owners with a real offer to promote: for example, a photographer opening bookings, a tutor introducing a workshop, or a consultant launching a service. You bring the details. Bootfile turns them into a focused starting point for your marketing.' },
  { question: 'Why use this if ChatGPT already remembers me?', answer: 'Memory can provide background. A promotion still needs a clear offer, accurate details, a call to action, and a consistent voice. Bootfile helps you put those ingredients together, then gives you the first drafts and a reusable brief you can check and update.' },
  { question: 'Do I need a paid ChatGPT plan?', answer: 'You receive your complete pack from Bootfile. To reuse the setup, you need access to ChatGPT; you can paste it into a conversation. A paid ChatGPT subscription is not included or required by Bootfile. Availability and usage limits are set by OpenAI.' },
  { question: 'Will it send emails or post for me?', answer: 'You get editable drafts and a checklist. You decide what to use and publish it through your own email and social accounts. Before publishing, check the facts, links, dates, and fit for your audience.' },
  { question: 'Is this a subscription?', answer: 'No. Marketing Setup is a one-time $49 purchase in USD for one business and one promotion. You keep the downloadable pack and can reuse its setup in your own ChatGPT account. A new Bootfile-generated promotion is a separate purchase.' },
  { question: 'What if the result isn’t right for me?', answer: 'You can request a full refund within seven days of purchase from your private order page, when available, or by emailing support@bootfile.ai from the address used at checkout. See the Terms for the full refund policy.' },
];

const deliverables = [
  { number: '01', title: 'Your business, clearly briefed.', copy: 'The offer, audience, tone, and facts you want AI to work from. Something you can check, keep, and update.', icon: 'page' as const },
  { number: '02', title: 'Your first promotion, drafted.', copy: 'One customer email and three coordinated social posts. Built around the same offer and next step.', icon: 'email' as const },
  { number: '03', title: 'A setup you can use again.', copy: 'A ready-to-paste ChatGPT setup, a next-promotion prompt, and a practical checklist for reviewing the work.', icon: 'spark' as const },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqs)} />
      <StudioHeader />
      <main id="main-content">
        <section style={{ ...studioContainer, paddingTop: 76, paddingBottom: 84 }}>
          <div className="studio-hero-grid">
            <div style={{ paddingTop: 8 }}>
              <Eyebrow>Marketing Setup · for solo service businesses</Eyebrow>
              <h1 className="font-heading" style={{ fontSize: 'clamp(44px, 5.1vw, 68px)', fontWeight: 400, lineHeight: 1.06, letterSpacing: '-.035em', maxWidth: 590 }}>
                One offer.<br />Your next<br /><span style={{ color: c.green }}>promotion.</span>
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.8, maxWidth: 425, color: c.muted, margin: '26px 0 30px' }}>
                Turn what you do into a customer email, three social posts, and a ChatGPT setup that knows what matters to your business.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                <Link href="/studio" className="studio-button">Build my marketing setup <ArrowIcon /></Link>
                <Link href="/studio/sample" className="studio-text-link" style={{ padding: '10px 0' }}>Explore an example <ArrowIcon /></Link>
              </div>
              <p style={{ color: c.muted, fontSize: 12, marginTop: 18 }}><strong style={{ color: c.ink, fontWeight: 550 }}>$49 once.</strong> No subscription. Review your brief before payment.</p>
            </div>
            <HeroExample />
          </div>
        </section>

        <section style={{ borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}`, background: c.wash }} aria-label="Your marketing setup includes">
          <div className="studio-summary-grid" style={{ ...studioContainer, paddingTop: 23, paddingBottom: 23 }}>
            {['One real offer', 'An email + 3 social posts', 'A reusable ChatGPT setup'].map((text) => <p key={text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: c.green }}><CheckIcon size={16} />{text}</p>)}
          </div>
        </section>

        <section style={{ ...studioContainer, paddingTop: 88, paddingBottom: 88 }}>
          <div className="studio-section-heading">
            <div><Eyebrow>A useful first result. A repeatable way forward.</Eyebrow><h2 className="font-heading" style={{ fontSize: 'clamp(32px, 3.8vw, 44px)', fontWeight: 400, lineHeight: 1.18, letterSpacing: '-.02em', maxWidth: 480 }}>Less blank-page time.<br />More of your business in the work.</h2></div>
            <p style={{ color: c.muted, fontSize: 15, maxWidth: 350, lineHeight: 1.85 }}>You shouldn’t need to become a prompt expert to tell people about your work. Start with a real promotion and leave with something concrete.</p>
          </div>
          <div className="studio-three-grid" style={{ marginTop: 42 }}>
            {deliverables.map((item) => <article key={item.number} style={{ padding: '28px 27px 32px', background: c.paper, border: `1px solid ${c.line}`, borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: c.green, marginBottom: 42 }}><DocumentIcon kind={item.icon} /><span style={{ color: c.muted, fontSize: 11, letterSpacing: '.08em' }}>{item.number}</span></div>
              <h3 className="font-heading" style={{ fontSize: 25, fontWeight: 400, lineHeight: 1.22, marginBottom: 13 }}>{item.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: c.muted }}>{item.copy}</p>
            </article>)}
          </div>
        </section>

        <section id="how-it-works" style={{ background: c.ink, color: c.cream, padding: '80px 0', scrollMarginTop: 24 }}>
          <div style={studioContainer} className="studio-how-grid">
            <div><Eyebrow light>From business idea to usable drafts</Eyebrow><h2 className="font-heading" style={{ fontSize: 'clamp(34px, 4vw, 47px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-.02em', maxWidth: 350 }}>Bring the offer.<br />We’ll bring<br />the structure.</h2><Link href="/studio/sample" className="studio-text-link" style={{ color: '#C3CEB6', marginTop: 28 }}>See the complete example <ArrowIcon /></Link></div>
            <ol style={{ listStyle: 'none', display: 'grid', gap: 29 }}>
              {[
                ['Tell us what you’re promoting.', 'Your service, who it helps, the details of your offer, and what someone should do next. Plain language is perfect.'],
                ['Check the brief. Make it yours.', 'Review the facts, add the tone you want, and correct anything missing. Then purchase your setup for $49.'],
                ['Use your pack. Keep your setup.', 'Review your email and posts, copy what you need, and download everything. Reuse the setup when your next offer is ready.'],
              ].map(([title, copy], i) => <li key={title} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 22, paddingBottom: i < 2 ? 29 : 0, borderBottom: i < 2 ? '1px solid #49463E' : undefined }}><span style={{ fontSize: 12, color: '#B7C2AA', paddingTop: 4 }}>0{i + 1}</span><div><h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{title}</h3><p style={{ fontSize: 14, lineHeight: 1.8, color: '#BEB9AF', maxWidth: 440 }}>{copy}</p></div></li>)}
            </ol>
          </div>
        </section>

        <section style={{ ...studioContainer, paddingTop: 88, paddingBottom: 88 }}>
          <div className="studio-offer-grid" style={{ border: `1px solid ${c.line}`, borderRadius: 18, overflow: 'hidden', background: c.paper }}>
            <div style={{ padding: 'clamp(26px, 5vw, 52px)' }}>
              <Eyebrow>Your first Marketing Setup</Eyebrow>
              <h2 className="font-heading" style={{ fontSize: 'clamp(32px, 3.8vw, 44px)', lineHeight: 1.15, fontWeight: 400, letterSpacing: '-.02em', maxWidth: 400 }}>A small, useful start<br />with AI for your business.</h2>
              <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85, marginTop: 20, maxWidth: 390 }}>For the photographer opening bookings. The tutor running a workshop. The consultant with a new service. One promotion, grounded in your details.</p>
              <Link href="/studio/sample" className="studio-text-link" style={{ marginTop: 28 }}>Take a look inside <ArrowIcon /></Link>
            </div>
            <div style={{ padding: 'clamp(26px, 5vw, 48px)', background: c.wash }}>
              <p style={{ fontSize: 13, fontWeight: 550 }}>Marketing Setup</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 5, marginBottom: 18 }}><span className="font-heading" style={{ fontSize: 65, lineHeight: 1.2, letterSpacing: '-.04em' }}>$49</span><span style={{ fontSize: 12, color: c.muted }}>USD · one time</span></div>
              <ul style={{ listStyle: 'none', display: 'grid', gap: 11, marginBottom: 29 }}>
                {['Your confirmed business brief', 'One customer email + three social posts', 'Reusable ChatGPT setup + next-use prompt', 'Review checklist + downloadable pack'].map((item) => <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}><span style={{ color: c.green, paddingTop: 2 }}><CheckIcon size={16} /></span>{item}</li>)}
              </ul>
              <Link href="/studio" className="studio-button" style={{ width: '100%' }}>Build my marketing setup <ArrowIcon /></Link>
              <p style={{ textAlign: 'center', fontSize: 11, color: c.muted, marginTop: 13 }}>No recurring charge. 7-day refund policy.</p>
            </div>
          </div>
        </section>

        <section style={{ ...studioContainer, paddingBottom: 90, maxWidth: 820 }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}><Eyebrow>Before you begin</Eyebrow><h2 className="font-heading" style={{ fontSize: 'clamp(30px, 4vw, 40px)', fontWeight: 400 }}>A few good questions.</h2></div>
          {faqs.map((faq) => <details key={faq.question} className="studio-faq" style={{ borderBottom: `1px solid ${c.line}`, padding: '21px 0' }}><summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>{faq.question}<span className="studio-faq-plus" aria-hidden="true">+</span></summary><p style={{ fontSize: 14, lineHeight: 1.85, color: c.muted, marginTop: 15, paddingRight: 30 }}>{faq.answer}</p></details>)}
        </section>
      </main>
      <StudioFooter />
    </>
  );
}

function HeroExample() {
  return (
    <div className="studio-hero-example" style={{ position: 'relative', background: '#E8E9E0', borderRadius: 20, padding: '28px 24px 24px', border: '1px solid #D9DDD0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 18 }}><span style={{ fontSize: 10, letterSpacing: '.1em', fontWeight: 600, color: c.green, textTransform: 'uppercase' }}>Inside a Marketing Setup</span><span style={{ fontSize: 10, color: c.muted }}>Illustrative example</span></div>
      <div style={{ display: 'flex', gap: 13, padding: '19px 18px', background: 'rgba(253,252,250,.66)', borderRadius: 11, border: '1px solid #D9DDD0' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 33, height: 33, background: '#DEE3D5', color: c.green, borderRadius: 7, flexShrink: 0 }}><DocumentIcon /></span>
        <div><p style={{ fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>The offer · Juniper Home Organizing</p><p style={{ fontSize: 13, lineHeight: 1.6 }}>“A kitchen reset for busy households. Practical systems, using the storage you already have.”</p></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: c.green, fontSize: 10, padding: '13px 0' }}><ArrowIcon direction="down" />Your facts. A clearer starting point.</div>
      <div style={{ background: c.paper, borderRadius: 12, border: `1px solid ${c.line}`, boxShadow: '0 12px 30px rgba(45,41,38,.06)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 19px', borderBottom: `1px solid ${c.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 550 }}><DocumentIcon kind="email" />Customer email</span><span style={{ fontSize: 9, color: c.green, background: c.wash, padding: '3px 7px', borderRadius: 4 }}>READY TO REVIEW</span></div>
        <div style={{ padding: '21px 23px 24px' }}><p style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>Subject</p><h3 className="font-heading" style={{ fontSize: 25, lineHeight: 1.24, fontWeight: 400, marginBottom: 18 }}>Could your kitchen work a little better for you?</h3><div style={{ color: '#635F57', fontSize: 12, lineHeight: 1.85 }}><p style={{ marginBottom: 11 }}>Hello,</p><p style={{ marginBottom: 11 }}>If your kitchen feels harder to use than it needs to, we can start with the items you reach for every day.</p><p>There is no need to aim for a showroom. The starting point is your household and how you use the space.</p></div><p style={{ fontSize: 11, color: c.green, marginTop: 17, display: 'flex', alignItems: 'center', gap: 7 }}>Reply KITCHEN to ask about a kitchen reset. <ArrowIcon /></p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 13 }}>
        {['Introduce', 'Explain', 'Invite'].map((title, i) => <div key={title} style={{ padding: '11px 8px', background: 'rgba(253,252,250,.75)', border: '1px solid #D9DDD0', borderRadius: 8 }}><p style={{ fontSize: 9, color: c.muted, marginBottom: 5 }}>SOCIAL 0{i + 1}</p><p style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.4 }}>{title}</p></div>)}
      </div>
    </div>
  );
}
