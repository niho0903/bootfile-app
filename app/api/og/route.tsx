import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const ARCHETYPE_OG: Record<string, {
  name: string;
  tagline: string;
  color: string;
  bgGradient: string;
  textColor: string;
  icon: string;
}> = {
  surgeon: {
    name: 'The Surgeon',
    tagline: 'Cut the fluff.',
    color: '#DC2626',
    bgGradient: 'linear-gradient(135deg, #1a0505 0%, #3d0a0a 50%, #5c1111 100%)',
    textColor: '#fff',
    icon: '\u2702\uFE0F',
  },
  architect: {
    name: 'The Architect',
    tagline: 'Show me the whole board.',
    color: '#2563EB',
    bgGradient: 'linear-gradient(135deg, #050d1f 0%, #0a1f4d 50%, #112266 100%)',
    textColor: '#fff',
    icon: '\uD83C\uDFDB\uFE0F',
  },
  sparring: {
    name: 'The Sparring Partner',
    tagline: "Don't agree with me.",
    color: '#D97706',
    bgGradient: 'linear-gradient(135deg, #1a0f00 0%, #3d2000 50%, #663300 100%)',
    textColor: '#fff',
    icon: '\uD83E\uDD4A',
  },
  translator: {
    name: 'The Translator',
    tagline: 'Make it click.',
    color: '#059669',
    bgGradient: 'linear-gradient(135deg, #001a0f 0%, #003d22 50%, #005c33 100%)',
    textColor: '#fff',
    icon: '\uD83D\uDD04',
  },
  copilot: {
    name: 'The Co-Pilot',
    tagline: 'Think with me.',
    color: '#7C3AED',
    bgGradient: 'linear-gradient(135deg, #0d0520 0%, #1f0a52 50%, #2d0f73 100%)',
    textColor: '#fff',
    icon: '\u2708\uFE0F',
  },
  librarian: {
    name: 'The Librarian',
    tagline: 'Give me everything.',
    color: '#0891B2',
    bgGradient: 'linear-gradient(135deg, #00131a 0%, #003344 50%, #004d66 100%)',
    textColor: '#fff',
    icon: '\uD83D\uDCDA',
  },
  closer: {
    name: 'The Closer',
    tagline: 'Just tell me what to do.',
    color: '#E11D48',
    bgGradient: 'linear-gradient(135deg, #1a0010 0%, #3d0028 50%, #5c003d 100%)',
    textColor: '#fff',
    icon: '\uD83C\uDFAF',
  },
  maker: {
    name: 'The Maker',
    tagline: 'Less talk, more output.',
    color: '#EA580C',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #3d1000 50%, #5c1800 100%)',
    textColor: '#fff',
    icon: '\u26A1',
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const archetypeId = searchParams.get('archetype') ?? 'surgeon';
  const arch = ARCHETYPE_OG[archetypeId] ?? ARCHETYPE_OG.surgeon;

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
          background: arch.bgGradient,
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
            color: 'rgba(255,255,255,0.5)',
            fontSize: '24px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          BOOTFILE.AI
        </div>

        {/* Accent bar */}
        <div
          style={{
            width: '64px',
            height: '5px',
            background: arch.color,
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
            color: arch.textColor,
            fontSize: '72px',
            fontWeight: 700,
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
          Take the free quiz &rarr; bootfile.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
