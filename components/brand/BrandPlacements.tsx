'use client';

import { useState, type CSSProperties } from 'react';
import { ARRANGEMENT_COUNT, colorLines, fontStack, placementsFor, type Placement, type PlacementSource } from '@/lib/brand-kit/placements';
import './placements.css';

function FrameContent({ id, source }: { id: Placement['id']; source: PlacementSource }) {
  if (id === 'inbox') return <><i className="kitPlaceHolder" aria-hidden="true">LOGO</i><strong>{source.email.subject}</strong><p>{source.email.preview}</p><span className="kitPlaceButton">{source.callToAction}</span></>;
  if (id === 'post') return <><i className="kitPlaceHolder photo" aria-hidden="true">YOUR PHOTO HERE</i><strong>{source.post.headline}</strong><p>{source.name}</p></>;
  if (id === 'profile') return <><i className="kitPlaceHolder avatar" aria-hidden="true">PHOTO</i><strong>{source.name}</strong><p>{source.line}</p><span className="kitPlaceButton">{source.callToAction}</span></>;
  return <><i className="kitPlaceHolder" aria-hidden="true">LOGO</i><strong>{source.name}</strong><p>{source.line}</p><small aria-hidden="true">PHONE · EMAIL · WEBSITE</small></>;
}

/**
 * Shows the kit in use. The words, colors and type are the owner's; the layout, photo and logo are
 * placeholders. Two arrangements of each placement sit side by side and a shuffle swaps them, so no
 * single arrangement reads as the design.
 */
export function BrandPlacements({ source, onCopy }: { source: PlacementSource; onCopy: (text: string, label: string) => void }) {
  const [offset, setOffset] = useState(0);
  const style = {
    '--place-bg': source.colors.background, '--place-ink': source.colors.ink, '--place-accent': source.colors.accent, '--place-button-ink': source.colors.buttonInk,
    '--place-heading': fontStack(source.fonts.heading, 'Georgia, serif'), '--place-body': fontStack(source.fonts.body, 'Arial, sans-serif'),
  } as CSSProperties;
  return (
    <section className="kitPlace" aria-labelledby="kit-place-title" style={style}>
      <div className="kitPlaceIntro">
        <p className="brandEyebrow kitPlaceEyebrow">SEE IT IN USE</p>
        <h2 id="kit-place-title">Your brand, where customers will meet it.</h2>
        <p>The words, colors and type are yours. The layout, photo and logo are placeholders. These are examples to start from, not designs to copy.</p>
      </div>
      <div className="kitPlaceActions">
        <button type="button" onClick={() => setOffset(current => (current + 1) % ARRANGEMENT_COUNT)}>Shuffle the layouts</button>
        <span role="status" aria-live="polite">Arrangement {offset + 1} of {ARRANGEMENT_COUNT}</span>
        <button type="button" onClick={() => onCopy(colorLines(source.colors), 'Brand colors')}>Copy colors for Canva</button>
      </div>
      <div className="kitPlaceGrid">
        {placementsFor(source).map(placement => <article key={placement.id}>
          <h3>{placement.label}</h3>
          <div className="kitPlacePair">{[0, 1].map(slot => <div key={slot} className={`kitPlaceShell${slot ? ' kitPlaceAlt' : ''}`}><div className={`kitPlaceFrame kitArr${(offset + slot) % ARRANGEMENT_COUNT}`} data-placement={placement.id}><FrameContent id={placement.id} source={source} /></div></div>)}</div>
          <button type="button" className="kitPlaceCopy" onClick={() => onCopy(placement.copyText, placement.copyLabel)}>Copy the words</button>
        </article>)}
      </div>
      <p className="kitPlaceNote">Example placements only. Nothing here has been sent, posted or printed, and none of it imitates a particular app.</p>
    </section>
  );
}
