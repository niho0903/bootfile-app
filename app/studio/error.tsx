'use client';

import Link from 'next/link';
import { ArrowIcon, Eyebrow, StudioFooter, StudioHeader, studioColors as c, studioContainer } from '@/components/studio/StudioChrome';

export default function StudioErrorPage({ reset }: { reset: () => void }) {
  return <>
    <StudioHeader compact />
    <main id="main-content" style={{ ...studioContainer, maxWidth: 720, paddingTop: 70, paddingBottom: 80, minHeight: '65vh' }}>
      <Eyebrow>Marketing Setup</Eyebrow>
      <h1 className="font-heading" style={{ fontSize: 'clamp(33px, 5vw, 45px)', fontWeight: 400, lineHeight: 1.2 }}>Let’s get you back to your setup.</h1>
      <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85, margin: '20px 0 27px', maxWidth: 560 }}>Something interrupted this page. Try opening it again. If you’ve already paid, use your private order link or contact support before starting a new purchase.</p>
      <div className="studio-result-actions"><button type="button" className="studio-button" onClick={reset}>Try again <ArrowIcon /></button><Link href="/studio/recover" className="studio-button studio-button-secondary">Find my order</Link></div>
      <a href="mailto:support@bootfile.ai" className="studio-text-link" style={{ marginTop: 26 }}>Contact support <ArrowIcon /></a>
    </main>
    <StudioFooter />
  </>;
}
