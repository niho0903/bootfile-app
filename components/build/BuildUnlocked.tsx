'use client';

import Link from 'next/link';
import { BootFileDisplay } from '@/components/BootFileDisplay';
import { ShareButtons } from '@/components/ShareButtons';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';
import { PlatformId } from '@/lib/platform-variants';

interface BuildUnlockedProps {
  bootfileText: string;
  archetypeId: ArchetypeId;
  variants?: Record<PlatformId, string> | null;
}

export function BuildUnlocked({ bootfileText, archetypeId, variants }: BuildUnlockedProps) {
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

      {/* Save Warning Callout */}
      <div
        style={{
          backgroundColor: '#FEF9E7',
          border: '1px solid #F0D878',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>&#9888;&#65039;</span>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#5D4E37' }}>
            Save your BootFile before leaving this page
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#7A6F5F', lineHeight: 1.5 }}>
            Copy the text below and paste it into a document, note, or Google Drive.
            Your BootFile cannot be accessed again once you navigate away.
          </p>
        </div>
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
        <BootFileDisplay bootfileText={bootfileText} tier="premium" variants={variants} />
      </div>

      {/* Companion report */}
      <div
        style={{
          marginTop: 32,
          padding: 20,
          backgroundColor: '#F7F4EF',
          border: '1px solid #DDD6CC',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            className="font-heading"
            style={{ fontSize: 15, color: '#2D2926', fontWeight: 500, margin: 0 }}
          >
            Companion report
          </p>
          <p style={{ fontSize: 13, color: '#7A746B', margin: '4px 0 0', lineHeight: 1.5 }}>
            A four-page printable on your {arch.name} archetype. Save it as a PDF for your records.
          </p>
        </div>
        <Link
          href={`/report?archetype=${archetypeId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #DDD6CC',
            color: '#2D2926',
            fontWeight: 500,
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 13,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Open report &rarr;
        </Link>
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
