import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/json-ld';
import { getAllGuides } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Platform Guides',
  description:
    'Step-by-step guides for setting up your BootFile on ChatGPT, Claude, Gemini, Grok, DeepSeek, and Microsoft Copilot.',
  alternates: {
    canonical: '/guides',
  },
};

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: '\uD83D\uDCAC',
  claude: '\uD83E\uDDE0',
  gemini: '\u2728',
  grok: '\uD83E\uDD16',
  deepseek: '\uD83D\uDD0D',
  copilot: '\uD83D\uDE80',
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Guides', href: '/guides' },
        ])}
      />
      <Header />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px' }}>
        <h1
          className="font-heading"
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.5rem)',
            color: '#2D2926',
            fontWeight: 400,
            marginBottom: 8,
          }}
        >
          Platform Guides
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#7A746B', marginBottom: 48, lineHeight: 1.6 }}>
          How to set up your BootFile on every major AI platform.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 20,
          }}
        >
          {guides.map((guide) => (
            <Link
              key={guide.platform}
              href={`/guides/${guide.platform}`}
              style={{
                textDecoration: 'none',
                backgroundColor: '#ECEAE4',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'background-color 0.2s ease',
              }}
            >
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>
                {PLATFORM_ICONS[guide.platform] ?? '\uD83D\uDCBB'}
              </span>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  color: '#2D2926',
                }}
              >
                {guide.platformName}
              </span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: '#7A746B',
                  lineHeight: 1.5,
                }}
              >
                {guide.description.length > 80
                  ? guide.description.slice(0, 80) + '...'
                  : guide.description}
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
