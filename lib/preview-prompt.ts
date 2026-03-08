import type { ValidatedGenerateInputs } from './validation';

const ARCHETYPE_SUMMARIES: Record<string, string> = {
  surgeon: 'Precision-first. Leads with the answer. Cuts fluff. Values speed and directness.',
  architect: 'Systems thinker. Maps the whole picture before deciding. Values structure and tradeoffs.',
  sparring: 'Challenges assumptions. Steelmans opposing views. Values intellectual rigor.',
  translator: 'Clarity-first. Uses analogies. Layers complexity from simple to nuanced.',
  copilot: 'Collaborative. Builds on fragments. Informal, energetic, momentum-driven.',
  librarian: 'Completeness-driven. Wants full context, caveats, and competing explanations.',
  closer: 'Action-oriented. Leads with recommendations. Ranks options, hates indecision.',
  maker: 'Output-first. Produces artifacts immediately. Drafts before discussing.',
};

export function buildPreviewPrompt(inputs: ValidatedGenerateInputs): { systemPrompt: string; userMessage: string } {
  const primary = inputs.primaryArchetype;
  const secondary = inputs.secondaryArchetype;
  const primaryDesc = ARCHETYPE_SUMMARIES[primary] || '';
  const secondaryDesc = secondary ? ARCHETYPE_SUMMARIES[secondary] || '' : '';

  const systemPrompt = `You generate personalized AI instruction previews. Given a user's thinking style and preferences, produce two sections that show how their AI should behave.

The user's primary style: "${primary}" — ${primaryDesc}${secondary ? `\nSecondary style: "${secondary}" — ${secondaryDesc}` : ''}

Rules:
- Be specific and concrete, not generic
- Tailor to their domain and use cases
- Communication Rules should be testable behavioral instructions
- Quick Commands should feel natural for this person's workflow
- Write in second person imperatives ("Lead with the answer", not "The AI should lead with the answer")

Output EXACTLY these two sections, nothing else:

### Communication Rules
5-8 bullet points. Specific, actionable rules for every AI response.

### Quick Commands
4-6 trigger phrases. Format: "trigger" = what the AI does.

Start directly with "### Communication Rules". No preamble.`;

  const userMessage = `Domain: ${inputs.domain}${inputs.domainOther ? ` (${inputs.domainOther})` : ''}
Technical level: ${inputs.technicalLevel}/10
Primary uses: ${inputs.primaryUses.join(', ')}
Decision style: ${inputs.decisionStyle}
Response length preference: ${inputs.responseLength}
Pet peeves: ${inputs.petPeeves.join(', ') || 'none'}
${inputs.openDescription ? `In their own words: "${inputs.openDescription}"` : ''}

Generate the preview.`;

  return { systemPrompt, userMessage };
}
