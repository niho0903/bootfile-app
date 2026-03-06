'use client';

import { useState } from 'react';
import { formatForPlatforms, PlatformId, PLATFORM_INSTRUCTIONS, extractTryThisFirst, extractFirstMessage } from '@/lib/platform-format';

interface BootFileDisplayProps {
  bootfileText: string;
  tier?: 'basic' | 'premium' | 'upgrade';
}

const PLATFORM_CONFIG: Record<PlatformId, { label: string }> = {
  chatgpt: { label: 'ChatGPT' },
  claude: { label: 'Claude' },
  gemini: { label: 'Gemini' },
  grok: { label: 'Grok' },
  deepseek: { label: 'DeepSeek' },
  copilot: { label: 'Copilot' },
};

const PLATFORM_ORDER: PlatformId[] = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'copilot'];

export function BootFileDisplay({ bootfileText }: BootFileDisplayProps) {
  const [activeTab, setActiveTab] = useState<PlatformId>('chatgpt');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const formatted = formatForPlatforms(bootfileText);
  const instructions = PLATFORM_INSTRUCTIONS[activeTab];
  const tryThisFirst = extractTryThisFirst(bootfileText);
  const firstMessage = extractFirstMessage(bootfileText);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTabClick = (platform: PlatformId) => {
    setActiveTab(platform);

    // Fire-and-forget platform tracking
    const quizId = typeof window !== 'undefined' ? localStorage.getItem('bootfile_quiz_id') : null;
    if (quizId) {
      fetch('/api/track-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, platform }),
      }).catch(() => { /* non-blocking */ });
    }
  };

  return (
    <div>
      {/* Platform tabs — scrollable on mobile */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #DDD6CC',
          marginBottom: 24,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {PLATFORM_ORDER.map(platform => (
          <button
            key={platform}
            onClick={() => handleTabClick(platform)}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              borderBottom: `2px solid ${activeTab === platform ? '#7D8B6E' : 'transparent'}`,
              color: activeTab === platform ? '#7D8B6E' : '#7A746B',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === platform ? '#7D8B6E' : 'transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (activeTab !== platform) {
                e.currentTarget.style.color = '#2D2926';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== platform) {
                e.currentTarget.style.color = '#7A746B';
              }
            }}
          >
            {PLATFORM_CONFIG[platform].label}
          </button>
        ))}
      </div>

      {/* Instructions as numbered steps */}
      <div
        style={{
          backgroundColor: '#ECEAE4',
          border: '1px solid #DDD6CC',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#5C6650', lineHeight: 1.7 }}>
          {instructions.steps.map((step, i) => (
            <li key={i} style={{ marginBottom: i < instructions.steps.length - 1 ? 4 : 0 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Content + Copy — ChatGPT (2 fields) */}
      {activeTab === 'chatgpt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B' }}>
                Field 1: &ldquo;What would you like ChatGPT to know about you?&rdquo;
              </h3>
            </div>
            <CopyButton text={formatted.chatgpt.field1} field="chatgpt-field1" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.chatgpt.field1} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B' }}>
                Field 2: &ldquo;How would you like ChatGPT to respond?&rdquo;
              </h3>
            </div>
            <CopyButton text={formatted.chatgpt.field2} field="chatgpt-field2" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.chatgpt.field2} />
          </div>
        </div>
      )}

      {/* Claude (single text) */}
      {activeTab === 'claude' && (
        <div>
          <CopyButton text={formatted.claude} field="claude" copiedField={copiedField} onCopy={handleCopy} />
          <ContentBlock text={formatted.claude} />
        </div>
      )}

      {/* Gemini (2 blocks) */}
      {activeTab === 'gemini' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B', marginBottom: 8 }}>
              Full Version (for Gem Instructions)
            </h3>
            <CopyButton text={formatted.gemini.gem} field="gemini-gem" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.gemini.gem} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B', marginBottom: 8 }}>
              Condensed Version (for Preferences)
            </h3>
            <CopyButton text={formatted.gemini.prefs} field="gemini-prefs" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.gemini.prefs} />
          </div>
        </div>
      )}

      {/* Grok (2 fields, same as ChatGPT) */}
      {activeTab === 'grok' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B' }}>
                Field 1: &ldquo;About You&rdquo;
              </h3>
            </div>
            <CopyButton text={formatted.grok.field1} field="grok-field1" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.grok.field1} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#7A746B' }}>
                Field 2: &ldquo;Response Preferences&rdquo;
              </h3>
            </div>
            <CopyButton text={formatted.grok.field2} field="grok-field2" copiedField={copiedField} onCopy={handleCopy} />
            <ContentBlock text={formatted.grok.field2} />
          </div>
        </div>
      )}

      {/* DeepSeek (single text block) */}
      {activeTab === 'deepseek' && (
        <div>
          <CopyButton text={formatted.deepseek} field="deepseek" copiedField={copiedField} onCopy={handleCopy} />
          <ContentBlock text={formatted.deepseek} />
        </div>
      )}

      {/* Copilot (single text block) */}
      {activeTab === 'copilot' && (
        <div>
          <CopyButton text={formatted.copilot} field="copilot" copiedField={copiedField} onCopy={handleCopy} />
          <ContentBlock text={formatted.copilot} />
        </div>
      )}

      {/* First Message indicator */}
      {firstMessage && (
        <div
          style={{
            marginTop: 32,
            backgroundColor: '#F0EDE6',
            border: '1px solid #DDD6CC',
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7D8B6E, #5C6650)',
                flexShrink: 0,
              }}
            />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#2D2926', margin: 0 }}>
              Your AI will greet you
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#7A746B', marginBottom: 12, lineHeight: 1.5 }}>
            After you paste your BootFile, your AI&apos;s first response in every new conversation will be:
          </p>
          <p
            className="font-heading"
            style={{
              fontSize: 15,
              color: '#2D2926',
              fontStyle: 'italic',
              lineHeight: 1.5,
              padding: '12px 16px',
              backgroundColor: '#F7F4EF',
              borderRadius: 8,
              border: '1px solid #DDD6CC',
            }}
          >
            &ldquo;{firstMessage}&rdquo;
          </p>
        </div>
      )}

      {/* Try This First */}
      {tryThisFirst && (
        <div
          style={{
            marginTop: 32,
            backgroundColor: '#F0EDE6',
            border: '1px solid #DDD6CC',
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7D8B6E" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#2D2926', margin: 0 }}>
              Try This First
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#7A746B', marginBottom: 12, lineHeight: 1.5 }}>
            Paste your BootFile, then send this as your first message to see the difference.
          </p>
          <CopyButton text={tryThisFirst} field="try-this" copiedField={copiedField} onCopy={handleCopy} />
          <ContentBlock text={tryThisFirst} />
        </div>
      )}

      {/* Test Drive */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <a
          href={instructions.testDriveUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#ECEAE4',
            border: '1px solid #DDD6CC',
            color: '#2D2926',
            fontWeight: 500,
            padding: '10px 20px',
            borderRadius: 6,
            minHeight: 44,
            fontSize: 14,
            textDecoration: 'none',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#DDD6CC')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ECEAE4')}
        >
          {instructions.testDriveLabel}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

function CopyButton({
  text,
  field,
  copiedField,
  onCopy,
}: {
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const isCopied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(text, field)}
      style={{
        width: '100%',
        fontWeight: 500,
        padding: '12px 20px',
        borderRadius: 8,
        fontSize: 14,
        border: isCopied ? 'none' : '1.5px solid #7D8B6E',
        cursor: 'pointer',
        marginBottom: 12,
        backgroundColor: isCopied ? '#7D8B6E' : 'transparent',
        color: isCopied ? '#fff' : '#7D8B6E',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (!isCopied) {
          e.currentTarget.style.backgroundColor = '#7D8B6E';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={e => {
        if (!isCopied) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#7D8B6E';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseDown={e => {
        if (!isCopied) {
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {isCopied ? 'Copied \u2713' : 'Copy to Clipboard'}
    </button>
  );
}

function ContentBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        backgroundColor: '#F7F4EF',
        border: '1px solid #DDD6CC',
        borderRadius: 8,
        padding: 16,
        maxHeight: 400,
        overflowY: 'auto' as const,
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
        {text}
      </pre>
    </div>
  );
}
