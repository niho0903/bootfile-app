'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BootFileDisplay } from '@/components/BootFileDisplay';
import { ShareButtons } from '@/components/ShareButtons';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

export default function BootFilePage() {
  const router = useRouter();
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);

  useEffect(() => {
    const output = sessionStorage.getItem('bootfile_output');
    if (!output) {
      router.push('/');
      return;
    }
    setBootfileText(output);

    const raw = sessionStorage.getItem('bootfile_quiz');
    if (raw) {
      try {
        const quizState = JSON.parse(raw);
        setArchetypeId(quizState.primary as ArchetypeId);
      } catch {
        // Non-critical
      }
    }
  }, [router]);

  if (!bootfileText) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f7f6f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #0e6e6e',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  const arch = archetypeId ? ARCHETYPES[archetypeId] : null;

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1
              className="font-heading"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#1a1a1a', marginBottom: 12 }}
            >
              Your BootFile is ready
            </h1>
            {arch && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 9999,
                  backgroundColor: '#f0fafa',
                  fontSize: 14,
                  color: '#0e6e6e',
                  fontWeight: 500,
                }}
              >
                {arch.icon} {arch.name}
              </span>
            )}
          </div>

          {/* BootFile Display */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #dcd9d5',
              borderRadius: 16,
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <BootFileDisplay bootfileText={bootfileText} />
          </div>

          {/* Share */}
          {archetypeId && (
            <div
              style={{
                marginTop: 40,
                paddingTop: 32,
                borderTop: '1px solid #edeae5',
              }}
            >
              <p style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 }}>
                Share your archetype
              </p>
              <ShareButtons archetypeId={archetypeId} />
            </div>
          )}

          {/* Start Over */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link
              href="/quiz"
              style={{
                fontSize: 14,
                color: '#999',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#666')}
              onMouseLeave={e => (e.currentTarget.style.color = '#999')}
            >
              Start Over
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
