import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { howToJsonLd, breadcrumbJsonLd } from '@/lib/json-ld';
import { getAllGuides, getGuideByPlatform } from '@/lib/guides';

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ platform: g.platform }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const guide = getGuideByPlatform(platform);
  if (!guide) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/guides/${guide.platform}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${baseUrl}/guides/${guide.platform}`,
      images: [{ url: `${baseUrl}/api/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
      images: [`${baseUrl}/api/og`],
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const guide = getGuideByPlatform(platform);
  if (!guide) notFound();

  return (
    <>
      <JsonLd
        data={[
          howToJsonLd({
            title: guide.title,
            description: guide.description,
            platform: guide.platform,
            steps: guide.steps,
          }),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Guides', href: '/guides' },
            { name: guide.platformName, href: `/guides/${guide.platform}` },
          ]),
        ]}
      />
      <Header />
      <main className="editorial-content" style={{ maxWidth: 640, margin: '0 auto', padding: '80px 20px' }}>
        <Link
          href="/guides"
          style={{
            fontSize: '0.85rem',
            color: '#7A746B',
            textDecoration: 'none',
            marginBottom: 32,
            display: 'inline-block',
          }}
        >
          &larr; All Guides
        </Link>

        <h1
          className="font-heading"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
            color: '#2D2926',
            fontWeight: 400,
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          {guide.title}
        </h1>

        <p
          style={{
            fontSize: '0.85rem',
            color: '#A39E95',
            marginBottom: 32,
          }}
        >
          Last updated{' '}
          {new Date(guide.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.75,
            color: '#4A453E',
            marginBottom: 40,
          }}
        >
          {guide.intro}
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 48 }}>
          {guide.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#7D8B6E',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: '#2D2926',
                    marginBottom: 6,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.95rem',
                    lineHeight: 1.65,
                    color: '#7A746B',
                  }}
                >
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        {guide.tips.length > 0 && (
          <div
            style={{
              backgroundColor: '#ECEAE4',
              borderRadius: 12,
              padding: 28,
              marginBottom: 48,
            }}
          >
            <h2
              className="font-heading"
              style={{
                fontSize: '1.2rem',
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 16,
              }}
            >
              Tips
            </h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {guide.tips.map((tip, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    color: '#4A453E',
                    marginBottom: 10,
                  }}
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            padding: 32,
            backgroundColor: '#2D2926',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <p
            className="font-heading"
            style={{
              fontSize: '1.3rem',
              color: '#F7F4EF',
              fontWeight: 400,
              marginBottom: 8,
            }}
          >
            Skip the blank page.
          </p>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'rgba(247, 244, 239, 0.6)',
              marginBottom: 20,
            }}
          >
            {guide.ctaText}
          </p>
          <Link
            href="/quiz"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 500,
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Take the Quiz
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
