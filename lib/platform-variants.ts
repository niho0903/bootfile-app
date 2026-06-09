/**
 * Multi-platform BootFile variants.
 *
 * The master BootFile is the canonical 9-section output from Sonnet. Each
 * platform variant is a Haiku-driven transform of the master into the format,
 * length, and tone expected by that platform's custom-instruction system.
 *
 * Stream protocol (see generate-full/route.ts):
 *   <master text>
 *   ---BOOTFILE-VARIANTS-START---
 *   {"chatgpt": "...", "claude": "...", ...}
 *   ---BOOTFILE-VARIANTS-END---
 */

export const VARIANTS_START_DELIMITER = '---BOOTFILE-VARIANTS-START---';
export const VARIANTS_END_DELIMITER = '---BOOTFILE-VARIANTS-END---';

export const PLATFORMS = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'copilot'] as const;
export type PlatformId = typeof PLATFORMS[number];

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  pasteLocation: string;
}

export const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    pasteLocation: 'Settings → Personalization → Custom Instructions',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    pasteLocation: 'Projects → Custom instructions',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    pasteLocation: 'Gems → Create a new Gem → Instructions',
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    pasteLocation: 'Settings → Customize Grok → Custom instructions',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    pasteLocation: 'Profile → Custom instructions',
  },
  copilot: {
    id: 'copilot',
    name: 'Copilot',
    pasteLocation: 'Settings → Personalization → Custom instructions',
  },
};

const PLATFORM_REQUIREMENTS: Record<PlatformId, string> = {
  chatgpt: `ChatGPT's "Custom Instructions" feature has TWO fields:
1. "What would you like ChatGPT to know about you to provide better responses?" (max 1500 characters)
2. "How would you like ChatGPT to respond?" (max 1500 characters)

Output two sections separated by a line containing exactly "---FIELD-SEPARATOR---".
- Section 1: biographical and cognitive context (draw from About Me, How I Think, How to Reason With Me).
- Section 2: response instructions (draw from Communication Rules, Format Preferences, Failure Detection, Never Do This, Quick Commands).

Each section MUST stay under 1500 characters. Be ruthlessly concise. Drop section headers; use natural paragraphs and crisp bullet lists.`,

  claude: `Claude Projects custom instructions support up to ~5000 characters and full markdown formatting. This is the canonical longest variant — preserve the structured 9-section format from the master with ### headers exactly as written.

Make minimal changes. Light tightening for brevity is fine, but the goal is fidelity to the master, not transformation. Keep under 5000 characters.`,

  gemini: `Gemini Gems use a single Instructions field (~3500 characters). The Gem framing is more personality-oriented than transactional.

Reformat the master into a single flowing document with light section dividers (use bold "Section Name:" labels rather than ### markdown headers, since Gemini renders cleaner that way). Open with a one-sentence identity framing that anchors the persona. Drop the most procedural sections (Quick Commands can be condensed into 2-3 trigger phrases inline). Keep under 3500 characters.`,

  grok: `Grok rewards conversational, punchy instructions. Custom-instruction field is ~2000 characters.

Compress the master into a tight, direct version. You may use slightly more colloquial language. CRITICAL: do NOT add humor, wit, or irreverence that was not in the source — match the user's tone, not Grok's brand voice. Strip section headers; use short paragraph blocks. Keep under 2000 characters.`,

  deepseek: `DeepSeek's custom-instruction field is ~2000 characters and rewards structured, technical instructions.

Compress the master to fit. Keep ### headers but only for the FIVE most load-bearing sections: How to Reason With Me, Communication Rules, Format Preferences, Never Do This, Quick Commands. Roll About Me / How I Think / Failure Detection into a brief opening preamble before the headers. Keep under 2000 characters.`,

  copilot: `Microsoft Copilot custom instructions are used in M365 professional contexts. Tone should be measurably more formal — no slang, no casual contractions where they'd read sloppy, no edge. Field is ~2500 characters.

Reformat the master into a professional variant. Maintain section structure with ### headers. Replace any informal phrasing with measured equivalents. Keep the substance of every rule, but soften the affect. Keep under 2500 characters.`,
};

function buildVariantSystemPrompt(platform: PlatformId): string {
  return `You transform a BootFile (a personalized AI instruction profile) for a specific platform's custom-instruction system.

You will receive a MASTER BOOTFILE (the canonical 9-section version, written for a specific person based on their cognitive archetype and context). Your job is to output a version optimized for ${PLATFORM_META[platform].name}.

PLATFORM-SPECIFIC REQUIREMENTS:
${PLATFORM_REQUIREMENTS[platform]}

GENERAL RULES:
- Output the transformed BootFile content ONLY. No preamble like "Here is..." or "I've reformatted..." — just the file.
- No markdown code fences around the output.
- Preserve every behavioral rule, never-do, and trigger phrase from the master, even if compressed. Do not drop substance.
- Match the master's voice exactly. Do not editorialize or add brand personality.
- The user will paste this directly into ${PLATFORM_META[platform].name}'s custom-instruction field. Your output is the final artifact.`;
}

async function callHaiku(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error('[VARIANT API ERROR]', platform_label_safe(systemPrompt), res.status);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) return null;

    return stripCodeFences(text.trim());
  } catch (err) {
    console.error('[VARIANT TRANSFORM ERROR]', err);
    return null;
  }
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
}

function platform_label_safe(systemPrompt: string): string {
  const match = systemPrompt.match(/optimized for (\w+)/);
  return match ? match[1] : 'unknown';
}

async function transformToPlatform(platform: PlatformId, masterText: string): Promise<string> {
  const systemPrompt = buildVariantSystemPrompt(platform);
  const variant = await callHaiku(systemPrompt, masterText);
  return variant ?? masterText;
}

export async function generateAllVariants(masterText: string): Promise<Record<PlatformId, string>> {
  const results = await Promise.all(
    PLATFORMS.map(async (p) => [p, await transformToPlatform(p, masterText)] as const)
  );
  return Object.fromEntries(results) as Record<PlatformId, string>;
}
