'use client';

import Link from 'next/link';

interface BuildErrorProps {
  message: string;
  onRetry: () => void;
}

export function BuildError({ message, onRetry }: BuildErrorProps) {
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
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 15 }}>{message}</p>
        <button
          onClick={onRetry}
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
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5C6650')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7D8B6E')}
        >
          Try Again
        </button>
        <div style={{ marginTop: 16 }}>
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
    </div>
  );
}
