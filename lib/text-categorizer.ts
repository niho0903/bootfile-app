export type FrustrationCategory =
  | 'verbosity'
  | 'hedging'
  | 'hallucination'
  | 'ignoring_instructions'
  | 'over_simplification'
  | 'lack_of_depth'
  | 'repetition'
  | 'tone_mismatch'
  | 'unsolicited_advice'
  | 'slow_to_answer'
  | 'formatting_issues'
  | 'other';

export type Tone = 'direct' | 'collaborative' | 'formal' | 'casual';

const CATEGORY_PATTERNS: Record<FrustrationCategory, RegExp[]> = {
  verbosity: [
    /too (much|long|wordy|verbose)/i,
    /rambl/i,
    /get to the point/i,
    /wall of text/i,
    /unnecessar(y|ily) long/i,
    /over.?explain/i,
  ],
  hedging: [
    /hedge|hedging/i,
    /wishy.?washy/i,
    /non.?committal/i,
    /won'?t (commit|take a stance)/i,
    /too many caveat/i,
    /just (say|tell|give)/i,
    /stop saying "it depends"/i,
  ],
  hallucination: [
    /hallucin/i,
    /make(s)? (stuff|things) up/i,
    /invent(s|ed|ing)? (fact|info|thing)/i,
    /confiden(t|tly) wrong/i,
    /fabricat/i,
    /fake (source|citation|reference)/i,
  ],
  ignoring_instructions: [
    /ignor(e|es|ing) (my |what I)/i,
    /didn'?t (follow|listen|read)/i,
    /doesn'?t (follow|listen)/i,
    /not (doing|following) what I (ask|said|told)/i,
    /miss(es|ed|ing) the point/i,
  ],
  over_simplification: [
    /over.?simplif/i,
    /dumbed? down/i,
    /too (basic|simple)/i,
    /treat(s|ing)? me like (a|an) (child|beginner|idiot)/i,
    /patroni(z|s)/i,
    /condescend/i,
  ],
  lack_of_depth: [
    /shallow/i,
    /surface.?level/i,
    /lack(s|ing)? depth/i,
    /not (detailed|specific|thorough) enough/i,
    /want(s)? more detail/i,
    /go(es)? deeper/i,
  ],
  repetition: [
    /repeat(s|ing|ed)?/i,
    /same (thing|answer|response) (over|again)/i,
    /loop(s|ing)?/i,
    /broken record/i,
    /already (said|told|mentioned)/i,
  ],
  tone_mismatch: [
    /too (formal|casual|friendly|stiff|robotic)/i,
    /tone/i,
    /sounds? (like a|robotic|fake)/i,
    /cringe/i,
    /emoji/i,
    /exclamation/i,
    /too (enthusiastic|cheerful|perky)/i,
  ],
  unsolicited_advice: [
    /didn'?t ask/i,
    /unsolicited/i,
    /stop (suggesting|recommending|advising)/i,
    /just answer/i,
    /don'?t need (your )?(opinion|advice)/i,
  ],
  slow_to_answer: [
    /slow/i,
    /takes? (too|so) long/i,
    /get to (the|an) answer/i,
    /buried (the )?lead/i,
    /answer first/i,
    /bottom.?line/i,
  ],
  formatting_issues: [
    /format/i,
    /bullet/i,
    /markdown/i,
    /code block/i,
    /structure/i,
    /list(s)? (when|instead)/i,
    /heading/i,
  ],
  other: [],
};

export function categorizeOpenResponse(text: string): FrustrationCategory[] {
  if (!text || text.trim().length === 0) return [];

  const matched: FrustrationCategory[] = [];

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS) as [FrustrationCategory, RegExp[]][]) {
    if (category === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matched.push(category);
        break;
      }
    }
  }

  if (matched.length === 0) {
    matched.push('other');
  }

  return matched;
}

export function detectTone(text: string): Tone {
  const lower = text.toLowerCase();

  const directSignals = [
    /just/i, /stop/i, /don'?t/i, /hate/i, /annoy/i, /worst/i, /never/i,
    /!/, /shut up/i,
  ];
  const formalSignals = [
    /i would prefer/i, /it would be/i, /one might/i, /perhaps/i,
    /furthermore/i, /regarding/i, /respectively/i,
  ];
  const collaborativeSignals = [
    /we/i, /together/i, /help me/i, /i think/i, /maybe we/i,
    /let'?s/i, /partner/i,
  ];
  const casualSignals = [
    /lol/i, /haha/i, /tbh/i, /kinda/i, /sorta/i, /gonna/i,
    /ngl/i, /imo/i, /fr/i, /bruh/i, /like,/i,
  ];

  const scores: Record<Tone, number> = {
    direct: 0,
    formal: 0,
    collaborative: 0,
    casual: 0,
  };

  for (const pat of directSignals) if (pat.test(lower)) scores.direct++;
  for (const pat of formalSignals) if (pat.test(lower)) scores.formal++;
  for (const pat of collaborativeSignals) if (pat.test(lower)) scores.collaborative++;
  for (const pat of casualSignals) if (pat.test(lower)) scores.casual++;

  const entries = Object.entries(scores) as [Tone, number][];
  entries.sort((a, b) => b[1] - a[1]);

  if (entries[0][1] === 0) return 'direct';
  return entries[0][0];
}
