export type PlatformId = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'deepseek' | 'copilot';

export interface PlatformFormats {
  chatgpt: { field1: string; field2: string };
  claude: string;
  gemini: { gem: string; prefs: string };
  grok: { field1: string; field2: string };
  deepseek: string;
  copilot: string;
}

export interface PlatformInstructions {
  steps: string[];
  testDriveUrl: string;
  testDriveLabel: string;
}

export const PLATFORM_INSTRUCTIONS: Record<PlatformId, PlatformInstructions> = {
  chatgpt: {
    steps: [
      'Go to ChatGPT and click your profile icon (bottom-left).',
      'Select Settings \u2192 Personalization \u2192 Custom Instructions.',
      'Paste Field 1 into "What would you like ChatGPT to know about you?"',
      'Paste Field 2 into "How would you like ChatGPT to respond?"',
      'Click Save.',
    ],
    testDriveUrl: 'https://chatgpt.com',
    testDriveLabel: 'Open ChatGPT',
  },
  claude: {
    steps: [
      'Go to Claude.ai and click your profile icon (bottom-left).',
      'Select Settings \u2192 Profile.',
      'Paste the full text into the "Custom Instructions" field.',
      'Click Save.',
    ],
    testDriveUrl: 'https://claude.ai',
    testDriveLabel: 'Open Claude',
  },
  gemini: {
    steps: [
      'Go to Gemini and open Settings \u2192 Extensions \u2192 Create a Gem.',
      'Paste the full version as Gem instructions.',
      'For quick setup, paste the condensed version into Settings \u2192 Preferences instead.',
    ],
    testDriveUrl: 'https://gemini.google.com',
    testDriveLabel: 'Open Gemini',
  },
  grok: {
    steps: [
      'Go to Grok (grok.com) and click your profile icon.',
      'Select Settings \u2192 Personalization.',
      'Paste Field 1 into "About You".',
      'Paste Field 2 into "Response Preferences".',
      'Click Save.',
    ],
    testDriveUrl: 'https://grok.com',
    testDriveLabel: 'Open Grok',
  },
  deepseek: {
    steps: [
      'Go to DeepSeek (chat.deepseek.com) and start a new conversation.',
      'Paste the full instruction block as your first message.',
      'DeepSeek will acknowledge and follow these preferences for the conversation.',
    ],
    testDriveUrl: 'https://chat.deepseek.com',
    testDriveLabel: 'Open DeepSeek',
  },
  copilot: {
    steps: [
      'Go to Microsoft Copilot (copilot.microsoft.com).',
      'Click on your profile \u2192 Settings \u2192 Personalization.',
      'Paste the text into the custom instructions field.',
      'Click Save.',
    ],
    testDriveUrl: 'https://copilot.microsoft.com',
    testDriveLabel: 'Open Copilot',
  },
};

export function formatForPlatforms(bootfileText: string): PlatformFormats {
  return {
    chatgpt: formatForChatGPT(bootfileText),
    claude: formatForClaude(bootfileText),
    gemini: formatForGemini(bootfileText),
    grok: formatForGrok(bootfileText),
    deepseek: formatForDeepSeek(bootfileText),
    copilot: formatForCopilot(bootfileText),
  };
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=###|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

/** Remove "Try This First" section — it's shown separately in the UI, not pasted as instructions */
function removeTryThisFirst(text: string): string {
  return text.replace(/###\s*Try This First\s*\n[\s\S]*?(?=###|$)/i, '').trim();
}

/** Extract "Try This First" section for separate display */
export function extractTryThisFirst(text: string): string {
  return extractSection(text, 'Try This First');
}

/** Extract "First Message" section for separate display */
export function extractFirstMessage(text: string): string {
  return extractSection(text, 'First Message');
}

function formatForChatGPT(text: string): { field1: string; field2: string } {
  const cleaned = removeTryThisFirst(text);
  const aboutMe = extractSection(cleaned, 'About Me');
  const howIThink = extractSection(cleaned, 'How I Think');
  const commRules = extractSection(cleaned, 'Communication Rules');
  const formatPrefs = extractSection(cleaned, 'Format Preferences');
  const neverDoThis = extractSection(cleaned, 'Never Do This');

  const aboutMeCondensed = condenseToSentences(aboutMe, 3);
  const howIThinkCondensed = condenseBullets(howIThink, 3);

  const field1Lines = [
    aboutMeCondensed,
    '',
    'How I think:',
    howIThinkCondensed,
  ];
  let field1 = field1Lines.join('\n').trim();

  if (field1.length > 1450) {
    field1 = field1.substring(0, 1447) + '...';
  }

  const field2Lines = [
    commRules,
    '',
    condenseFormatPrefs(formatPrefs),
    '',
    'Never do this:',
    neverDoThis,
  ];
  let field2 = field2Lines.join('\n').trim();

  if (field2.length > 1450) {
    const field2Alt = [commRules, '', 'Never do this:', neverDoThis].join('\n').trim();
    field2 = field2Alt.length > 1450 ? field2Alt.substring(0, 1447) + '...' : field2Alt;
  }

  return { field1, field2 };
}

function formatForClaude(text: string): string {
  const withoutTryThis = removeTryThisFirst(text);
  return `These are my standing communication preferences. Apply them to every conversation by default.\n\n${withoutTryThis}`;
}

function formatForGemini(text: string): { gem: string; prefs: string } {
  const cleaned = removeTryThisFirst(text);
  const gem = cleaned;

  const aboutMe = extractSection(cleaned, 'About Me');
  const commRules = extractSection(cleaned, 'Communication Rules');
  const neverDoThis = extractSection(cleaned, 'Never Do This');

  const aboutMeCondensed = condenseToSentences(aboutMe, 2);
  const commRulesCondensed = condenseBullets(commRules, 5);
  const neverDoThisCondensed = condenseBullets(neverDoThis, 4);

  const prefs = [
    aboutMeCondensed,
    '',
    commRulesCondensed,
    '',
    'Never do this:',
    neverDoThisCondensed,
  ].join('\n').trim();

  return { gem, prefs };
}

function formatForGrok(text: string): { field1: string; field2: string } {
  // Grok uses same 2-field structure as ChatGPT
  return formatForChatGPT(text);
}

function formatForDeepSeek(text: string): string {
  const cleaned = removeTryThisFirst(text);
  return `[System Instruction \u2014 User Communication Preferences]

Please read and acknowledge the following preferences, then apply them to all responses in this conversation.

---

${cleaned}

---

Please confirm you've read these preferences and will apply them going forward.`;
}

function formatForCopilot(text: string): string {
  const cleaned = removeTryThisFirst(text);
  const aboutMe = extractSection(cleaned, 'About Me');
  const howIThink = extractSection(cleaned, 'How I Think');
  const commRules = extractSection(cleaned, 'Communication Rules');
  const neverDoThis = extractSection(cleaned, 'Never Do This');

  const aboutMeCondensed = condenseToSentences(aboutMe, 2);
  const howIThinkCondensed = condenseBullets(howIThink, 3);
  const commRulesCondensed = condenseBullets(commRules, 4);
  const neverCondensed = condenseBullets(neverDoThis, 3);

  const parts = [
    aboutMeCondensed,
    '',
    'How I think:',
    howIThinkCondensed,
    '',
    'Communication rules:',
    commRulesCondensed,
    '',
    'Never do this:',
    neverCondensed,
  ];

  return parts.join('\n').trim();
}

function condenseToSentences(text: string, n: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, n).join(' ').trim();
}

function condenseBullets(text: string, n: number): string {
  const lines = text.split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^[*\u2022]/));
  return lines.slice(0, n).join('\n').trim();
}

function condenseFormatPrefs(text: string): string {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.slice(0, 2).join('\n');
}
