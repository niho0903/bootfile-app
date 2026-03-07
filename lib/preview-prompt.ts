import { buildMetaPrompt } from './generation-prompt';
import type { ValidatedGenerateInputs } from './validation';

export function buildPreviewPrompt(inputs: ValidatedGenerateInputs): { systemPrompt: string; userMessage: string } {
  const { systemPrompt, userMessage } = buildMetaPrompt(inputs);

  // Replace the output structure section to request only About Me + How I Think
  const outputStructureMarker = '## Output Structure';
  const outputStructureIndex = systemPrompt.indexOf(outputStructureMarker);

  if (outputStructureIndex === -1) {
    // Fallback: append preview instruction
    return {
      systemPrompt: systemPrompt + '\n\nIMPORTANT: For this preview, generate ONLY the "Communication Rules" (5-8 bullet points) and "Quick Commands" (4-6 trigger phrases) sections. Do not generate any other sections.',
      userMessage,
    };
  }

  const previewOutputStructure = `## Output Structure

Generate ONLY these two sections for this preview:

### Communication Rules
5-8 bullet points. Specific, concrete, testable rules for every response. Each rule should be actionable — something the AI can follow in every interaction. Based on this user's thinking style and preferences.

### Quick Commands
4-6 trigger phrases. Short words or phrases the user can type to activate specific AI behaviors. Format: "trigger" = what the AI should do. Make them feel natural and useful for this user's workflow.

Output ONLY these two sections — no other sections, no meta-commentary, no preamble. Start directly with "### Communication Rules" and end after "### Quick Commands".`;

  const previewSystemPrompt = systemPrompt.slice(0, outputStructureIndex) + previewOutputStructure;

  return { systemPrompt: previewSystemPrompt, userMessage };
}
