'use client';

import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

interface ArchetypeRevealProps {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
}

export function ArchetypeReveal({ primary, secondary }: ArchetypeRevealProps) {
  const arch = ARCHETYPES[primary];
  const secondaryArch = secondary ? ARCHETYPES[secondary] : null;

  return (
    <div
      style={{
        backgroundColor: '#2D2926',
        borderRadius: 16,
        padding: '48px 32px',
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

      {/* Secondary badge */}
      {secondaryArch && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(247, 244, 239, 0.1)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 9999,
              backgroundColor: 'rgba(247, 244, 239, 0.08)',
              fontSize: 14,
              color: 'rgba(247, 244, 239, 0.7)',
            }}
          >
            <span>{secondaryArch.icon}</span>
            You also have strong <span style={{ fontWeight: 600, color: '#F7F4EF' }}>{secondaryArch.name}</span> tendencies.
          </span>
        </div>
      )}
    </div>
  );
}
