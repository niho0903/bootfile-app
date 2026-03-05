'use client';

import { useState } from 'react';
import { formatForPlatforms } from '@/lib/platform-format';

interface BootFileDisplayProps {
  bootfileText: string;
}

type Platform = 'chatgpt' | 'claude' | 'gemini';

const PLATFORM_CONFIG: Record<Platform, {
  label: string;
  testDriveUrl: string;
  instructions: string;
}> = {
  chatgpt: {
    label: 'ChatGPT',
    testDriveUrl: 'https://chatgpt.com',
    instructions: 'Go to ChatGPT \u2192 Click your profile (bottom-left) \u2192 Settings \u2192 Personalization \u2192 Custom Instructions. Paste Field 1 into "What would you like ChatGPT to know about you?" and Field 2 into "How would you like ChatGPT to respond?"',
  },
  claude: {
    label: 'Claude',
    testDriveUrl: 'https://claude.ai',
    instructions: 'Go to Claude.ai \u2192 Click your profile (bottom-left) \u2192 Settings \u2192 Profile. Paste the full text into the "Custom Instructions" field.',
  },
  gemini: {
    label: 'Gemini',
    testDriveUrl: 'https://gemini.google.com',
    instructions: 'Go to Gemini \u2192 Settings \u2192 Extensions \u2192 Create a Gem. Paste the full text as Gem instructions. For quick setup, use the condensed version in Settings \u2192 Preferences.',
  },
};

export function BootFileDisplay({ bootfileText }: BootFileDisplayProps) {
  const [activeTab, setActiveTab] = useState<Platform>('chatgpt');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const formatted = formatForPlatforms(bootfileText);
  const config = PLATFORM_CONFIG[activeTab];

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div>
      {/* Platform tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dcd9d5', marginBottom: 24 }}>
        {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(platform => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform)}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 500,
              borderBottom: `2px solid ${activeTab === platform ? '#0e6e6e' : 'transparent'}`,
              color: activeTab === platform ? '#0e6e6e' : '#999',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === platform ? '#0e6e6e' : 'transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => {
              if (activeTab !== platform) {
                e.currentTarget.style.color = '#555';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== platform) {
                e.currentTarget.style.color = '#999';
              }
            }}
          >
            {PLATFORM_CONFIG[platform].label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div
        style={{
          backgroundColor: '#f0fafa',
          border: '1px solid #d0f0f0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 14, color: '#0a5454' }}>{config.instructions}</p>
      </div>

      {/* Content + Copy */}
      {activeTab === 'chatgpt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Field 1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>
                Field 1: &ldquo;What would you like ChatGPT to know about you?&rdquo;
              </h3>
            </div>
            <CopyButton
              text={formatted.chatgpt.field1}
              field="chatgpt-field1"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ContentBlock text={formatted.chatgpt.field1} />
          </div>

          {/* Field 2 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>
                Field 2: &ldquo;How would you like ChatGPT to respond?&rdquo;
              </h3>
            </div>
            <CopyButton
              text={formatted.chatgpt.field2}
              field="chatgpt-field2"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ContentBlock text={formatted.chatgpt.field2} />
          </div>
        </div>
      )}

      {activeTab === 'claude' && (
        <div>
          <CopyButton
            text={formatted.claude}
            field="claude"
            copiedField={copiedField}
            onCopy={handleCopy}
          />
          <ContentBlock text={formatted.claude} />
        </div>
      )}

      {activeTab === 'gemini' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 8 }}>
              Full Version (for Gem Instructions)
            </h3>
            <CopyButton
              text={formatted.gemini.gem}
              field="gemini-gem"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ContentBlock text={formatted.gemini.gem} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 8 }}>
              Condensed Version (for Preferences)
            </h3>
            <CopyButton
              text={formatted.gemini.prefs}
              field="gemini-prefs"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ContentBlock text={formatted.gemini.prefs} />
          </div>
        </div>
      )}

      {/* Test Drive */}
      <div style={{ marginTop: 32 }}>
        <a
          href={config.testDriveUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fff',
            border: '1px solid #dcd9d5',
            color: '#1a1a1a',
            fontWeight: 500,
            padding: '10px 20px',
            borderRadius: 6,
            minHeight: 44,
            fontSize: 14,
            textDecoration: 'none',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f0ec')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
        >
          Open {config.label}
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
        border: 'none',
        cursor: 'pointer',
        marginBottom: 12,
        backgroundColor: isCopied ? '#059669' : '#0e6e6e',
        color: '#fff',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (!isCopied) {
          e.currentTarget.style.backgroundColor = '#0a5454';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={e => {
        if (!isCopied) {
          e.currentTarget.style.backgroundColor = '#0e6e6e';
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
        backgroundColor: '#fff',
        border: '1px solid #edeae5',
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
          color: '#444',
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
