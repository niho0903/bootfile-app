'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('bootfile_quiz');
    if (!raw) {
      router.push('/');
      return;
    }

    let quizState: { primary: string; scores: Record<string, number> };
    try {
      quizState = JSON.parse(raw);
    } catch {
      router.push('/');
      return;
    }

    const tier = searchParams.get('tier') || 'basic';

    const createCheckout = async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archetypeId: quizState.primary,
            scoresJson: JSON.stringify(quizState.scores),
            tier,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
      } catch {
        setError('Something went wrong. Please try again.');
      }
    };

    createCheckout();
  }, [router, searchParams]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F7F4EF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            style={{
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 500,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5C6650')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7D8B6E')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #7D8B6E',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#7A746B' }}>Setting up your BootFile...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
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
      <CheckoutContent />
    </Suspense>
  );
}
