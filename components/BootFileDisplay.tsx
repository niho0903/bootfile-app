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
      <div className="flex border-b border-[#dcd9d5] mb-6">
        {(Object.keys(PLATFORM_CONFIG) as Platform[]).map(platform => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === platform
                ? 'border-[#0e6e6e] text-[#0e6e6e]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {PLATFORM_CONFIG[platform].label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-[#f0fafa] border border-[#d0f0f0] rounded-lg p-4 mb-6">
        <p className="text-sm text-[#0a5454]">{config.instructions}</p>
      </div>

      {/* Content + Copy */}
      {activeTab === 'chatgpt' && (
        <div className="space-y-6">
          {/* Field 1 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
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
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Full Version (for Gem Instructions)</h3>
            <CopyButton
              text={formatted.gemini.gem}
              field="gemini-gem"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ContentBlock text={formatted.gemini.gem} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Condensed Version (for Preferences)</h3>
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
      <div className="mt-8">
        <a
          href={config.testDriveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white border border-[#dcd9d5] text-gray-900 hover:bg-[#f3f0ec] font-medium px-5 py-2.5 rounded-md min-h-[44px] text-sm transition-colors"
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
      className={`w-full font-medium px-5 py-3 rounded-lg text-sm transition-all duration-200 mb-3 ${
        isCopied
          ? 'bg-[#059669] text-white'
          : 'bg-[#0e6e6e] hover:bg-[#0a5454] text-white hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'
      }`}
    >
      {isCopied ? 'Copied \u2713' : 'Copy to Clipboard'}
    </button>
  );
}

function ContentBlock({ text }: { text: string }) {
  return (
    <div className="bg-white border border-[#edeae5] rounded-lg p-4 max-h-[400px] overflow-y-auto">
      <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'inherit' }}>
        {text}
      </pre>
    </div>
  );
}
