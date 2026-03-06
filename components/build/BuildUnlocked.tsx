'use client';

import Link from 'next/link';
import { BootFileDisplay } from '@/components/BootFileDisplay';
import { ShareButtons } from '@/components/ShareButtons';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

interface BuildUnlockedProps {
  bootfileText: string;
  archetypeId: ArchetypeId;
}

export function BuildUnlocked({ bootfileText, archetypeId }: BuildUnlockedProps) {
  const arch = ARCHETYPES[archetypeId];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1
          className="font-heading"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#2D2926', marginBottom: 12 }}
        >
          Your BootFile is ready
        </h1>
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
      </div>

      {/* BootFile Display */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #DDD6CC',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}
      >
        <BootFileDisplay bootfileText={bootfileText} tier="premium" />
      </div>

      {/* Share */}
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
  );
}
