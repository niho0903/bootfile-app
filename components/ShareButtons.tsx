'use client';

import { useState } from 'react';
import { getShareUrl } from '@/lib/og-utils';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

interface ShareButtonsProps {
  archetypeId: ArchetypeId;
  variant?: 'inline' | 'full';
}

export function ShareButtons({ archetypeId, variant = 'full' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const arch = ARCHETYPES[archetypeId];
  const shareText = `I'm ${arch.name}. What's your AI style?`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I'm ${arch.name} — BootFile`,
          text: shareText,
          url: getShareUrl(archetypeId),
        });
      } catch { /* user cancelled */ }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl(archetypeId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl(archetypeId))}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(archetypeId))}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(archetypeId))}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleDownloadImage = async () => {
    try {
      const response = await fetch(`/api/og?archetype=${archetypeId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bootfile-${archetypeId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Image download failed:', e);
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  if (variant === 'inline') {
    const btnStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: 8,
      padding: '8px 14px',
      color: 'rgba(247, 244, 239, 0.7)',
      fontFamily: 'inherit',
      fontSize: '0.8rem',
      cursor: 'pointer',
      transition: 'background 0.2s ease',
    };

    return (
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          paddingTop: 16,
          marginTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {hasNativeShare && (
          <button onClick={handleNativeShare} style={btnStyle} title="Share">
            <ShareIcon /> Share
          </button>
        )}
        <button onClick={handleCopyLink} style={btnStyle} title="Copy link">
          {copied ? '✓ Copied' : <><LinkIcon /> Copy</>}
        </button>
        <button onClick={handleDownloadImage} style={btnStyle} title="Save image">
          {saved ? '✓ Saved' : <><DownloadIcon /> Save</>}
        </button>
      </div>
    );
  }

  // Full variant (standalone section)
  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: '#F7F4EF',
    border: '1px solid #DDD6CC',
    color: '#2D2926',
    textDecoration: 'none',
    minHeight: 44,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
      {hasNativeShare && (
        <button onClick={handleNativeShare} style={btnStyle}>
          <ShareIcon /> Share
        </button>
      )}
      <button onClick={handleShareX} style={btnStyle}>
        <XIcon /> X
      </button>
      <button onClick={handleShareLinkedIn} style={btnStyle}>
        <LinkedInIcon /> LinkedIn
      </button>
      <button onClick={handleShareFacebook} style={btnStyle}>
        <FacebookIcon /> Facebook
      </button>
      <button onClick={handleDownloadImage} style={btnStyle}>
        <DownloadIcon /> {saved ? 'Saved ✓' : 'Save Image'}
      </button>
      <button onClick={handleCopyLink} style={btnStyle}>
        <LinkIcon /> {copied ? 'Copied ✓' : 'Copy Link'}
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
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

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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
