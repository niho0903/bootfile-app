'use client';

import { ArchetypeId } from '@/lib/questions';
import { ARCHETYPES } from '@/lib/archetypes';
import { getPlaceholderSections } from '@/lib/preview-placeholder';
import { BuildPayment } from './BuildPayment';

interface BuildPreviewProps {
  previewText: string;
  archetypeId: ArchetypeId;
  onUnlock: () => void;
  clientSecret: string | null;
  onPaymentSuccess: (paymentIntentId: string) => void;
  paymentLoading?: boolean;
}

export function BuildPreview({
  previewText,
  archetypeId,
  onUnlock,
  clientSecret,
  onPaymentSuccess,
  paymentLoading,
}: BuildPreviewProps) {
  const arch = ARCHETYPES[archetypeId];
  const placeholders = getPlaceholderSections(archetypeId);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
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

      {/* Real preview content */}
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
            margin: '0 auto 24px',
            maxWidth: 320,
            textAlign: 'left',
          }}
        >
          {[
            'All 6 AI platforms',
            'Quick Commands + Starter Prompt',
            'Failure Detection Rules',
            'Personalized reasoning frameworks',
          ].map((item) => (
            <li
              key={item}
              style={{
                fontSize: 14,
                color: '#C4BFB6',
                lineHeight: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ color: '#7D8B6E', fontSize: 16 }}>&#10003;</span>
              {item}
            </li>
          ))}
        </ul>

        {clientSecret ? (
          /* Embedded payment form */
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <BuildPayment
              clientSecret={clientSecret}
              onSuccess={onPaymentSuccess}
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
              onClick={onUnlock}
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
  );
}
