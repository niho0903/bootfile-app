import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export const studioColors = {
  ink: '#2D2926', cream: '#F7F4EF', paper: '#FDFCFA', sage: '#7D8B6E',
  green: '#4A5942', muted: '#736E65', line: '#DEDAD1', wash: '#ECEFE7',
};

export const studioContainer: CSSProperties = { width: 'min(1120px, calc(100% - 48px))', margin: '0 auto' };

export function ArrowIcon({ direction = 'right' }: { direction?: 'right' | 'left' | 'down' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, transform: direction === 'left' ? 'rotate(180deg)' : direction === 'down' ? 'rotate(90deg)' : undefined }}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function DocumentIcon({ kind = 'page' }: { kind?: 'page' | 'email' | 'spark' | 'copy' | 'download' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {kind === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></> :
        kind === 'spark' ? <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6L20 2Z" /></> :
        kind === 'copy' ? <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></> :
        kind === 'download' ? <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></> :
        <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>}
    </svg>
  );
}

export function StudioHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header style={{ borderBottom: `1px solid ${studioColors.line}`, background: studioColors.cream }}>
      <a href="#main-content" className="studio-skip-link">Skip to content</a>
      <div style={{ ...studioContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, minHeight: 86 }}>
        <Link href="/" aria-label="Bootfile home" style={{ textDecoration: 'none', display: 'inline-flex' }}><Logo /></Link>
        {compact ? <Link href="/studio/recover" className="studio-text-link" style={{ fontSize: 13 }}>Find my order <ArrowIcon /></Link> : (
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <Link href="/#how-it-works" className="studio-nav-link">How it works</Link>
            <Link href="/studio/sample" className="studio-nav-link">See an example</Link>
            <Link href="/studio" className="studio-button studio-button-small">Build my setup <ArrowIcon /></Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function StudioFooter() {
  return (
    <footer style={{ borderTop: `1px solid ${studioColors.line}`, padding: '36px 0 28px' }}>
      <div style={studioContainer}>
        <div className="studio-footer-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
          <div><Logo size="sm" /><p style={{ fontSize: 12, color: studioColors.muted, marginTop: 12 }}>Make AI useful for the work in front of you.</p></div>
          <nav aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', fontSize: 12 }}>
            <Link className="studio-quiet-link" href="/studio/recover">Find my order</Link>
            <a className="studio-quiet-link" href="mailto:support@bootfile.ai">Get help</a>
            <Link className="studio-quiet-link" href="/terms">Terms</Link>
            <Link className="studio-quiet-link" href="/privacy">Privacy</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${studioColors.line}`, paddingTop: 20, marginTop: 28, color: studioColors.muted, fontSize: 11 }}>
          <p>© {new Date().getFullYear()} Bootfile. Independent of OpenAI.</p>
          <Link className="studio-quiet-link" href="/quiz">Looking for the original AI profile? <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </footer>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p style={{ color: light ? '#B7C2AA' : studioColors.green, fontSize: 11, fontWeight: 650, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 18 }}>{children}</p>;
}

export function StudioNotice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' | 'success' }) {
  return <div role={tone === 'error' ? 'alert' : undefined} style={{ padding: '15px 18px', borderRadius: 10, border: `1px solid ${tone === 'error' ? '#D8ABA0' : studioColors.line}`, background: tone === 'error' ? '#FBF0EC' : tone === 'success' ? studioColors.wash : studioColors.paper, color: tone === 'error' ? '#813E2E' : studioColors.ink, fontSize: 13, lineHeight: 1.65 }}>{children}</div>;
}
