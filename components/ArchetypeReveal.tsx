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
        backgroundColor: '#fff',
        border: '1px solid #dcd9d5',
        borderRadius: 24,
        padding: '40px 32px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        textAlign: 'center',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          width: 48,
          height: 4,
          borderRadius: 9999,
          margin: '0 auto 24px',
          backgroundColor: arch.color,
        }}
      />

      {/* Icon */}
      <div style={{ fontSize: 56, marginBottom: 16 }}>{arch.icon}</div>

      {/* Name */}
      <h1
        className="font-heading"
        style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
          color: '#1a1a1a',
          marginBottom: 8,
        }}
      >
        {arch.name}
      </h1>

      {/* Tagline */}
      <p style={{ fontSize: 18, color: '#888', fontStyle: 'italic', marginBottom: 24 }}>
        &ldquo;{arch.tagline}&rdquo;
      </p>

      {/* Description */}
      <p
        style={{
          fontSize: 16,
          color: '#555',
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
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #edeae5' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 9999,
              backgroundColor: '#f7f6f2',
              fontSize: 14,
              color: '#666',
            }}
          >
            <span>{secondaryArch.icon}</span>
            You also have strong <span style={{ fontWeight: 600 }}>{secondaryArch.name}</span> tendencies.
          </span>
        </div>
      )}
    </div>
  );
}
