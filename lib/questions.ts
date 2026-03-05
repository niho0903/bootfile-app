export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface Answer {
  text: string;
  scores: Partial<Record<ArchetypeId, number>>;
}

export interface Question {
  id: string;
  text: string;
  answers: Record<AnswerKey, Answer>;
}

export type ArchetypeId = 'surgeon' | 'architect' | 'sparring' | 'translator' | 'copilot' | 'librarian' | 'closer' | 'maker';

export const ARCHETYPE_IDS: ArchetypeId[] = ['surgeon', 'architect', 'sparring', 'translator', 'copilot', 'librarian', 'closer', 'maker'];

export const QUESTIONS: Question[] = [
  {
    id: 'Q1',
    text: "When someone sends you a long email, what's your first instinct?",
    answers: {
      A: { text: "Skim for the ask, reply in two sentences", scores: { surgeon: 3, maker: 1, closer: 1 } },
      B: { text: "Read the whole thing, then think before responding", scores: { librarian: 3 } },
      C: { text: "Forward it to someone else to deal with", scores: { copilot: 3 } },
      D: { text: "Reply with a question to narrow down what they actually need", scores: { sparring: 3 } },
    },
  },
  {
    id: 'Q2',
    text: "You're explaining something complicated to a friend. You tend to…",
    answers: {
      A: { text: "Use an analogy from something they already know", scores: { translator: 3, copilot: 1 } },
      B: { text: "Walk through it step by step, start to finish", scores: { architect: 3 } },
      C: { text: "Give them the bottom line and fill in details if they ask", scores: { closer: 3, surgeon: 1 } },
      D: { text: "Draw it out or show them visually", scores: { maker: 3, translator: 1 } },
    },
  },
  {
    id: 'Q3',
    text: "A coworker's idea has a fatal flaw. You…",
    answers: {
      A: { text: "Tell them directly and explain why", scores: { surgeon: 3, sparring: 1 } },
      B: { text: "Ask questions until they discover the flaw themselves", scores: { sparring: 3 } },
      C: { text: "Suggest a modification that fixes it without calling out the problem", scores: { copilot: 3, closer: 1 } },
      D: { text: "Depends entirely on my relationship with them", scores: { translator: 3, librarian: 1 } },
    },
  },
  {
    id: 'Q4',
    text: "Your ideal Saturday morning involves…",
    answers: {
      A: { text: "A plan. Coffee at 8, gym at 9, errands by 11", scores: { architect: 3 } },
      B: { text: "No plan. See what happens", scores: { copilot: 3, maker: 1 } },
      C: { text: "One anchor activity, everything else flexible", scores: { closer: 3, maker: 1 } },
      D: { text: "Whatever I didn't get to do during the week", scores: { maker: 3, librarian: 1 } },
    },
  },
  {
    id: 'Q5',
    text: "When you Google something, you typically…",
    answers: {
      A: { text: "Click the first result and move on", scores: { closer: 3, surgeon: 1 } },
      B: { text: "Open 5 tabs and compare", scores: { librarian: 3, architect: 1 } },
      C: { text: "Refine the search query 3 times before clicking anything", scores: { surgeon: 3 } },
      D: { text: "Ask someone who would know instead of searching", scores: { translator: 3, copilot: 1 } },
    },
  },
  {
    id: 'Q6',
    text: "How do you feel about bullet points?",
    answers: {
      A: { text: "Love them. Organize my life", scores: { architect: 3 } },
      B: { text: "Fine for some things, but I prefer paragraphs for real thinking", scores: { librarian: 3, architect: 1 } },
      C: { text: "They oversimplify everything", scores: { sparring: 3 } },
      D: { text: "I've never thought about this before", scores: { maker: 3, copilot: 1 } },
    },
  },
  {
    id: 'Q7',
    text: "When making a big decision, you trust…",
    answers: {
      A: { text: "Data and evidence above all else", scores: { sparring: 3, librarian: 1, closer: 1 } },
      B: { text: "My gut, refined by experience", scores: { closer: 3, maker: 1 } },
      C: { text: "Input from people I respect", scores: { copilot: 3, translator: 1 } },
      D: { text: "A framework or process I've developed", scores: { surgeon: 3, architect: 1 } },
    },
  },
  {
    id: 'Q8',
    text: "Pick the response style that would annoy you LEAST from an AI assistant:",
    answers: {
      A: { text: "A three-paragraph answer when you asked a yes/no question", scores: { librarian: 3, architect: 1 } },
      B: { text: "A one-word answer when you needed context", scores: { maker: 3, surgeon: 1 } },
      C: { text: 'An answer that starts with "Great question!"', scores: { translator: 3, copilot: 1 } },
      D: { text: "An answer that lists five options when you wanted one recommendation", scores: { architect: 3, sparring: 1 } },
    },
  },
];
