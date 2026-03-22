'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function StickyBottomCTA() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#7D8B6E',
        padding: '16px 24px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        boxShadow: '0 -4px 20px rgba(45, 41, 38, 0.1)',
      }}
      className="sticky-cta-bar"
    >
      <button
        onClick={() => router.push('/build')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          fontWeight: 600,
        }}
      >
        <span>Build My BootFile →</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.75 }}>
          3 min · $4.99
        </span>
      </button>
    </div>
  );
}
