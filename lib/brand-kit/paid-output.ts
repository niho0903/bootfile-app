import { assistantInstructions } from './kit';
import { publicPaidBrandKit, type PaidBrandKit } from './synthesis';

/** Only the saved paid result is rendered. The local template campaign is never exported as paid copy. */
export function paidBrandMarkdown(kit: PaidBrandKit, scope: 'public' | 'private' = 'public'): string {
  const output = publicPaidBrandKit(kit);
  const { business, voice, visuals, campaign, synthesis } = output;
  const owner = scope === 'private' ? `\n## Private owner working preferences\n${kit.foundation.ownerPreferences.name}\n${kit.foundation.ownerPreferences.instruction}\n` : '';
  return `# ${business.name} — Bootfile Brand & AI Kit

Model-assisted draft based on customer-supplied facts. Review every claim before publishing. No independent business verification or destination installation is included.

## Brand foundation
${synthesis.positioning}

Business: ${business.description}
Audience: ${business.audience}
Customer-supplied difference: ${business.difference}
Customer-supplied evidence: ${business.supportingEvidence}

## Voice
Selected direction: ${voice.name}
Do:
${synthesis.voiceDo.map(rule => `- ${rule}`).join('\n')}
Avoid:
${synthesis.voiceAvoid.map(rule => `- ${rule}`).join('\n')}
Canva voice summary: ${voice.canvaSummary}

## Visual direction
${visuals.name}
Background: ${visuals.background}
Text: ${visuals.ink}
Accent: ${visuals.accent}
Text on accent: ${visuals.buttonInk}
Heading font: ${visuals.headingFont}
Body font: ${visuals.bodyFont}
Text/background contrast: ${visuals.textContrast.toFixed(2)}:1
The pairing check does not establish accessibility of every future design. Check font availability and licensing in each destination.

## First campaign — reconfirm before use
Offer: ${campaign.offer}
Facts supplied: ${campaign.facts}
Exact next step: ${campaign.callToAction}

### Customer email
Subject: ${synthesis.email.subject}
Preview: ${synthesis.email.preview}

${synthesis.email.body}

### Three social posts
${synthesis.posts.map((post, index) => `#### ${index + 1}. ${['Introduce the offer', 'Explain the fit', 'Invite the next step'][index]}\n${post.body}`).join('\n\n')}

## Source quotations
These quotations trace the draft to customer-supplied text; they do not independently verify it.
${synthesis.sourceNotes.map(note => `- ${note.field}: ${note.quote}`).join('\n')}

## Put the kit to work
${assistantInstructions(kit.foundation, scope === 'private')}

## Final review
${kit.foundation.reviewChecklist.map(item => `- [ ] ${item}`).join('\n')}
Nothing has been sent or published.\n${owner}`;
}

export function paidBrandJson(kit: PaidBrandKit, scope: 'public' | 'private' = 'public'): string {
  const output = publicPaidBrandKit(kit);
  return JSON.stringify(scope === 'private' ? { ...output, ownerPreferences: kit.foundation.ownerPreferences } : output, null, 2);
}

