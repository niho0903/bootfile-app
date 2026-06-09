/**
 * Canonical fixtures for scoring snapshot tests.
 *
 * Each "pure" fixture picks the target archetype's four 3-point answers
 * (12 base pts) and four filler answers spread across different other
 * archetypes so no secondary climbs into the Δ≤3 window.
 *
 * Stress fixtures exercise tie-breaking and threshold boundaries.
 *
 * Any change to a fixture's expected primary is a product decision.
 * See CLAUDE.md Hard Rule #5.
 */

export interface Fixture {
  name: string;
  expectedPrimary: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
}

// Per-archetype 3-point questions (verified against lib/questions.ts):
//   surgeon:    Q1A, Q3A, Q5C, Q7D
//   architect:  Q2B, Q4A, Q6A, Q8D
//   sparring:   Q1D, Q3B, Q6C, Q7A
//   translator: Q2A, Q3D, Q5D, Q8C
//   copilot:    Q1C, Q3C, Q4B, Q7C
//   librarian:  Q1B, Q5B, Q6B, Q8A
//   closer:     Q2C, Q4C, Q5A, Q7B
//   maker:      Q2D, Q4D, Q6D, Q8B

export const FIXTURES: Fixture[] = [
  {
    name: 'pure surgeon',
    expectedPrimary: 'surgeon',
    answers: { Q1: 'A', Q2: 'A', Q3: 'A', Q4: 'C', Q5: 'C', Q6: 'D', Q7: 'D', Q8: 'A' },
  },
  {
    name: 'pure architect',
    expectedPrimary: 'architect',
    answers: { Q1: 'D', Q2: 'B', Q3: 'C', Q4: 'A', Q5: 'A', Q6: 'A', Q7: 'B', Q8: 'D' },
  },
  {
    name: 'pure sparring',
    expectedPrimary: 'sparring',
    answers: { Q1: 'D', Q2: 'D', Q3: 'B', Q4: 'B', Q5: 'A', Q6: 'C', Q7: 'A', Q8: 'C' },
  },
  {
    name: 'pure translator',
    expectedPrimary: 'translator',
    answers: { Q1: 'B', Q2: 'A', Q3: 'D', Q4: 'A', Q5: 'D', Q6: 'C', Q7: 'B', Q8: 'C' },
  },
  {
    name: 'pure copilot',
    expectedPrimary: 'copilot',
    answers: { Q1: 'C', Q2: 'B', Q3: 'C', Q4: 'B', Q5: 'B', Q6: 'A', Q7: 'C', Q8: 'D' },
  },
  {
    name: 'pure librarian',
    expectedPrimary: 'librarian',
    answers: { Q1: 'B', Q2: 'A', Q3: 'A', Q4: 'D', Q5: 'B', Q6: 'B', Q7: 'B', Q8: 'A' },
  },
  {
    name: 'pure closer',
    expectedPrimary: 'closer',
    answers: { Q1: 'A', Q2: 'C', Q3: 'A', Q4: 'C', Q5: 'A', Q6: 'D', Q7: 'B', Q8: 'B' },
  },
  {
    name: 'pure maker',
    expectedPrimary: 'maker',
    answers: { Q1: 'A', Q2: 'D', Q3: 'C', Q4: 'D', Q5: 'B', Q6: 'D', Q7: 'B', Q8: 'B' },
  },
  // Stress fixtures — exercise non-trivial paths.
  {
    // Surgeon 3-pt: Q1A, Q3A, Q5C, Q7D (=12, +arch 1 from Q7D).
    // Architect 3-pt: Q4A, Q6A, Q8D (=9, +spar 1 from Q8D).
    // Result: surgeon 12, architect 10, Δ=2 → architect = secondary.
    name: 'close race: surgeon primary, architect in secondary range',
    expectedPrimary: 'surgeon',
    answers: { Q1: 'A', Q2: 'A', Q3: 'A', Q4: 'A', Q5: 'C', Q6: 'A', Q7: 'D', Q8: 'D' },
  },
  {
    // All-A answers — architect (7) and surgeon (7) tie; alphabetical ASC → architect wins.
    // Exercises the tiebreaker path deterministically.
    name: 'all A (tiebreaker exercise)',
    expectedPrimary: 'architect',
    answers: { Q1: 'A', Q2: 'A', Q3: 'A', Q4: 'A', Q5: 'A', Q6: 'A', Q7: 'A', Q8: 'A' },
  },
];
