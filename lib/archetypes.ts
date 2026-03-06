import { ArchetypeId } from './questions';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  surgeon: {
    id: 'surgeon',
    name: 'The Surgeon',
    tagline: 'Cut the fluff.',
    description: "You value precision above all else. When you ask a question, you want the answer, not a preamble, not caveats, not three paragraphs of context you didn't request. Your AI should be direct, concise, and confident enough to have an opinion rather than hedging with 'it depends.'",
    color: '#DC2626',
    icon: '\u2702\uFE0F',
  },
  architect: {
    id: 'architect',
    name: 'The Architect',
    tagline: 'Show me the whole board.',
    description: "You think in systems and structures. Before you act, you need to see how all the pieces connect. Your AI should build frameworks, show its reasoning chain, and help you map the full landscape before narrowing to a decision.",
    color: '#2563EB',
    icon: '\uD83C\uDFDB\uFE0F',
  },
  sparring: {
    id: 'sparring',
    name: 'The Sparring Partner',
    tagline: "Don't agree with me.",
    description: "You don't want a yes-machine. You want an AI that challenges your assumptions, finds the holes in your logic, and makes your thinking sharper through productive friction. Agreement is lazy. Pushback is useful.",
    color: '#D97706',
    icon: '\uD83E\uDD4A',
  },
  translator: {
    id: 'translator',
    name: 'The Translator',
    tagline: 'Make it click.',
    description: "You process complex ideas by converting them into simpler language, metaphors, and analogies. Your AI should explain things in ways that resonate, not in ways that sound impressive. Clarity over sophistication, every time.",
    color: '#059669',
    icon: '\uD83D\uDD04',
  },
  copilot: {
    id: 'copilot',
    name: 'The Co-Pilot',
    tagline: 'Think with me.',
    description: "You think out loud and want AI that keeps pace. Less formal, more collaborative, like a smart colleague who can riff on half-formed ideas without needing perfectly structured prompts. You finish each other's sentences.",
    color: '#7C3AED',
    icon: '\u2708\uFE0F',
  },
  librarian: {
    id: 'librarian',
    name: 'The Librarian',
    tagline: 'Give me everything.',
    description: "You want depth, nuance, and completeness. Don't pre-filter, don't summarize, don't leave things out because you think they're not relevant. Give you the full picture: sources, edge cases, caveats, context. You'll sort through it yourself.",
    color: '#0891B2',
    icon: '\uD83D\uDCDA',
  },
  closer: {
    id: 'closer',
    name: 'The Closer',
    tagline: 'Just tell me what to do.',
    description: "You want decisions, not options. Rank it, recommend it, tell you what you'd do in this situation. Show your work if you want, but lead with the answer. You can ask follow-ups, but you shouldn't have to ask 'so what should I actually do?'",
    color: '#E11D48',
    icon: '\uD83C\uDFAF',
  },
  maker: {
    id: 'maker',
    name: 'The Maker',
    tagline: 'Less talk, more output.',
    description: "You want things built, not discussed. Give you the draft, the code, the plan, the outline, the email. Then you'll iterate from there. Production over conversation. Shipping beats talking about shipping.",
    color: '#EA580C',
    icon: '\u26A1',
  },
};
