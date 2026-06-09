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
  const [cardSaved, setCardSaved] = useState(false);
  const arch = ARCHETYPES[primary];
  const secondaryArch = secondary ? ARCHETYPES[secondary] : null;
  const bridgeLine = BRIDGE_LINES[primary];

  const handleBuildClick = () => {
    try {
      track('result_cta_clicked', { archetype: primary });
    } catch { /* analytics not loaded */ }
    router.push('/build');
  };

  const handleSaveCard = async () => {
    try {
      track('result_card_saved', { archetype: primary });
    } catch { /* analytics not loaded */ }
    const url = `/api/og?archetype=${primary}&format=square`;
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(url, '_blank');
        setCardSaved(true);
        setTimeout(() => setCardSaved(false), 3000);
        return;
      }
      const response = await fetch(url);
      if (!response.ok) return;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return;
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'image/png' });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `bootfile-${primary}-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      setCardSaved(true);
      setTimeout(() => setCardSaved(false), 3000);
    } catch { /* swallow */ }
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
        YOUR COGNITIVE ARCHETYPE
      </p>

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

      {/* Secondary archetype — sits above the divider as additional context */}
      {secondaryArch && (
        <div style={{ marginTop: 24 }}>
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
            <span>You also have strong <span style={{ fontWeight: 600, color: '#F7F4EF' }}>{secondaryArch.name}</span> tendencies</span>
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

      {/* Assessment depth: pressure mode + the trap */}
      <div
        style={{
          marginTop: 28,
          maxWidth: 500,
          margin: '28px auto 0',
          textAlign: 'left',
        }}
      >
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#7A746B',
            marginBottom: 6,
          }}
        >
          Under pressure
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(247, 244, 239, 0.75)',
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {arch.underPressure}
        </p>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#7A746B',
            marginBottom: 6,
          }}
        >
          The trap
        </p>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(247, 244, 239, 0.75)',
            lineHeight: 1.6,
          }}
        >
          {arch.trap}
        </p>
      </div>

      {/* Thin divider */}
      <div
        style={{
          height: 1,
          backgroundColor: 'rgba(247, 244, 239, 0.1)',
          margin: '32px auto 24px',
          maxWidth: 500,
        }}
      />

      {/* Bridge teaser — copy, not a component. No box, no border, no green. */}
      <p
        style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7A746B',
          marginBottom: 10,
        }}
      >
        One thing your BootFile will tell your AI
      </p>
      <p
        className="font-heading"
        style={{
          fontSize: '1.05rem',
          color: 'rgba(247, 244, 239, 0.85)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          maxWidth: 500,
          margin: '0 auto 28px',
        }}
      >
        &ldquo;{bridgeLine}&rdquo;
      </p>

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
        3 minutes · $4.99 one-time
      </p>

      {/* Subtle save-card affordance — text-link, well below the primary CTA */}
      <button
        type="button"
        onClick={handleSaveCard}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'rgba(247, 244, 239, 0.4)',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        {cardSaved ? 'Saved ✓' : 'Save your archetype card'}
      </button>
    </div>
  );
}
