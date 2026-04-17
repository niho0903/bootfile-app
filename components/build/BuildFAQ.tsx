'use client';

import { track } from '@vercel/analytics';

const FAQS: Array<{ id: string; q: string; a: string }> = [
  {
    id: 'pricing',
    q: 'Why $4.99 and not free?',
    a: `Generation runs on the Claude API and costs real money per BootFile. Pricing it at $4.99 covers generation cost and keeps the product honest — if it were free, we'd either have to sell your data or cut generation quality. We don't want to do either. The tradeoff: you pay once, you own the file, and we have no reason to monetize you a second time.`,
  },
  {
    id: 'actually_works',
    q: 'Will this actually work with my AI, or is it just a fancy prompt?',
    a: `It's a structured set of instructions you paste into custom instructions (ChatGPT), project memory (Claude), or the equivalent persistent-context feature on Gemini, DeepSeek, Copilot, and Grok. Once pasted, it persists across every new conversation on that platform. It's not a one-time prompt — it's the thing your AI reads before every response you send.`,
  },
  {
    id: 'wrong_archetype',
    q: 'What happens if the quiz got me wrong?',
    a: `Retake it. The quiz is free and the BootFile is generated fresh each time. If your new answers point to a different archetype, you'll get a different file. A lot of people retake it once after they see their first result to calibrate — that's expected, not a problem.`,
  },
];

export function BuildFAQ() {
  return (
    <div
      style={{
        borderTop: '1px solid #DDD6CC',
        paddingTop: 32,
        marginTop: 32,
      }}
    >
      <h2
        className="font-heading"
        style={{
          fontSize: 'clamp(1.2rem, 3vw, 1.4rem)',
          fontWeight: 400,
          color: '#2D2926',
          marginBottom: 16,
        }}
      >
        Before you buy
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQS.map((item) => (
          <details
            key={item.id}
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) {
                try {
                  track('build_faq_opened', { question_id: item.id });
                } catch { /* analytics not loaded */ }
              }
            }}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #DDD6CC',
              borderRadius: 12,
              padding: '14px 18px',
            }}
          >
            <summary
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: '#2D2926',
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span>{item.q}</span>
              <span style={{ fontSize: 18, color: '#7A746B', flexShrink: 0 }}>+</span>
            </summary>
            <p
              style={{
                fontSize: 14,
                color: '#5A544C',
                lineHeight: 1.7,
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
