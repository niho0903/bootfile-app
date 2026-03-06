import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ARCHETYPE_OG: Record<string, {
  name: string;
  tagline: string;
  color: string;
  icon: string;
}> = {
  surgeon: {
    name: 'The Surgeon',
    tagline: 'Cut the fluff.',
    color: '#DC2626',
    icon: '\u2702\uFE0F',
  },
  architect: {
    name: 'The Architect',
    tagline: 'Show me the whole board.',
    color: '#2563EB',
    icon: '\uD83C\uDFDB\uFE0F',
  },
  sparring: {
    name: 'The Sparring Partner',
    tagline: "Don't agree with me.",
    color: '#D97706',
    icon: '\uD83E\uDD4A',
  },
  translator: {
    name: 'The Translator',
    tagline: 'Make it click.',
    color: '#059669',
    icon: '\uD83D\uDD04',
  },
  copilot: {
    name: 'The Co-Pilot',
    tagline: 'Think with me.',
    color: '#7C3AED',
    icon: '\u2708\uFE0F',
  },
  librarian: {
    name: 'The Librarian',
    tagline: 'Give me everything.',
    color: '#0891B2',
    icon: '\uD83D\uDCDA',
  },
  closer: {
    name: 'The Closer',
    tagline: 'Just tell me what to do.',
    color: '#E11D48',
    icon: '\uD83C\uDFAF',
  },
  maker: {
    name: 'The Maker',
    tagline: 'Less talk, more output.',
    color: '#EA580C',
    icon: '\u26A1',
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const archetypeParam = searchParams.get('archetype');

  // Generic brand card when no archetype is specified
  if (!archetypeParam) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2D2926',
            fontFamily: 'system-ui, sans-serif',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Logo dot */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7D8B6E, #5C6650)',
              marginBottom: '32px',
            }}
          />

          {/* Brand name */}
          <div
            style={{
              color: '#F7F4EF',
              fontSize: '80px',
              fontWeight: 400,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            BootFile
          </div>

          {/* Tagline */}
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '36px',
              textAlign: 'center',
              marginBottom: '48px',
            }}
          >
            Know Your AI Style
          </div>

          {/* Sage accent bar */}
          <div
            style={{
              width: '64px',
              height: '4px',
              backgroundColor: '#7D8B6E',
              borderRadius: '9999px',
              marginBottom: '32px',
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '22px',
              textAlign: 'center',
            }}
          >
            2-minute quiz &middot; 8 archetypes &middot; personalized AI instructions
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const arch = ARCHETYPE_OG[archetypeParam] ?? ARCHETYPE_OG.surgeon;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2D2926',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Brand */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7D8B6E, #5C6650)',
            }}
          />
          <span
            style={{
              color: 'rgba(247, 244, 239, 0.5)',
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            bootfile
          </span>
        </div>

        {/* Sage accent bar */}
        <div
          style={{
            width: '64px',
            height: '4px',
            backgroundColor: '#7D8B6E',
            borderRadius: '9999px',
            marginBottom: '32px',
          }}
        />

        {/* Icon */}
        <div style={{ fontSize: '80px', marginBottom: '20px', lineHeight: 1 }}>
          {arch.icon}
        </div>

        {/* Archetype name */}
        <div
          style={{
            color: '#F7F4EF',
            fontSize: '72px',
            fontWeight: 400,
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: '16px',
          }}
        >
          {arch.name}
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '32px',
            textAlign: 'center',
            fontStyle: 'italic',
            marginBottom: '48px',
          }}
        >
          &ldquo;{arch.tagline}&rdquo;
        </div>

        {/* CTA */}
        <div
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '22px',
            textAlign: 'center',
          }}
        >
          What&apos;s your AI style? &rarr; bootfile.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
