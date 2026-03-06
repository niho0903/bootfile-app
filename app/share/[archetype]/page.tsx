import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export async function generateStaticParams() {
  return Object.keys(ARCHETYPES).map(id => ({ archetype: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ archetype: string }> }) {
  const { archetype } = await params;
  const arch = ARCHETYPES[archetype as ArchetypeId];
  if (!arch) return {};

  return {
    title: `I'm ${arch.name} | What's your AI style?`,
    description: arch.description,
    openGraph: {
      title: `I'm ${arch.name} | What's your AI style? | BootFile`,
      description: arch.description,
      images: [{ url: `${BASE_URL}/api/og?archetype=${archetype}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `I'm ${arch.name} | What's your AI style?`,
      description: arch.description,
      images: [`${BASE_URL}/api/og?archetype=${archetype}`],
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ archetype: string }> }) {
  const { archetype } = await params;
  const arch = ARCHETYPES[archetype as ArchetypeId];

  if (!arch) {
    notFound();
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          {/* Archetype Card */}
          <div
            style={{
              backgroundColor: '#2D2926',
              borderRadius: 16,
              padding: '40px 32px',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 48,
                height: 3,
                borderRadius: 9999,
                margin: '0 auto 24px',
                backgroundColor: '#7D8B6E',
              }}
            />
            <div style={{ fontSize: 56, marginBottom: 16 }}>{arch.icon}</div>
            <h1
              className="font-heading"
              style={{
                fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                color: '#F7F4EF',
                marginBottom: 8,
                fontWeight: 400,
              }}
            >
              {arch.name}
            </h1>
            <p
              style={{
                fontSize: '1.1rem',
                color: '#7A746B',
                fontStyle: 'italic',
                marginBottom: 24,
              }}
            >
              &ldquo;{arch.tagline}&rdquo;
            </p>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'rgba(247, 244, 239, 0.8)',
                lineHeight: 1.7,
                textAlign: 'left',
                maxWidth: 500,
                margin: '0 auto',
              }}
            >
              {arch.description}
            </p>
          </div>

          {/* CTA */}
          <h2
            className="font-heading"
            style={{
              fontSize: '1.3rem',
              color: '#2D2926',
              fontWeight: 400,
              marginBottom: 16,
            }}
          >
            What&apos;s your AI style?
          </h2>
          <Link
            href="/quiz"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 500,
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: '0.95rem',
              letterSpacing: '0.01em',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease',
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
