import { ArchetypeId } from './questions';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  strengths: string[];
  blindSpots: string[];
  underPressure: string;
  worksWellWith: string;
  trap: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  surgeon: {
    id: 'surgeon',
    name: 'The Surgeon',
    tagline: 'Cut the fluff.',
    description: "You value precision above all else. When you ask a question, you want the answer, not a preamble, not caveats, not three paragraphs of context you didn't request. Your AI should be direct, concise, and confident enough to have an opinion rather than hedging with 'it depends.'",
    color: '#DC2626',
    icon: '✂️',
    strengths: [
      "Sees through verbal padding instantly — finds the actual claim under three paragraphs of setup.",
      "Forces clarity from others by refusing to engage with vague asks.",
      "Wastes nobody's time, including your own.",
      "Holds an opinion even when it's uncomfortable — won't hide behind 'it depends.'",
    ],
    blindSpots: [
      "Sometimes cuts so fast you miss context that would have changed the answer.",
      "Reads as cold to people who use preamble as a relationship signal.",
      "May undervalue work that requires patience and exploration.",
      "Confuses brevity for precision — a one-liner can still be wrong.",
    ],
    underPressure: "You compress too far. Decisions that needed nuance get reduced to binaries, and you defend the binary instead of revisiting whether the binary was the right framing.",
    worksWellWith: "Architects, who build the frame you cut through, and Makers, who ship the version you specified. Expect friction with Librarians, who you experience as drowning the signal in source material.",
    trap: "Mistaking decisiveness for being right. The Surgeon's fastest path is also the path that breaks when the question turns out to be more interesting than it looked.",
  },
  architect: {
    id: 'architect',
    name: 'The Architect',
    tagline: 'Show me the whole board.',
    description: "You think in systems and structures. Before you act, you need to see how all the pieces connect. Your AI should build frameworks, show its reasoning chain, and help you map the full landscape before narrowing to a decision.",
    color: '#2563EB',
    icon: '🏛️',
    strengths: [
      "Sees how today's decision constrains tomorrow's options.",
      "Surfaces second-order effects that linear thinkers miss.",
      "Builds reusable mental models — once is enough for the pattern.",
      "Stress-tests plans by mapping where they fail before they ship.",
    ],
    blindSpots: [
      "Frameworks become procrastination — endless mapping, no execution.",
      "Treats messy reality as a design flaw instead of as terrain.",
      "Over-engineers for futures that never arrive.",
      "Can lose people who don't share your appetite for structure.",
    ],
    underPressure: "You retreat into more analysis. When clarity matters most, you build another framework and call it progress.",
    worksWellWith: "Closers, who force your framework into a decision, and Makers, who execute against your structure. Expect friction with Co-Pilots, who you experience as too loose and unstructured.",
    trap: "Mistaking model complexity for understanding. The Architect builds beautiful systems for problems that wanted a phone call.",
  },
  sparring: {
    id: 'sparring',
    name: 'The Sparring Partner',
    tagline: "Don't agree with me.",
    description: "You don't want a yes-machine. You want an AI that challenges your assumptions, finds the holes in your logic, and makes your thinking sharper through productive friction. Agreement is lazy. Pushback is useful.",
    color: '#D97706',
    icon: '🥊',
    strengths: [
      "Strengthens ideas through productive friction — your best thinking happens in argument.",
      "Spots weak reasoning fast, including your own.",
      "Builds trust by refusing to flatter.",
      "Tolerates discomfort that other archetypes avoid.",
    ],
    blindSpots: [
      "Argues with positions you actually agree with, just to stress-test them.",
      "Reads as contrarian, exhausting, or combative.",
      "Skips encouragement that other people need to keep going.",
      "Mistakes the strongest argument for the right answer.",
    ],
    underPressure: "You push harder. The cycle gets sharper until people stop bringing you their early-stage thinking — which is exactly the thinking that benefits most from pushback.",
    worksWellWith: "Surgeons, who match your speed and bluntness, and Librarians, who give you the source material to argue from. Expect friction with Translators, who soften the moment you want them to confront.",
    trap: "Confusing opposition with insight. Disagreeing with everything is as predictable as agreeing with everything.",
  },
  translator: {
    id: 'translator',
    name: 'The Translator',
    tagline: 'Make it click.',
    description: "You process complex ideas by converting them into simpler language, metaphors, and analogies. Your AI should explain things in ways that resonate, not in ways that sound impressive. Clarity over sophistication, every time.",
    color: '#059669',
    icon: '🔄',
    strengths: [
      "Makes complex ideas legible to non-experts without dumbing them down.",
      "Finds the analogy that turns confusion into understanding.",
      "Bridges disciplines by carrying ideas across vocabularies.",
      "Builds shared meaning in rooms where people are talking past each other.",
    ],
    blindSpots: [
      "The analogy becomes the idea — you defend the metaphor instead of the underlying point.",
      "Smooths over real disagreements by reframing them away.",
      "Can lose technical precision in pursuit of relatability.",
      "Underestimates audiences who actually want the unsimplified version.",
    ],
    underPressure: "You over-explain. When the room needs a decision, you keep generating new framings hoping one finally lands.",
    worksWellWith: "Architects, who give you the structure to translate, and Co-Pilots, who riff on your reframes. Expect friction with Surgeons, who you experience as cutting away the bridge before the audience has crossed it.",
    trap: "Mistaking 'they got it' for 'they agreed.' A good analogy lands the idea — it doesn't make the idea right.",
  },
  copilot: {
    id: 'copilot',
    name: 'The Co-Pilot',
    tagline: 'Think with me.',
    description: "You think out loud and want AI that keeps pace. Less formal, more collaborative, like a smart colleague who can riff on half-formed ideas without needing perfectly structured prompts. You finish each other's sentences.",
    color: '#7C3AED',
    icon: '✈️',
    strengths: [
      "Generates ideas faster in dialogue than in solitude.",
      "Makes thinking visible — partners can intercept errors before they ossify.",
      "Builds momentum from energy that other archetypes burn through alone.",
      "Adapts mid-sentence to new information.",
    ],
    blindSpots: [
      "Mistakes the energy of conversation for the quality of the conclusion.",
      "Talks past the decision point — keeps riffing when the answer was already there.",
      "Leaves behind people who process internally.",
      "Outputs that look complete in conversation look thin on a second read.",
    ],
    underPressure: "You keep talking. The thinking-out-loud doesn't stop when it's time to decide; it intensifies, and the decision never gets made.",
    worksWellWith: "Sparring Partners, who tighten your loose riffs, and Makers, who turn your conversational sketches into artifacts. Expect friction with Librarians, who want depth where you want pace.",
    trap: "Conflating collaboration with thinking. Some thinking has to happen alone. A conversation is not a substitute for a quiet hour.",
  },
  librarian: {
    id: 'librarian',
    name: 'The Librarian',
    tagline: 'Give me everything.',
    description: "You want depth, nuance, and completeness. Don't pre-filter, don't summarize, don't leave things out because you think they're not relevant. Give you the full picture: sources, edge cases, caveats, context. You'll sort through it yourself.",
    color: '#0891B2',
    icon: '📚',
    strengths: [
      "Catches edge cases and exceptions that simpler thinkers miss.",
      "Builds knowledge that compounds over time — depth becomes leverage.",
      "Earns trust through evidence, not assertion.",
      "Comfortable in ambiguity — doesn't force closure before the picture is clear.",
    ],
    blindSpots: [
      "Collects context as a substitute for committing to a position.",
      "Drowns signal in volume — the right answer hides in the middle of forty caveats.",
      "Frustrates collaborators who needed a directional take an hour ago.",
      "Mistakes 'thorough' for 'right.'",
    ],
    underPressure: "You expand. The deadline calls for narrowing; you keep adding sources. The completeness becomes a hiding place from the decision.",
    worksWellWith: "Closers, who force your depth into action, and Architects, who give your detail a frame. Expect friction with Surgeons, who you experience as deciding before they've looked.",
    trap: "Confusing comprehensiveness with rigor. A thoughtful narrow answer beats an exhaustive vague one.",
  },
  closer: {
    id: 'closer',
    name: 'The Closer',
    tagline: 'Just tell me what to do.',
    description: "You want decisions, not options. Rank it, recommend it, tell you what you'd do in this situation. Show your work if you want, but lead with the answer. You can ask follow-ups, but you shouldn't have to ask 'so what should I actually do?'",
    color: '#E11D48',
    icon: '🎯',
    strengths: [
      "Converts ambiguity into action faster than anyone in the room.",
      "Holds responsibility for outcomes, not just analysis.",
      "Forces decisions that others would delay indefinitely.",
      "Comfortable being wrong publicly if it means moving forward.",
    ],
    blindSpots: [
      "Decides before the question is fully shaped — solves the wrong problem at speed.",
      "Treats discussion as friction instead of as input.",
      "Misses subtle objections because you're already moving.",
      "Trains collaborators to stop offering nuance because you'll override it.",
    ],
    underPressure: "You decide faster. The signal that you should pause to gather more input is the same signal that triggers you to commit.",
    worksWellWith: "Librarians, who load the context you decide from, and Architects, who frame the decision you close. Expect friction with Sparring Partners, who you experience as obstructing momentum with arguments.",
    trap: "Equating speed with leadership. A wrong decision shipped fast still has to be unshipped — which is slower than thinking first.",
  },
  maker: {
    id: 'maker',
    name: 'The Maker',
    tagline: 'Less talk, more output.',
    description: "You want things built, not discussed. Give you the draft, the code, the plan, the outline, the email. Then you'll iterate from there. Production over conversation. Shipping beats talking about shipping.",
    color: '#EA580C',
    icon: '⚡',
    strengths: [
      "Turns half-formed ideas into artifacts you can actually critique.",
      "Discovers what you actually think by building the first version.",
      "Beats analysis paralysis by making the cost of starting near zero.",
      "Generates the raw material that other archetypes refine.",
    ],
    blindSpots: [
      "Builds before understanding — your first three drafts are answers to the wrong question.",
      "Skips planning that would have saved 10x the build time.",
      "Treats artifacts as proof of thinking when sometimes they're a substitute for it.",
      "Underestimates how much rework the shortcut creates.",
    ],
    underPressure: "You ship more. The instinct to produce intensifies exactly when you should be slowing down to redefine the goal.",
    worksWellWith: "Architects, who frame what's worth building, and Sparring Partners, who push back on the draft. Expect friction with Librarians, who want context loaded before the first line.",
    trap: "Confusing motion with progress. Output is evidence of activity, not of value. Sometimes the highest-leverage move is to stop building.",
  },
};
