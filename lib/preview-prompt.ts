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
      systemPrompt: systemPrompt + '\n\nIMPORTANT: For this preview, generate ONLY the "About Me" and "How I Think" sections. Do not generate any other sections.',
      userMessage,
    };
  }

  const previewOutputStructure = `## Output Structure

Generate ONLY these two sections for this preview:

### About Me
3-5 sentences. Context about who this person is — their domain, how they operate, what they use AI for. If they selected "Personal" or "Student" as their domain, frame this around their life context, not a corporate identity. Write so the AI understands who it's talking to.

### How I Think
4-6 bullet points. The user's cognitive and decision-making style. Facts ABOUT the user that the AI must internalize. Each bullet describes a thinking pattern with direct implications for AI behavior.

Output ONLY these two sections — no other sections, no meta-commentary, no preamble. Start directly with "### About Me" and end after "### How I Think".`;

  const previewSystemPrompt = systemPrompt.slice(0, outputStructureIndex) + previewOutputStructure;

  return { systemPrompt: previewSystemPrompt, userMessage };
}
