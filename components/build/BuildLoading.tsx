'use client';

import { useState, useEffect } from 'react';

interface BuildLoadingProps {
  stage: 'preview' | 'full';
}

const PREVIEW_MESSAGES = [
  'Analyzing your style...',
  'Building your profile preview...',
];

const FULL_MESSAGES = [
  'Crafting your full BootFile...',
  'Building reasoning frameworks...',
  'Calibrating failure detection...',
  'Finalizing your profile...',
];

export function BuildLoading({ stage }: BuildLoadingProps) {
  const messages = stage === 'preview' ? PREVIEW_MESSAGES : FULL_MESSAGES;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

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
      <style>{`
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: 384 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7D8B6E, #5C6650)',
            margin: '0 auto 28px',
            animation: 'dotPulse 2s ease-in-out infinite',
            boxShadow: '0 0 24px rgba(125, 139, 110, 0.3)',
          }}
        />
        <p
          className="font-heading"
          style={{
            fontSize: 18,
            color: '#2D2926',
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          {messages[msgIndex]}
        </p>
        <p style={{ fontSize: 14, color: '#7A746B' }}>
          {stage === 'full' ? 'This can take up to a minute.' : 'Almost there...'}
        </p>
      </div>
    </div>
  );
}
