'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BootFileDisplay } from '@/components/BootFileDisplay';
import { ShareButtons } from '@/components/ShareButtons';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

function BootFileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [tier, setTier] = useState<string>('basic');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    const output = sessionStorage.getItem('bootfile_output');
    if (!output) {
      router.push('/');
      return;
    }
    setBootfileText(output);
    setTier(sessionStorage.getItem('bootfile_tier') || 'basic');

    const raw = sessionStorage.getItem('bootfile_quiz');
    if (raw) {
      try {
        const quizState = JSON.parse(raw);
        setArchetypeId(quizState.primary as ArchetypeId);
      } catch {
        // Non-critical
      }
    }

    // Handle upgrade completion
    const upgraded = searchParams.get('upgraded');
    const upgradeSessionId = searchParams.get('session_id');
    if (upgraded === '1' && upgradeSessionId && output) {
      sessionStorage.setItem('bootfile_tier', 'premium');
      setTier('premium');
      setUpgradeSuccess(true);

      // Store bootfile server-side
      fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: upgradeSessionId, bootfileText: output }),
      }).catch(() => { /* non-blocking */ });

      // Clean URL
      window.history.replaceState({}, '', '/bootfile');
    }
  }, [router, searchParams]);

  if (!bootfileText) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F7F4EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #7D8B6E',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  const arch = archetypeId ? ARCHETYPES[archetypeId] : null;
  const isPremium = tier === 'premium' || tier === 'upgrade';

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1
              className="font-heading"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#2D2926', marginBottom: 12 }}
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
                  backgroundColor: '#ECEAE4',
                  fontSize: 14,
                  color: '#7D8B6E',
                  fontWeight: 500,
                }}
              >
                {arch.icon} {arch.name}
              </span>
            )}
          </div>

          {/* Upgrade success */}
          {upgradeSuccess && (
            <div
              style={{
                backgroundColor: '#5C6650',
                borderRadius: 8,
                padding: '12px 20px',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 14, color: '#fff', margin: 0, fontWeight: 500 }}>
                Upgraded to Premium! Your BootFile is now saved permanently.
              </p>
            </div>
          )}

          {/* Premium banner */}
          {isPremium && (
            <div
              style={{
                backgroundColor: '#2D2926',
                borderRadius: 8,
                padding: '12px 20px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#7D8B6E" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <p style={{ fontSize: 13, color: '#C4BFB6', margin: 0 }}>
                Premium &mdash; Your BootFile is saved. You&apos;ll receive updates when new AI models launch.
              </p>
            </div>
          )}

          {/* BootFile Display */}
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #DDD6CC',
              borderRadius: 16,
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <BootFileDisplay bootfileText={bootfileText} />
          </div>

          {/* Upgrade CTA for basic users */}
          {!isPremium && (
            <div
              style={{
                marginTop: 24,
                backgroundColor: '#ECEAE4',
                border: '1px solid #DDD6CC',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#2D2926', margin: '0 0 4px' }}>
                  Want this saved forever?
                </p>
                <p style={{ fontSize: 13, color: '#7A746B', margin: 0 }}>
                  Upgrade to Premium for model updates, version history &amp; access from any device.
                </p>
              </div>
              <button
                onClick={() => router.push('/checkout?tier=upgrade')}
                style={{
                  backgroundColor: '#2D2926',
                  color: '#F7F4EF',
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a1816')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D2926')}
              >
                Upgrade &mdash; $2.50
              </button>
            </div>
          )}

          {/* Share — PLG viral CTA */}
          {archetypeId && (
            <div
              style={{
                marginTop: 40,
                paddingTop: 32,
                borderTop: '1px solid #DDD6CC',
                textAlign: 'center',
              }}
            >
              <p
                className="font-heading"
                style={{ fontSize: 18, color: '#2D2926', fontWeight: 400, marginBottom: 4 }}
              >
                Know someone who could use this?
              </p>
              <p style={{ fontSize: 14, color: '#7A746B', marginBottom: 16 }}>
                The quiz is free. Share it and let them find their AI style.
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
                color: '#7A746B',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2D2926')}
              onMouseLeave={e => (e.currentTarget.style.color = '#7A746B')}
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

export default function BootFilePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#F7F4EF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid #7D8B6E',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      }
    >
      <BootFileContent />
    </Suspense>
  );
}
