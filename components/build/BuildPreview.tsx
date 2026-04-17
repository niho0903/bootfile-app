'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { ArchetypeId } from '@/lib/questions';
import { ARCHETYPES } from '@/lib/archetypes';
import { getPlaceholderSections } from '@/lib/preview-placeholder';
import { EXCERPT_FALLBACKS, extractCommunicationRules } from '@/lib/archetype-copy';
import { BuildPayment } from './BuildPayment';
import { BuildDemo } from './BuildDemo';
import { BuildTrustLayer } from './BuildTrustLayer';
import { BuildFAQ } from './BuildFAQ';

interface BuildPreviewProps {
  previewText: string;
  archetypeId: ArchetypeId;
  onUnlock: () => void;
  clientSecret: string | null;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (message: string) => void;
  paymentLoading?: boolean;
}

const PAYWALL_BULLETS: Array<{ lead: string; body: string }> = [
  {
    lead: 'Stop re-explaining yourself every session.',
    body: 'Your BootFile loads your context in one paste. The model stops asking you questions it should already know the answer to.',
  },
  {
    lead: 'Get responses shaped like how you actually think.',
    body: "Direct if you're direct. Exploratory if you're exploratory. No more generic \u201chere are some things to consider\u201d lists when you wanted a decision partner.",
  },
  {
    lead: 'Works across ChatGPT, Claude, Gemini, DeepSeek, Copilot, and Grok.',
    body: 'One file, six platforms. Paste it once per platform and it persists in custom instructions or project memory.',
  },
  {
    lead: 'Built from how you answered, not a template.',
    body: 'Every BootFile is generated from your specific quiz responses. Two people with the same archetype get different files.',
  },
];

export function BuildPreview({
  previewText,
  archetypeId,
  onUnlock,
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
  paymentLoading,
}: BuildPreviewProps) {
  const arch = ARCHETYPES[archetypeId];
  const placeholders = getPlaceholderSections(archetypeId);

  // Pull 3 Communication Rules from the live preview; fall back to canned excerpts while streaming.
  const excerpts = useMemo(() => {
    const real = extractCommunicationRules(previewText, 3);
    if (real.length >= 3) return real;
    return EXCERPT_FALLBACKS[archetypeId] ?? EXCERPT_FALLBACKS.architect;
  }, [previewText, archetypeId]);

  // build_excerpt_viewed tracking
  const excerptRef = useRef<HTMLDivElement>(null);
  const [excerptViewed, setExcerptViewed] = useState(false);
  useEffect(() => {
    const el = excerptRef.current;
    if (!el || excerptViewed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setExcerptViewed(true);
            try {
              track('build_excerpt_viewed', { archetype: archetypeId });
            } catch { /* analytics not loaded */ }
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [archetypeId, excerptViewed]);

  const handleUnlockClick = () => {
    try {
      track('build_cta_clicked', { archetype: archetypeId });
    } catch { /* analytics not loaded */ }
    onUnlock();
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
            marginBottom: 16,
          }}
        >
          {arch.icon} {arch.name}
        </span>
        <h1
          className="font-heading"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#2D2926', marginBottom: 8 }}
        >
          Your BootFile preview
        </h1>
        <p style={{ color: '#7A746B', fontSize: 14 }}>
          Here&apos;s a taste of your personalized profile.
        </p>
      </div>

      {/* SECTION 1 — Before/After demo (hero) */}
      <BuildDemo archetypeId={archetypeId} />

      {/* SECTION 3 — Elevated excerpt callouts */}
      <div ref={excerptRef} style={{ marginBottom: 32 }}>
        <h2
          className="font-heading"
          style={{
            fontSize: 'clamp(1.2rem, 3vw, 1.4rem)',
            color: '#2D2926',
            fontWeight: 400,
            marginBottom: 16,
          }}
        >
          A peek at what&apos;s in your BootFile
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {excerpts.map((line, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #DDD6CC',
                borderLeft: '3px solid #7D8B6E',
                borderRadius: 8,
                padding: '14px 18px',
                fontSize: 14.5,
                color: '#2D2926',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{line}&rdquo;
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#7A746B', margin: 0 }}>
          These are three lines from one of nine sections your BootFile generates.
        </p>
      </div>

      {/* Full preview content (existing behavior) */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #DDD6CC',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          marginBottom: 0,
        }}
      >
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            color: '#2D2926',
            lineHeight: 1.6,
            fontFamily: 'inherit',
            margin: 0,
          }}
        >
          {previewText}
        </pre>
      </div>

      {/* Paywall card */}
      <div
        style={{
          backgroundColor: '#2D2926',
          borderRadius: 16,
          padding: 32,
          margin: '24px 0',
          textAlign: 'center',
        }}
      >
        <h2
          className="font-heading"
          style={{
            fontSize: 'clamp(1.3rem, 3.5vw, 1.6rem)',
            color: '#F7F4EF',
            fontWeight: 400,
            marginBottom: 20,
          }}
        >
          Unlock your full BootFile
        </h2>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 auto 28px',
            maxWidth: 440,
            textAlign: 'left',
          }}
        >
          {PAYWALL_BULLETS.map((item) => (
            <li
              key={item.lead}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 14,
                lineHeight: 1.55,
              }}
            >
              <span style={{ color: '#7D8B6E', fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                &#10003;
              </span>
              <span style={{ fontSize: 14, color: '#C4BFB6' }}>
                <strong style={{ color: '#F7F4EF', fontWeight: 600 }}>{item.lead}</strong>{' '}
                {item.body}
              </span>
            </li>
          ))}
        </ul>

        {clientSecret ? (
          /* Embedded payment form */
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <BuildPayment
              clientSecret={clientSecret}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
            />
            <p style={{ fontSize: 12, color: '#7A746B', marginTop: 12 }}>
              Secure payment via Stripe
            </p>
          </div>
        ) : (
          /* Unlock button */
          <>
            <p style={{ fontSize: 28, fontWeight: 600, color: '#F7F4EF', marginBottom: 4 }}>$4.99</p>
            <p style={{ fontSize: 13, color: '#A09B93', marginBottom: 20 }}>one-time, no subscription</p>
            <button
              onClick={handleUnlockClick}
              disabled={paymentLoading}
              style={{
                width: '100%',
                maxWidth: 320,
                backgroundColor: paymentLoading ? '#A0A89A' : '#7D8B6E',
                color: '#fff',
                fontWeight: 600,
                padding: '16px 32px',
                borderRadius: 12,
                fontSize: 16,
                border: 'none',
                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!paymentLoading) e.currentTarget.style.backgroundColor = '#5C6650';
              }}
              onMouseLeave={(e) => {
                if (!paymentLoading) e.currentTarget.style.backgroundColor = '#7D8B6E';
              }}
            >
              {paymentLoading ? 'Setting up payment...' : 'Unlock My BootFile'}
            </button>
            <p style={{ fontSize: 12, color: '#7A746B', marginTop: 12 }}>
              Secure checkout via Stripe
            </p>
          </>
        )}
      </div>

      {/* Blurred placeholder sections */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: '#7A746B', marginBottom: 12, textAlign: 'center' }}>
          You&apos;re seeing 2 of 9 sections. The full BootFile includes 7 more.
        </p>
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #DDD6CC',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              filter: 'blur(6px)',
              userSelect: 'none',
              pointerEvents: 'none',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}
          >
            {Object.entries(placeholders).map(([section, content]) => (
              <div key={section} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2D2926', marginBottom: 8 }}>
                  ### {section}
                </h3>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 14,
                    color: '#2D2926',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    margin: 0,
                  }}
                >
                  {content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4 — Trust layer */}
      <BuildTrustLayer />

      {/* SECTION 5 — FAQ */}
      <BuildFAQ />
    </div>
  );
}
