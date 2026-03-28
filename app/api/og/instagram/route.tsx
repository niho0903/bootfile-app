import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const COLORS = {
  cream: '#F7F4EF',
  sage: '#7D8B6E',
  sageDark: '#5C6650',
  charcoal: '#2D2926',
  white: '#FFFFFF',
};

const ARCHETYPE_DATA: Record<string, { name: string; tagline: string; icon: string }> = {
  surgeon: { name: 'The Surgeon', tagline: 'Cut the fluff.', icon: '\u2702\uFE0F' },
  architect: { name: 'The Architect', tagline: 'Show me the whole board.', icon: '\uD83C\uDFDB\uFE0F' },
  sparring: { name: 'The Sparring Partner', tagline: "Don't agree with me.", icon: '\uD83E\uDD4A' },
  translator: { name: 'The Translator', tagline: 'Make it click.', icon: '\uD83D\uDD04' },
  copilot: { name: 'The Co-Pilot', tagline: 'Think with me.', icon: '\u2708\uFE0F' },
  librarian: { name: 'The Librarian', tagline: 'Give me everything.', icon: '\uD83D\uDCDA' },
  closer: { name: 'The Closer', tagline: 'Just tell me what to do.', icon: '\uD83C\uDFAF' },
  maker: { name: 'The Maker', tagline: 'Less talk, more output.', icon: '\u26A1' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hook = searchParams.get('hook') || '';
  const type = searchParams.get('type') || 'frustration';
  const bg = searchParams.get('bg');
  const color = searchParams.get('color');
  const archetype = searchParams.get('archetype');

  const size = { width: 1080, height: 1080 };

  if (type === 'archetype_card' || type === 'archetype-spotlight') {
    const arch = ARCHETYPE_DATA[archetype || 'surgeon'] || ARCHETYPE_DATA.surgeon;
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
            backgroundColor: bg || COLORS.charcoal,
            fontFamily: 'Georgia, serif',
            padding: '80px',
            position: 'relative',
          }}
        >
          {/* Sage accent bar */}
          <div
            style={{
              width: '64px',
              height: '4px',
              backgroundColor: COLORS.sage,
              borderRadius: '9999px',
              marginBottom: '40px',
            }}
          />

          {/* Icon */}
          <div style={{ fontSize: '96px', marginBottom: '24px', lineHeight: 1 }}>
            {arch.icon}
          </div>

          {/* Name */}
          <div
            style={{
              color: color || COLORS.cream,
              fontSize: '64px',
              fontWeight: 400,
              textAlign: 'center',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}
          >
            {arch.name}
          </div>

          {/* Tagline */}
          <div
            style={{
              color: 'rgba(247, 244, 239, 0.65)',
              fontSize: '32px',
              textAlign: 'center',
              fontStyle: 'italic',
              marginBottom: '48px',
            }}
          >
            &ldquo;{arch.tagline}&rdquo;
          </div>

          {/* Hook text if provided */}
          {hook && (
            <div
              style={{
                color: 'rgba(247, 244, 239, 0.5)',
                fontSize: '24px',
                textAlign: 'center',
                lineHeight: 1.5,
                maxWidth: '800px',
              }}
            >
              {hook.length > 120 ? hook.slice(0, 120) + '...' : hook}
            </div>
          )}

          {/* Brand */}
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.sage}, ${COLORS.sageDark})`,
              }}
            />
            <span
              style={{
                color: 'rgba(247, 244, 239, 0.4)',
                fontSize: '20px',
                fontWeight: 400,
              }}
            >
              bootfile.ai
            </span>
          </div>
        </div>
      ),
      size,
    );
  }

  if (type === 'concept' || type === 'tip') {
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
            background: bg || `linear-gradient(180deg, ${COLORS.sage}, ${COLORS.sageDark})`,
            fontFamily: 'Georgia, serif',
            padding: '80px',
            position: 'relative',
          }}
        >
          {/* Hook text */}
          <div
            style={{
              color: color || COLORS.white,
              fontSize: hook.length > 100 ? '40px' : '48px',
              textAlign: 'center',
              lineHeight: 1.4,
              maxWidth: '880px',
              fontWeight: 400,
            }}
          >
            {hook}
          </div>

          {/* Brand */}
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              }}
            />
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '20px',
                fontWeight: 400,
              }}
            >
              bootfile.ai
            </span>
          </div>
        </div>
      ),
      size,
    );
  }

  if (type === 'before-after' || type === 'contrast') {
    // Split the hook on "|" for before/after if available
    const parts = hook.split('|').map(s => s.trim());
    const before = parts[0] || 'Without BootFile';
    const after = parts[1] || 'With BootFile';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            fontFamily: 'Georgia, serif',
            position: 'relative',
          }}
        >
          {/* Left — cream */}
          <div
            style={{
              width: '50%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.cream,
              padding: '60px 40px',
            }}
          >
            <div
              style={{
                color: 'rgba(45, 41, 38, 0.4)',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '24px',
              }}
            >
              Without BootFile
            </div>
            <div
              style={{
                color: COLORS.charcoal,
                fontSize: before.length > 80 ? '28px' : '32px',
                textAlign: 'center',
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              {before}
            </div>
          </div>

          {/* Right — sage */}
          <div
            style={{
              width: '50%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.sage,
              padding: '60px 40px',
            }}
          >
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '24px',
              }}
            >
              With BootFile
            </div>
            <div
              style={{
                color: COLORS.white,
                fontSize: after.length > 80 ? '28px' : '32px',
                textAlign: 'center',
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              {after}
            </div>
          </div>

          {/* Brand — centered bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.sage}, ${COLORS.sageDark})`,
              }}
            />
            <span
              style={{
                color: 'rgba(45, 41, 38, 0.4)',
                fontSize: '18px',
              }}
            >
              bootfile.ai
            </span>
          </div>
        </div>
      ),
      size,
    );
  }

  // Default: frustration / myth-bust
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
          backgroundColor: bg || COLORS.cream,
          fontFamily: 'Georgia, serif',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Large decorative quote mark */}
        <div
          style={{
            color: COLORS.sage,
            fontSize: '200px',
            lineHeight: 0.6,
            marginBottom: '20px',
            opacity: 0.3,
          }}
        >
          &ldquo;
        </div>

        {/* Hook text */}
        <div
          style={{
            color: color || COLORS.charcoal,
            fontSize: hook.length > 100 ? '36px' : hook.length > 60 ? '42px' : '48px',
            textAlign: 'center',
            lineHeight: 1.4,
            fontStyle: 'italic',
            maxWidth: '880px',
            fontWeight: 400,
          }}
        >
          {hook}
        </div>

        {/* Brand */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.sage}, ${COLORS.sageDark})`,
            }}
          />
          <span
            style={{
              color: 'rgba(45, 41, 38, 0.4)',
              fontSize: '20px',
              fontWeight: 400,
            }}
          >
            bootfile.ai
          </span>
        </div>
      </div>
    ),
    size,
  );
}
