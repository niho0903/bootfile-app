import Link from 'next/link';
import type { Metadata } from 'next';
import { STUDIO_DEMO_BUNDLE } from '@/lib/studio/demo';
import { CopyButton, StudioBundleView } from '@/components/studio/StudioBundleView';
import { ArrowIcon, Eyebrow, StudioFooter, StudioHeader, StudioNotice, studioColors as c, studioContainer } from '@/components/studio/StudioChrome';

export const metadata: Metadata = {
  title: 'Explore a Marketing Setup example | Bootfile',
  description: 'See a complete illustrative Marketing Setup: a business brief, customer email, three social posts, reusable AI setup, and review checklist.',
  alternates: { canonical: '/studio/sample' },
};

const FREE_ALTERNATIVE_PROMPT = `Help me prepare one small-business promotion. Interview me for the offer, audience, goal, approved facts, next step, tone and constraints. Ask about missing details; do not invent facts. Produce one customer email and three distinct social posts with the same exact call to action. Quote the business facts you relied on. Then make a short reusable brief, a copyable prompt for my next promotion and a practical factual-review checklist. Don't send or publish anything.`;

export default function StudioSamplePage() {
  return <>
    <StudioHeader />
    <main id="main-content" style={{ ...studioContainer, maxWidth: 1060, paddingTop: 54, paddingBottom: 70 }}>
      <div style={{ maxWidth: 660, marginBottom: 30 }}><Eyebrow>Look inside a Marketing Setup</Eyebrow><h1 className="font-heading" style={{ fontSize: 'clamp(34px, 4.5vw, 49px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-.025em' }}>A real look at<br />what you’ll take away.</h1><p style={{ fontSize: 15, color: c.muted, lineHeight: 1.85, marginTop: 18 }}>Explore the email, the posts, and the setup behind them. This example starts with one simple service: a kitchen organizing session.</p></div>
      <div style={{ marginBottom: 35 }}><StudioNotice><strong style={{ fontWeight: 550 }}>Illustrative example.</strong> Juniper Home Organizing is a fictional business. This pack shows the format and level of detail; your pack uses the business facts you provide.</StudioNotice></div>
      <StudioBundleView bundle={STUDIO_DEMO_BUNDLE} isSample />
      <section aria-labelledby="free-alternative-title" style={{ marginTop: 48, padding: '30px clamp(20px, 4vw, 34px)', border: `1px solid ${c.line}`, borderRadius: 13 }}>
        <Eyebrow>Make an informed choice</Eyebrow>
        <h2 id="free-alternative-title" className="font-heading" style={{ fontSize: 'clamp(27px, 3vw, 35px)', lineHeight: 1.2, fontWeight: 400, marginTop: 12 }}>Try your own AI assistant first.</h2>
        <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.85, maxWidth: 750, marginTop: 13 }}>You can create marketing drafts for free with an AI account you already have. Bootfile is a paid, guided shortcut with a saved brief, grounded first drafts, reusable setup and review checks. Try this free starting point before deciding whether that packaging is worth $49 to you.</p>
        <div style={{ background: c.wash, border: '1px solid #D6DDCB', borderRadius: 9, padding: 20, marginTop: 21 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}><p style={{ fontSize: 12, color: c.green, fontWeight: 550 }}>A fair free alternative</p><CopyButton text={FREE_ALTERNATIVE_PROMPT} label="Copy free prompt" /></div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, marginTop: 13, color: c.ink }}>{FREE_ALTERNATIVE_PROMPT}</p>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 550, marginTop: 24 }}>Judge either result by the same standard</h3>
        <ul style={{ marginTop: 10, paddingLeft: 19, fontSize: 13, lineHeight: 2, color: c.muted }}>
          <li>Are every price, date, claim, link and next step supported by information you supplied?</li>
          <li>Would you confidently edit and send the email and three posts?</li>
          <li>Could you repeat the task for a different promotion without starting from scratch?</li>
        </ul>
        <p style={{ fontSize: 12, lineHeight: 1.8, color: c.muted, marginTop: 15 }}>AI drafts are never sent or published by this setup. Review the final copy yourself, regardless of which route you use.</p>
      </section>
      <div style={{ background: c.wash, border: '1px solid #D6DDCB', borderRadius: 13, padding: '28px 30px', marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}><div><h2 className="font-heading" style={{ fontSize: 29, lineHeight: 1.25, fontWeight: 400 }}>Now start with your offer.</h2><p style={{ color: c.muted, fontSize: 13, marginTop: 8 }}>$49 once. Review your business brief before payment.</p></div><Link href="/studio" className="studio-button">Build my marketing setup <ArrowIcon /></Link></div>
    </main>
    <StudioFooter />
  </>;
}
