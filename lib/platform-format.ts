export interface PlatformFormats {
  chatgpt: {
    field1: string;
    field2: string;
  };
  claude: string;
  gemini: {
    gem: string;
    prefs: string;
  };
}

export function formatForPlatforms(bootfileText: string): PlatformFormats {
  return {
    chatgpt: formatForChatGPT(bootfileText),
    claude: formatForClaude(bootfileText),
    gemini: formatForGemini(bootfileText),
  };
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=###|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function formatForChatGPT(text: string): { field1: string; field2: string } {
  const aboutMe = extractSection(text, 'About Me');
  const howIThink = extractSection(text, 'How I Think');
  const commRules = extractSection(text, 'Communication Rules');
  const formatPrefs = extractSection(text, 'Format Preferences');
  const neverDoThis = extractSection(text, 'Never Do This');

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
  return `These are my standing communication preferences. Apply them to every conversation by default.\n\n${text}`;
}

function formatForGemini(text: string): { gem: string; prefs: string } {
  const gem = text;

  const aboutMe = extractSection(text, 'About Me');
  const commRules = extractSection(text, 'Communication Rules');
  const neverDoThis = extractSection(text, 'Never Do This');

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
