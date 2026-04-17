'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';
import { BRIDGE_LINES } from '@/lib/archetype-copy';

interface ArchetypeRevealProps {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
}

export function ArchetypeReveal({ primary, secondary }: ArchetypeRevealProps) {
  const router = useRouter();
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const arch = ARCHETYPES[primary];
  const secondaryArch = secondary ? ARCHETYPES[secondary] : null;
  const bridgeLine = BRIDGE_LINES[primary];

  const handleBuildClick = () => {
    try {
      track('result_cta_clicked', { archetype: primary });
    } catch { /* analytics not loaded */ }
    router.push('/build');
  };

  const handleSoftExit = () => {
    try {
      track('result_soft_exit_clicked', { archetype: primary });
    } catch { /* analytics not loaded */ }
    router.push('/');
  };

  return (
    <div
      style={{
        backgroundColor: '#2D2926',
        borderRadius: 16,
        padding: '48px 32px 32px',
        textAlign: 'center',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      {/* Sage divider line */}
      <div
        style={{
          width: 48,
          height: 3,
          borderRadius: 9999,
          margin: '0 auto 24px',
          backgroundColor: '#7D8B6E',
        }}
      />

      {/* Small caps label */}
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7A746B',
          marginBottom: 16,
        }}
      >
        YOUR AI STYLE
      </p>

      {/* Icon */}
      <div style={{ fontSize: 56, marginBottom: 16 }}>{arch.icon}</div>

      {/* Name */}
      <h1
        className="font-heading"
        style={{
          fontSize: 'clamp(2rem, 5vw, 2.8rem)',
          color: '#F7F4EF',
          marginBottom: 8,
          fontWeight: 400,
        }}
      >
        {arch.name}
      </h1>

      {/* Tagline */}
      <p
        className="font-heading"
        style={{ fontSize: '1.1rem', color: '#7A746B', fontStyle: 'italic', marginBottom: 24 }}
      >
        &ldquo;{arch.tagline}&rdquo;
      </p>

      {/* Description */}
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

      {/* Thin divider */}
      <div
        style={{
          height: 1,
          backgroundColor: 'rgba(247, 244, 239, 0.1)',
          margin: '32px auto 28px',
          maxWidth: 500,
        }}
      />

      {/* Bridge teaser — "one thing your BootFile will tell your AI" */}
      <div
        style={{
          textAlign: 'left',
          maxWidth: 500,
          margin: '0 auto 28px',
          padding: '16px 18px',
          backgroundColor: 'rgba(125, 139, 110, 0.08)',
          borderRadius: 10,
          borderLeft: '3px solid #7D8B6E',
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#A5B394',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 6px',
          }}
        >
          One thing your BootFile will tell your AI:
        </p>
        <p
          style={{
            fontSize: 14.5,
            color: '#F7F4EF',
            lineHeight: 1.6,
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          &ldquo;{bridgeLine}&rdquo;
        </p>
      </div>

      {/* Primary CTA */}
      <button
        onClick={handleBuildClick}
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#7D8B6E',
          color: '#fff',
          fontWeight: 600,
          padding: '16px 32px',
          borderRadius: 12,
          fontSize: 16,
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5C6650')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7D8B6E')}
      >
        Build my BootFile &rarr;
      </button>

      {/* CTA meta line */}
      <p
        style={{
          fontSize: 13,
          color: 'rgba(247, 244, 239, 0.55)',
          marginTop: 12,
          marginBottom: 0,
        }}
      >
        3 minutes · $4.99 one-time · 7-day refund
      </p>

      {/* Soft exit link */}
      <button
        onClick={handleSoftExit}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginTop: 20,
          fontSize: 13,
          color: 'rgba(247, 244, 239, 0.45)',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Not yet — I&apos;ll come back
      </button>

      {/* Secondary archetype — demoted accordion */}
      {secondaryArch && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(247, 244, 239, 0.1)' }}>
          <button
            onClick={() => setSecondaryExpanded(!secondaryExpanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 9999,
              backgroundColor: 'rgba(247, 244, 239, 0.08)',
              fontSize: 14,
              color: 'rgba(247, 244, 239, 0.7)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 0.2s',
            }}
          >
            <span>{secondaryArch.icon}</span>
            You also have strong <span style={{ fontWeight: 600, color: '#F7F4EF' }}>{secondaryArch.name}</span> tendencies
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transition: 'transform 0.3s ease',
                transform: secondaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                marginLeft: 2,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div
            style={{
              maxHeight: secondaryExpanded ? 300 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
              opacity: secondaryExpanded ? 1 : 0,
            }}
          >
            <div style={{ paddingTop: 16 }}>
              <p
                className="font-heading"
                style={{
                  fontSize: '0.95rem',
                  color: '#7A746B',
                  fontStyle: 'italic',
                  marginBottom: 12,
                }}
              >
                &ldquo;{secondaryArch.tagline}&rdquo;
              </p>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(247, 244, 239, 0.6)',
                  lineHeight: 1.7,
                  textAlign: 'left',
                  maxWidth: 500,
                  margin: '0 auto',
                }}
              >
                {secondaryArch.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
