import { assistantInstructions } from './kit';
import { publicPaidBrandKit, type PaidBrandKit } from './synthesis';

/** The heading that opens the owner-only part of the private copy. The acceptance script looks for it. */
export const PRIVATE_NOTES_HEADING = 'Private work-style notes';
/** The same notice the order page shows, so the file a customer saves says what the page said. */
export const PAID_KIT_NOTICE = 'This is a model-assisted draft built from the facts you supplied. It has not been independently verified. Check every claim before you publish anything. Nothing has been sent or published for you.';

/**
 * Only the saved paid result is rendered. The local template campaign is never exported as paid copy.
 * Headings and labels use the words on the order page. A saved file cannot be corrected later, so it
 * names no menu path; the order page carries the step-by-step version.
 */
export function paidBrandMarkdown(kit: PaidBrandKit, scope: 'public' | 'private' = 'public'): string {
  const output = publicPaidBrandKit(kit);
  const { business, voice, visuals, campaign, synthesis } = output;
  const owner = scope === 'private' ? `\n## ${PRIVATE_NOTES_HEADING}\nFor you only. Leave this part out when you share your brand guide.\n${kit.foundation.ownerPreferences.name}\n${kit.foundation.ownerPreferences.instruction}\n` : '';
  return `# ${business.name} — Bootfile Brand & AI Kit

${PAID_KIT_NOTICE} Setting it up in your own tools is done by you, using the steps below.

## Your brand
${synthesis.positioning}

What you do: ${business.description}
Who it is for: ${business.audience}
What sets you apart, as you told us: ${business.difference}
Evidence you supplied: ${business.supportingEvidence}

## Voice guide
Selected direction: ${voice.name}
Do:
${synthesis.voiceDo.map(rule => `- ${rule}`).join('\n')}
Avoid:
${synthesis.voiceAvoid.map(rule => `- ${rule}`).join('\n')}
Voice summary for Canva: ${voice.canvaSummary}

## Visual starter kit
${visuals.name}
Background: ${visuals.background}
Text: ${visuals.ink}
Accent: ${visuals.accent}
Text on accent: ${visuals.buttonInk}
Heading font: ${visuals.headingFont}
Body font: ${visuals.bodyFont}
Text on background contrast: ${visuals.textContrast.toFixed(2)}:1
A passing contrast check on this pairing does not make every later design accessible. Check that each font is available and licensed wherever you use it.

## First campaign — reconfirm before use
Offer: ${campaign.offer}
Facts you supplied: ${campaign.facts}
Exact next step: ${campaign.callToAction}

### Customer email
Subject: ${synthesis.email.subject}
Preview: ${synthesis.email.preview}

${synthesis.email.body}

### Three social posts
${synthesis.posts.map((post, index) => `#### ${index + 1}. ${['Introduce the offer', 'Explain the fit', 'Invite the next step'][index]}\n${post.body}`).join('\n\n')}

## Where each claim came from
These quotations trace the draft to the text you supplied. They do not verify it.
${synthesis.sourceNotes.map(note => `- ${note.field}: ${note.quote}`).join('\n')}

## Put it to work
1. Your AI assistant: copy the instructions below into your assistant's saved or custom instructions, or paste them as the first message of a new chat.
2. Canva: add the three color codes above to your brand colors.
3. Your email tool: paste the customer email into a new message, check every fact, price, date and link, then send it yourself.
4. Your social accounts: paste one post at a time, add your own photo, and post it yourself.
Your private order page walks through each of these and has a copy button for each one.

### Instructions for your AI assistant
${assistantInstructions(kit.foundation, scope === 'private')}

## Before you publish
${kit.foundation.reviewChecklist.map(item => `- [ ] ${item}`).join('\n')}
Nothing has been sent or published.\n${owner}`;
}

export function paidBrandJson(kit: PaidBrandKit, scope: 'public' | 'private' = 'public'): string {
  const output = publicPaidBrandKit(kit);
  return JSON.stringify(scope === 'private' ? { ...output, ownerPreferences: kit.foundation.ownerPreferences } : output, null, 2);
}
