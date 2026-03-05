'use client';

import { useState } from 'react';
import { getShareUrl } from '@/lib/og-utils';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

interface ShareButtonsProps {
  archetypeId: ArchetypeId;
}

const shareButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: '#fff',
  border: '1px solid #dcd9d5',
  color: '#1a1a1a',
  textDecoration: 'none',
  minHeight: 44,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

export function ShareButtons({ archetypeId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const arch = ARCHETYPES[archetypeId];
  const shareUrl = getShareUrl(archetypeId);
  const shareText = `I'm ${arch.name}. What's your AI style? Take the free quiz`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={shareButtonStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f0ec')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
      >
        <XIcon />
        Share on X
      </a>

      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={shareButtonStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f0ec')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
      >
        <LinkedInIcon />
        LinkedIn
      </a>

      <button
        onClick={handleCopy}
        style={shareButtonStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f0ec')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
      >
        <LinkIcon />
        {copied ? 'Copied \u2713' : 'Copy Link'}
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
