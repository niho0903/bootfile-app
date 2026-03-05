import { ARCHETYPE_IDS, ArchetypeId, QUESTIONS } from './questions';

export interface QuizResult {
  scores: Record<ArchetypeId, number>;
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  tertiary: ArchetypeId | null;
  lowest: ArchetypeId[];
}

export function calculateScores(answers: Record<string, string>): Record<ArchetypeId, number> {
  const scores: Record<ArchetypeId, number> = {
    surgeon: 0, architect: 0, sparring: 0, translator: 0,
    copilot: 0, librarian: 0, closer: 0, maker: 0,
  };

  for (const question of QUESTIONS) {
    const answerKey = answers[question.id] as 'A' | 'B' | 'C' | 'D' | undefined;
    if (!answerKey) continue;
    const answer = question.answers[answerKey];
    for (const [archetype, points] of Object.entries(answer.scores)) {
      scores[archetype as ArchetypeId] += points;
    }
  }

  return scores;
}

export function calculateResult(answers: Record<string, string>): QuizResult {
  const scores = calculateScores(answers);

  const sorted = (Object.entries(scores) as [ArchetypeId, number][]).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  const primary = sorted[0][0];
  const primaryScore = sorted[0][1];

  const secondaryEntry = sorted[1];
  const secondary = secondaryEntry && (primaryScore - secondaryEntry[1]) <= 3
    ? secondaryEntry[0]
    : null;

  const tertiaryEntry = sorted[2];
  const tertiary = tertiaryEntry && (primaryScore - tertiaryEntry[1]) <= 5
    ? tertiaryEntry[0]
    : null;

  const lowest = sorted.slice(-2).map(([id]) => id);

  return { scores, primary, secondary, tertiary, lowest };
}
