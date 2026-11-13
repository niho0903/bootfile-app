'use client';

import type { CSSProperties, ReactNode } from 'react';
import { FICTIONAL_BRAND_INPUT, buildBrandKit } from '@/lib/brand-kit/kit';
import { KIT_OUTPUTS } from '@/lib/brand-kit/deploy';

const EXAMPLE = buildBrandKit(FICTIONAL_BRAND_INPUT);

/** A plain frame that suggests where a piece is used. It imitates no real product. */
export function PlacementFrame({ label, children }: { label: string; children: ReactNode }) {
  return <figure className="brandFrame"><figcaption>{label}</figcaption><div className="brandFrameBody">{children}</div></figure>;
}

/**
 * The first screen. It shows what the owner will leave with and where each piece goes before it asks
 * for anything, and offers one way forward.
 */
export function BrandWelcome({ restored, onStart, onExample, fine }: { restored: boolean; onStart: () => void; onExample: () => void; fine: string }) {
  const style = { '--frame-bg': EXAMPLE.visuals.background, '--frame-ink': EXAMPLE.visuals.ink, '--frame-accent': EXAMPLE.visuals.accent, '--frame-button-ink': EXAMPLE.visuals.buttonInk } as CSSProperties;
  const email = EXAMPLE.firstCampaign.email;
  const post = EXAMPLE.firstCampaign.posts[0];
  return <>
    <section className="brandWelcome">
      <p className="brandEyebrow">BRAND &amp; AI KIT FOR SMALL BUSINESSES</p>
      <h1 id="brand-page-title" tabIndex={-1}>Answer a few questions.<br /><em>Leave with a brand you can use.</em></h1>
      <p className="brandLead">Tap through eight quick questions, tell us about your business, then pick a voice and colors. You get four things, each ready to paste where you already work.</p>
      <div className="brandActions"><button className="brandButton" onClick={onStart}>{restored ? 'Continue my brand kit' : 'Build my kit'} <span aria-hidden="true">→</span></button></div>
      <p className="brandFine">{fine}</p>
    </section>
    <section className="brandOutputs" aria-label="What you get and where it goes">
      {KIT_OUTPUTS.map((output, index) => <article key={output.name}><span>{index + 1}</span><h2>{output.name}</h2><p>{output.what}</p><p className="brandGoes"><b>Goes in</b> {output.goes}</p></article>)}
    </section>
    <section className="brandExample" aria-labelledby="brand-example-title" style={style}>
      <div className="brandExampleIntro"><p className="brandEyebrow">A FINISHED EXAMPLE</p><h2 id="brand-example-title">Here is one, for a fictional business.</h2><p>The words, colors and voice below come from the answers given for {EXAMPLE.business.name}. The grey blocks stand in for a photo and logo. They show where things go, not a design to copy.</p><button className="brandLinkButton" onClick={onExample}>Open the full example <span aria-hidden="true">→</span></button></div>
      <div className="brandFrames">
        <PlacementFrame label="In a customer's inbox"><div className="brandFrameEmail"><i className="brandPlaceholder" aria-hidden="true">LOGO</i><strong>{email.subject}</strong><p>{email.preview}</p><span className="brandFrameButton">{EXAMPLE.campaign.callToAction}</span></div></PlacementFrame>
        <PlacementFrame label="As a social post"><div className="brandFramePost"><i className="brandPlaceholder brandPlaceholderPhoto" aria-hidden="true">YOUR PHOTO HERE</i><strong>{post.headline}</strong><p>{EXAMPLE.business.name}</p></div></PlacementFrame>
        <PlacementFrame label="In your AI assistant"><div className="brandFrameChat"><p className="brandFrameBubble"><b>Pasted once:</b> instructions for {EXAMPLE.business.name}</p><p className="brandFrameBubble">Write a reminder for customers who asked about a kitchen reset.</p><div className="brandFrameReply"><i className="brandPlaceholder brandPlaceholderLines" aria-hidden="true">A DRAFT IN YOUR VOICE</i></div></div></PlacementFrame>
      </div>
    </section>
  </>;
}
