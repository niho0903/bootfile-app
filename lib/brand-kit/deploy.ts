import { DESTINATION_NAMES, assistantInstructions, type BrandKit, type Destination } from './kit';

/**
 * Where each part of a kit goes, as short steps a business owner can follow.
 * Menu names were checked against current help pages on 2026-11-13. They change, so every
 * destination also carries a fallback that does not depend on a menu.
 */
export interface DeployDestination {
  id: Destination | 'canva' | 'email' | 'social';
  name: string;
  /** What this destination is for, in one line. */
  purpose: string;
  /** What the copy button puts on the clipboard. */
  copyLabel: string;
  copyText: string;
  steps: string[];
  /** What to do if a menu has moved or a plan does not include it. */
  fallback: string;
}
export interface DeployPlan { assistants: DeployDestination[]; others: DeployDestination[] }

export function brandColorLines(kit: Pick<BrandKit, 'visuals'>): string {
  return [`Background ${kit.visuals.background}`, `Text ${kit.visuals.ink}`, `Accent ${kit.visuals.accent}`].join('\n');
}

const PASTE_FIRST = 'Or paste the instructions as the first message of a new chat. That always works.';
/** Only menu paths confirmed on the product's own or current help pages are written out. Every other assistant gets the method that needs no menu. */
const SAVED_PLACE: Partial<Record<Destination, { step: string; finish: string; fallback: string }>> = {
  chatgpt: { step: 'In ChatGPT, open Settings, then Personalization, then Custom instructions.', finish: 'Paste, save, and start a new chat.', fallback: `Some plans limit how much text fits there. ${PASTE_FIRST}` },
  claude: { step: 'In Claude, create a project for your business and choose Set project instructions.', finish: 'Paste, save, and start a chat inside that project.', fallback: PASTE_FIRST },
  gemini: { step: 'On a computer, open gemini.google.com, choose Gems in the sidebar, then New Gem.', finish: 'Name it after your business, paste into Instructions, and save.', fallback: `Gems are created on the web, not in the phone app. ${PASTE_FIRST}` },
  grok: { step: 'In Grok, open Settings, then Customize, then Custom Instructions.', finish: 'Paste, save, and start a new chat.', fallback: `The space there is limited. ${PASTE_FIRST}` },
};

export function deployPlan(kit: BrandKit, includeOwner = false): DeployPlan {
  const instructions = assistantInstructions(kit, includeOwner);
  const assistants = (Object.keys(DESTINATION_NAMES) as Destination[]).map((id): DeployDestination => {
    const name = DESTINATION_NAMES[id];
    const saved = SAVED_PLACE[id];
    const label = id === 'other' ? 'your assistant' : name;
    return {
      id, name, purpose: `So ${label} writes for your business in your voice.`, copyLabel: 'AI instructions', copyText: instructions,
      steps: saved
        ? ['Copy your AI instructions.', saved.step, saved.finish]
        : ['Copy your AI instructions.', `Open a new chat in ${label} and paste them as your first message.`, 'Ask it to repeat back your audience and voice, then give it a real task.'],
      fallback: saved ? saved.fallback : 'If your assistant has a place for saved or custom instructions, paste the same text there so you do not have to repeat it.',
    };
  });
  return {
    assistants,
    others: [
      {
        id: 'canva', name: 'Canva', purpose: 'So every design starts in your colors.', copyLabel: 'Brand colors', copyText: brandColorLines(kit),
        steps: ['Copy your three brand colors.', 'In Canva, open Brand Kit and add each color code to your palette.', `Set your fonts when you design: ${kit.visuals.headingFont} for headings, ${kit.visuals.bodyFont} for body text.`],
        fallback: 'Canva Free keeps three brand colors. Saving fonts to a Brand Kit needs a paid Canva plan, and a font may be named differently there.',
      },
      {
        id: 'email', name: 'Your email tool', purpose: 'So your first customer email is ready to check and send.', copyLabel: 'Email draft', copyText: `Subject: ${kit.firstCampaign.email.subject}\n\n${kit.firstCampaign.email.body}`,
        steps: ['Copy the email draft.', 'Paste it into a new message or campaign in the tool you already use.', 'Check every fact, price, date and link, then send it yourself.'],
        fallback: 'Bootfile does not send anything for you.',
      },
      {
        id: 'social', name: 'Your social accounts', purpose: 'So you have three posts for the same offer.', copyLabel: 'Three post drafts', copyText: kit.firstCampaign.posts.map((post, index) => `Post ${index + 1}: ${post.role}\n${post.body}`).join('\n\n---\n\n'),
        steps: ['Copy the three post drafts.', 'Paste one into a new post on the account your customers follow.', 'Add your own photo, check the details, and post it yourself.'],
        fallback: 'Bootfile does not post anything for you.',
      },
    ],
  };
}

/** The opening screen's promise: what you get, what it is for, and where it goes. */
export const KIT_OUTPUTS = [
  { name: 'Your brand in plain words', what: 'Who you serve, what you offer and what sets you apart.', goes: 'Your website, bio and proposals' },
  { name: 'Your voice and look', what: 'How you sound, with your colors and fonts.', goes: 'Canva, and anyone who writes or designs for you' },
  { name: 'Instructions for your AI', what: 'One block that tells an AI assistant how to write for your business.', goes: 'ChatGPT, Claude, Gemini, Grok or the assistant you use' },
  { name: 'Your first campaign', what: 'One customer email and three social posts for a real offer.', goes: 'Your email tool and social accounts' },
] as const;
