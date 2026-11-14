import type { BrandKit } from './kit';
import type { PublicPaidBrandKit } from './synthesis';

/**
 * "Real brand, placeholder layout." A placement shows the owner's own words, colors and type inside a
 * plain frame, with everything they have not decided (photo, logo, arrangement) drawn as a placeholder.
 * Nothing here is generated, fetched or sent, and no frame imitates a real product.
 */
export interface PlacementSource {
  name: string;
  /** One line about the business, in the kit's own words. */
  line: string;
  callToAction: string;
  colors: { background: string; ink: string; accent: string; buttonInk: string };
  fonts: { heading: string; body: string };
  email: { subject: string; preview: string; body: string };
  post: { headline: string; body: string };
}
export interface Placement { id: 'inbox' | 'post' | 'profile' | 'card'; label: string; copyLabel: string; copyText: string }

/** How many arrangements each placement can be shown in. No one of them is "the design". */
export const ARRANGEMENT_COUNT = 3;

function clip(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), limit - 30)).replace(/[\s,;:.]+$/, '')}…`;
}

/** A font name is the owner's free text. Only letters, digits, spaces and hyphens reach a style. */
export function fontStack(name: string, fallback: string): string {
  const safe = name.replace(/[^A-Za-z0-9 -]/g, '').trim().slice(0, 60);
  return safe ? `"${safe}", ${fallback}` : fallback;
}

export function colorLines(colors: PlacementSource['colors']): string {
  return [`Background ${colors.background}`, `Text ${colors.ink}`, `Accent ${colors.accent}`].join('\n');
}

export function sourceFromKit(kit: BrandKit): PlacementSource {
  const { background, ink, accent, buttonInk, headingFont, bodyFont } = kit.visuals;
  return {
    name: kit.business.name, line: clip(kit.business.description, 140), callToAction: clip(kit.campaign.callToAction, 80),
    colors: { background, ink, accent, buttonInk }, fonts: { heading: headingFont, body: bodyFont },
    email: { subject: kit.firstCampaign.email.subject, preview: clip(kit.firstCampaign.email.preview, 150), body: kit.firstCampaign.email.body },
    post: { headline: clip(kit.firstCampaign.posts[0].headline, 90), body: kit.firstCampaign.posts[0].body },
  };
}

/** The paid kit fills the same frames with the drafted words. It is given the public kit only. */
export function sourceFromPaidKit(kit: PublicPaidBrandKit): PlacementSource {
  const { background, ink, accent, buttonInk, headingFont, bodyFont } = kit.visuals;
  return {
    name: kit.business.name, line: clip(kit.synthesis.positioning, 140), callToAction: clip(kit.campaign.callToAction, 80),
    colors: { background, ink, accent, buttonInk }, fonts: { heading: headingFont, body: bodyFont },
    email: { subject: kit.synthesis.email.subject, preview: clip(kit.synthesis.email.preview, 150), body: kit.synthesis.email.body },
    post: { headline: clip(kit.campaign.offer, 90), body: kit.synthesis.posts[0].body },
  };
}

export function placementsFor(source: PlacementSource): Placement[] {
  return [
    { id: 'inbox', label: 'In a customer’s inbox', copyLabel: 'Email words', copyText: `Subject: ${source.email.subject}\n\n${source.email.body}` },
    { id: 'post', label: 'As a social post', copyLabel: 'Post words', copyText: source.post.body },
    { id: 'profile', label: 'On your profile or link page', copyLabel: 'Profile words', copyText: `${source.name}\n${source.line}\n${source.callToAction}` },
    { id: 'card', label: 'On a printed card', copyLabel: 'Card words', copyText: `${source.name}\n${source.line}` },
  ];
}
