import { ArchetypeId } from './questions';

export interface SupplementaryAnswers {
  domain: string;
  domainOther: string;
  technicalLevel: number;
  primaryUses: string[];
  decisionStyle: 'convergent' | 'analytical' | 'adversarial' | 'generative' | '';
  responseLength: 'short' | 'medium' | 'long' | '';
  petPeeves: string[];
  customAvoidances: string;
  openDescription: string;
}

export const DOMAIN_OPTIONS = [
  'Marketing', 'Engineering', 'Finance', 'Legal', 'Education',
  'Healthcare', 'Creative', 'Product', 'Sales', 'Research',
  'Operations', 'Student', 'Personal', 'Freelance', 'Other',
];

export const PRIMARY_USE_OPTIONS = [
  'Writing & editing',
  'Research & analysis',
  'Coding & development',
  'Brainstorming & ideation',
  'Data analysis',
  'Strategy & planning',
  'Learning new topics',
  'Email & communication',
  'Personal projects',
  'Daily life & planning',
  'Creative work',
];

export const DECISION_STYLE_OPTIONS = [
  { label: 'Give me the recommendation and the one reason that matters', value: 'convergent' as const },
  { label: 'Show me the tradeoffs and let me decide', value: 'analytical' as const },
  { label: 'Challenge my current thinking first', value: 'adversarial' as const },
  { label: 'Help me think out loud until it clicks', value: 'generative' as const },
];

export const RESPONSE_LENGTH_OPTIONS = [
  { label: 'Short and sharp \u2014 just the answer', value: 'short' as const },
  { label: 'Enough to understand the reasoning', value: 'medium' as const },
  { label: 'Give me the full picture', value: 'long' as const },
];

export const PET_PEEVE_OPTIONS: Record<ArchetypeId, string[]> = {
  surgeon: ['Wasted time on preamble', 'Hedging instead of answering', 'Unnecessary caveats', 'Restating my question back to me'],
  architect: ['Missing the big picture', 'Unstructured thinking', 'No reasoning shown', 'Jumping to conclusions'],
  sparring: ['Being too agreeable', 'Not challenging weak logic', 'Superficial analysis', 'Avoiding controversy'],
  translator: ['Jargon-heavy responses', 'Overly academic tone', 'Assuming expertise I don\'t have', 'Abstract when I need concrete'],
  copilot: ['Being too formal', 'Requiring perfect prompts', 'Not building on my ideas', 'Treating every response as final'],
  librarian: ['Leaving out important details', 'Oversimplifying', 'Not citing reasoning', 'Pre-filtering information'],
  closer: ['Listing options without ranking', 'Saying "it depends"', 'Not committing to a recommendation', 'Burying the answer'],
  maker: ['Too much conversation, not enough output', 'Asking clarifying questions when context is obvious', 'Over-explaining', 'Not producing a draft'],
};
