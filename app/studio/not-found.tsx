import Link from 'next/link';
import { ArrowIcon, Eyebrow, StudioFooter, StudioHeader, studioColors as c, studioContainer } from '@/components/studio/StudioChrome';

export default function StudioNotFound() {
  return <>
    <StudioHeader compact />
    <main id="main-content" style={{ ...studioContainer, maxWidth: 720, paddingTop: 70, paddingBottom: 80, minHeight: '65vh' }}>
      <Eyebrow>Marketing Setup</Eyebrow>
      <h1 className="font-heading" style={{ fontSize: 'clamp(33px, 5vw, 45px)', fontWeight: 400, lineHeight: 1.2 }}>This link doesn’t look complete.</h1>
      <p style={{ color: c.muted, fontSize: 14, lineHeight: 1.85, margin: '20px 0 27px', maxWidth: 560 }}>Open the complete private link from your delivery email, or use the recovery steps to find your Marketing Setup.</p>
      <div className="studio-result-actions"><Link href="/studio/recover" className="studio-button">Find my order <ArrowIcon /></Link><a href="mailto:support@bootfile.ai" className="studio-button studio-button-secondary">Contact support</a></div>
    </main>
    <StudioFooter />
  </>;
}
