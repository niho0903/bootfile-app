'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { ArchetypeId } from '@/lib/questions';
import { ARCHETYPES } from '@/lib/archetypes';
import {
  DEMO_PROMPT,
  GENERIC_DEMO_RESPONSE,
  DEMO_RESPONSES,
} from '@/lib/archetype-copy';

interface BuildDemoProps {
  archetypeId: ArchetypeId;
}

export function BuildDemo({ archetypeId }: BuildDemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasViewed, setHasViewed] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arch = ARCHETYPES[archetypeId];
  const bootfileResponse = DEMO_RESPONSES[archetypeId] ?? DEMO_RESPONSES.architect;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!hasViewed) {
              setHasViewed(true);
              try {
                track('build_demo_viewed', { archetype: archetypeId });
              } catch { /* analytics not loaded */ }
            }
            if (!readTimerRef.current && !hasRead) {
              readTimerRef.current = setTimeout(() => {
                setHasRead(true);
                try {
                  track('build_demo_read', { archetype: archetypeId });
                } catch { /* analytics not loaded */ }
              }, 8000);
            }
          } else if (readTimerRef.current) {
            clearTimeout(readTimerRef.current);
            readTimerRef.current = null;
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };
  }, [archetypeId, hasViewed, hasRead]);

  return (
    <div ref={containerRef} style={{ marginBottom: 40 }}>
      <h2
        className="font-heading"
        style={{
          fontSize: 'clamp(1.3rem, 3.5vw, 1.6rem)',
          color: '#2D2926',
          fontWeight: 400,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        See what changes with your BootFile
      </h2>
      <p
        style={{
          fontSize: 14,
          color: '#7A746B',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        Same prompt. Same model. The difference is your BootFile.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* LEFT CARD — generic */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #DDD6CC',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}
          >
            Without BootFile
          </div>
          <PromptBox prompt={DEMO_PROMPT} />
          <ResponseBody text={GENERIC_DEMO_RESPONSE} muted />
        </div>

        {/* RIGHT CARD — BootFile-shaped */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #7D8B6E',
            borderRadius: 16,
            padding: 20,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontSize: 11,
              color: '#5C6650',
              backgroundColor: '#ECEAE4',
              padding: '3px 8px',
              borderRadius: 9999,
              fontWeight: 500,
            }}
          >
            {arch.icon} {arch.name}
          </span>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#5C6650',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}
          >
            With your BootFile
          </div>
          <PromptBox prompt={DEMO_PROMPT} />
          <ResponseBody text={bootfileResponse} />
        </div>
      </div>
    </div>
  );
}

function PromptBox({ prompt }: { prompt: string }) {
  return (
    <div
      style={{
        backgroundColor: '#F7F4EF',
        border: '1px solid #ECEAE4',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        color: '#2D2926',
        lineHeight: 1.5,
      }}
    >
      {prompt}
    </div>
  );
}

function ResponseBody({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        fontSize: 13.5,
        color: muted ? '#6B7280' : '#2D2926',
        lineHeight: 1.65,
        fontFamily: 'inherit',
        margin: 0,
        flex: 1,
      }}
    >
      {text}
    </pre>
  );
}
