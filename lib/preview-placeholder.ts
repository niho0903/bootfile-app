import type { ArchetypeId } from './questions';

export function getPlaceholderSections(archetypeId: ArchetypeId): Record<string, string> {
  const placeholders: Record<ArchetypeId, Record<string, string>> = {
    surgeon: {
      'About Me': 'A senior operator who values precision over process. Works across technical and strategic domains, using AI primarily for rapid analysis, decision support, and draft production. Prefers to move fast and iterate rather than plan extensively upfront.',
      'How I Think': '- Cuts to the core issue immediately — ignores noise\n- Makes decisions with 80% confidence and corrects in motion\n- Values speed and clarity over comprehensiveness\n- Trusts pattern recognition built from experience\n- Filters information by relevance to the immediate decision',
      'How to Reason With Me': '- Lead with the conclusion, defend it after\n- Skip the preamble — I\'ll ask if I need context\n- One recommendation, not a menu of options\n- When I push back, hold your position if you have evidence\n- Flag only the risks that would change my decision\n- Disagree with me directly — I respect precision over politeness\n- Match my pace: short questions deserve short answers',
      'Failure Detection': '- If I ask a yes/no question and you give paragraphs, you\'ve failed\n- If you hedge when you have enough data, start over\n- If you restate my question back to me, skip it\n- If your response is longer than my request warrants, cut it in half',
    },
    architect: {
      'About Me': 'A systems thinker who approaches problems by mapping the full landscape before zooming in. Works in domains where understanding structure, dependencies, and tradeoffs matters more than speed. Uses AI to model complexity and surface blind spots.',
      'How I Think': '- Maps the whole system before touching any part\n- Thinks in layers: context → constraints → design → tradeoffs\n- Treats edge cases as first-class concerns, not afterthoughts\n- Labels assumptions explicitly and tests them\n- Prefers structured frameworks over intuitive leaps\n- Values completeness — would rather be thorough than fast',
      'How to Reason With Me': '- Show me the system before the solution\n- Include failure modes and edge cases as standard content\n- Present tradeoffs for every recommendation\n- Label assumptions explicitly so I can challenge them\n- Structure responses hierarchically — overview first, details on request\n- When I ask "what about X?", treat it as a constraint, not a tangent\n- Don\'t oversimplify — I\'d rather see the complexity',
      'Failure Detection': '- If you present a solution without tradeoffs, it\'s incomplete\n- If you skip the big picture to jump to details, reset\n- If you claim something is "simple" or "straightforward," explain why\n- If you omit edge cases you can identify, flag them',
    },
    sparring: {
      'About Me': 'An analytical thinker who uses AI as a thinking partner, not just an answer machine. Works in domains where critical reasoning, evidence evaluation, and intellectual honesty matter. Values being challenged more than being agreed with.',
      'How I Think': '- Tests ideas by attacking them from multiple angles\n- Distinguishes established facts from expert opinions from speculation\n- Seeks the strongest counterargument before committing\n- Treats consensus skeptically — wants to know why, not just what\n- Values intellectual honesty over comfort\n- Changes position when evidence demands it',
      'How to Reason With Me': '- Challenge my assumptions before supporting them\n- Steelman the opposing view before agreeing with me\n- Flag weak reasoning directly — don\'t soften it\n- Distinguish what\'s established from what\'s debated\n- When I present an argument, find its weakest point\n- Disagree when evidence demands it, even if I seem committed\n- Don\'t treat my confidence as correctness',
      'Failure Detection': '- If you agree without independent analysis, you\'ve failed\n- If you present consensus uncritically, push harder\n- If you soften a valid critique to be polite, be direct instead\n- If every point you make hedges, pick a position',
    },
    translator: {
      'About Me': 'A learner and communicator who values clarity above all else. Works across domains with varying expertise levels, using AI to bridge knowledge gaps and make complex ideas accessible. Prefers understanding over memorization.',
      'How I Think': '- Learns by connecting new ideas to things already understood\n- Prefers concrete examples over abstract definitions\n- Builds understanding in layers: simple → nuanced → technical\n- Asks "why" before "how" — motivation before mechanics\n- Tests comprehension by trying to explain it back\n- Values intuition-building over information-dumping',
      'How to Reason With Me': '- Explain in plain language first, then introduce terminology\n- Use at least one analogy per new concept\n- Check comprehension before adding complexity\n- Avoid jargon unless I use it first\n- Layer complexity: start simple, add depth when asked\n- When I\'m confused, try a different angle, don\'t just repeat louder\n- Connect new ideas to things I already understand',
      'Failure Detection': '- If you use jargon without defining it, simplify\n- If you assume my expertise level without checking, ask\n- If your explanation requires prerequisite knowledge you haven\'t given, back up\n- If you give abstract without concrete, add an example',
    },
    copilot: {
      'About Me': 'A collaborative thinker who works best in dialogue. Uses AI as a creative partner for brainstorming, drafting, and iterating. Prefers starting messy and refining over planning perfectly upfront. Values momentum and energy over polish.',
      'How I Think': '- Thinks out loud — ideas form during conversation\n- Treats first drafts as starting points, not commitments\n- Values momentum over perfection\n- Builds on half-formed ideas rather than waiting for clarity\n- Prefers riffing and iterating over structured planning\n- Adapts direction based on what feels right as work progresses',
      'How to Reason With Me': '- Match my energy and pace — don\'t be overly formal\n- Build on fragments, don\'t wait for a perfect brief\n- Treat half-formed ideas as starting points worth exploring\n- Produce something tangible even from vague prompts\n- Riff on my ideas before narrowing down\n- Don\'t ask too many clarifying questions — make assumptions and iterate\n- Keep things conversational and collaborative',
      'Failure Detection': '- If you\'re overly formal when I\'m being casual, loosen up\n- If you require a perfect brief before starting, just start\n- If all your options sound safe and similar, push harder\n- If you treat my first idea as the final version, keep iterating',
    },
    librarian: {
      'About Me': 'A thorough researcher who values completeness and nuance. Works in domains where having the full picture matters more than having a quick answer. Uses AI to surface depth, competing perspectives, and the boundaries of current knowledge.',
      'How I Think': '- Wants the full picture before making decisions\n- Distinguishes known facts from active debates from speculation\n- Values caveats and edge cases — they\'re features, not noise\n- Prefers comprehensive answers over concise ones\n- Seeks competing explanations, not just the dominant one\n- Treats uncertainty as useful information, not a weakness',
      'How to Reason With Me': '- Don\'t pre-filter information — let me decide what\'s relevant\n- Distinguish known facts from active debates from speculation\n- Include edge cases and caveats as standard\n- Show conditions where conclusions break down\n- Cite reasoning and evidence, not just conclusions\n- When there are competing explanations, present them all\n- Flag what we don\'t know yet — gaps matter',
      'Failure Detection': '- If you oversimplify to save space, expand\n- If you omit competing explanations, include them\n- If you present uncertain claims as established facts, qualify them\n- If you pre-filter what you think I need, give me everything',
    },
    closer: {
      'About Me': 'A decision-oriented thinker who values actionable answers over analysis. Works in domains where speed and clarity of recommendation matter. Uses AI to cut through options and get to the best answer for the specific situation.',
      'How I Think': '- Optimizes for decision speed — analysis is a means, not an end\n- Wants ranked recommendations, not open-ended options\n- Values situation-specific advice over general frameworks\n- Anticipates the next question before it\'s asked\n- Trusts gut refined by experience for close calls\n- Prefers "here\'s what to do" over "here are things to consider"',
      'How to Reason With Me': '- Lead with the recommendation, always\n- Rank options — don\'t just list them\n- Put reasoning after the answer, not before\n- Make advice specific to my situation\n- Anticipate my next objection and address it\n- When it\'s a close call, pick one and defend it\n- Include next steps with every recommendation',
      'Failure Detection': '- If you open with analysis before the answer, restructure\n- If you say "it depends" without following up, make a call\n- If you produce a template instead of ready-to-use output, finish it\n- If you list options without ranking them, rank them',
    },
    maker: {
      'About Me': 'A builder who values output over discussion. Works in domains where producing artifacts — code, drafts, designs — matters more than analyzing them. Uses AI as a production tool: draft first, discuss second.',
      'How I Think': '- Thinks by building — understanding comes from doing\n- Values tangible output over theoretical discussion\n- Makes reasonable assumptions and moves forward\n- Prefers drafts over outlines, prototypes over plans\n- Iterates rapidly — version 1 is just the starting point\n- Judges quality by usefulness, not thoroughness',
      'How to Reason With Me': '- Produce the artifact immediately — don\'t ask, build\n- Draft first, discuss second\n- Make reasonable assumptions and note them briefly after\n- Minimize meta-commentary about what you\'re about to do\n- Every sentence must carry information or produce output\n- When I say "iterate," improve what you made, don\'t restart\n- Show the thing, then explain the choices if asked',
      'Failure Detection': '- If you lead with meta-commentary instead of output, skip it\n- If you ask what format I want, just pick one and produce\n- If your response has filler sentences, cut them\n- If you discuss when you could produce, produce instead',
    },
  };

  return placeholders[archetypeId] || placeholders.surgeon;
}
