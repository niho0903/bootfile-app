import Link from 'next/link';
import type { Metadata } from 'next';
import { STUDIO_DEMO_BUNDLE } from '@/lib/studio/demo';
import { StudioBundleView } from '@/components/studio/StudioBundleView';
import { ArrowIcon, Eyebrow, StudioFooter, StudioHeader, StudioNotice, studioColors as c, studioContainer } from '@/components/studio/StudioChrome';

export const metadata: Metadata = {
  title: 'Explore a Marketing Setup example | Bootfile',
  description: 'See a complete illustrative Marketing Setup: a business brief, customer email, three social posts, reusable AI setup, and review checklist.',
  alternates: { canonical: '/studio/sample' },
};

export default function StudioSamplePage() {
  return <>
    <StudioHeader />
    <main id="main-content" style={{ ...studioContainer, maxWidth: 1060, paddingTop: 54, paddingBottom: 70 }}>
      <div style={{ maxWidth: 660, marginBottom: 30 }}><Eyebrow>Look inside a Marketing Setup</Eyebrow><h1 className="font-heading" style={{ fontSize: 'clamp(34px, 4.5vw, 49px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-.025em' }}>A real look at<br />what you’ll take away.</h1><p style={{ fontSize: 15, color: c.muted, lineHeight: 1.85, marginTop: 18 }}>Explore the email, the posts, and the setup behind them. This example starts with one simple service: a kitchen organizing session.</p></div>
      <div style={{ marginBottom: 35 }}><StudioNotice><strong style={{ fontWeight: 550 }}>Illustrative example.</strong> Juniper Home Organizing is a fictional business. This pack shows the format and level of detail; your pack uses the business facts you provide.</StudioNotice></div>
      <StudioBundleView bundle={STUDIO_DEMO_BUNDLE} isSample />
      <div style={{ background: c.wash, border: '1px solid #D6DDCB', borderRadius: 13, padding: '28px 30px', marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}><div><h2 className="font-heading" style={{ fontSize: 29, lineHeight: 1.25, fontWeight: 400 }}>Now start with your offer.</h2><p style={{ color: c.muted, fontSize: 13, marginTop: 8 }}>$49 once. Review your business brief before payment.</p></div><Link href="/studio" className="studio-button">Build my marketing setup <ArrowIcon /></Link></div>
    </main>
    <StudioFooter />
  </>;
}
