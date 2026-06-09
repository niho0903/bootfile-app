import { describe, expect, it } from 'vitest';
import { calculateResult, calculateScores } from './scoring';
import { ARCHETYPE_IDS, ArchetypeId, QUESTIONS } from './questions';
import { FIXTURES } from './scoring.fixtures';

/**
 * Archetype scoring test suite.
 *
 * Snapshots here encode product thesis. See CLAUDE.md Hard Rule #5.
 * Never run `vitest -u` in automation. Any snapshot diff requires human review.
 */

// Deterministic PRNG so Layer 2 is reproducible without external seed libraries.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAnswers(rand: () => number): Record<string, 'A' | 'B' | 'C' | 'D'> {
  const keys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  const answers: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
  for (const q of QUESTIONS) {
    answers[q.id] = keys[Math.floor(rand() * 4)];
  }
  return answers;
}

// ---------- Layer 1: Canonical personas ----------

describe('Layer 1 — canonical personas', () => {
  it.each(FIXTURES)('$name → primary = $expectedPrimary', (fx) => {
    const result = calculateResult(fx.answers);
    expect(result.primary).toBe(fx.expectedPrimary);
  });

  it('canonical fixtures snapshot (full result objects)', () => {
    const results = FIXTURES.map((fx) => ({
      name: fx.name,
      result: calculateResult(fx.answers),
    }));
    expect(results).toMatchSnapshot();
  });
});

// ---------- Layer 2: Distribution invariants ----------

describe('Layer 2 — distribution invariants over 1000 random vectors (seed=42)', () => {
  const rand = mulberry32(42);
  const primaryCounts: Record<ArchetypeId, number> = {
    surgeon: 0, architect: 0, sparring: 0, translator: 0,
    copilot: 0, librarian: 0, closer: 0, maker: 0,
  };
  let secondaryCount = 0;
  let tertiaryCount = 0;

  for (let i = 0; i < 1000; i++) {
    const answers = randomAnswers(rand);
    const result = calculateResult(answers);
    primaryCounts[result.primary]++;
    if (result.secondary) secondaryCount++;
    if (result.tertiary) tertiaryCount++;
  }

  it('every archetype wins primary at least 5% of the time', () => {
    for (const id of ARCHETYPE_IDS) {
      expect(primaryCounts[id], `${id} primary share`).toBeGreaterThanOrEqual(50);
    }
  });

  it('no archetype wins primary more than 30% of the time', () => {
    for (const id of ARCHETYPE_IDS) {
      expect(primaryCounts[id], `${id} primary share`).toBeLessThanOrEqual(300);
    }
  });

  it('distribution snapshot (primary counts + secondary/tertiary totals)', () => {
    expect({ primaryCounts, secondaryCount, tertiaryCount }).toMatchSnapshot();
  });
});

// ---------- Layer 3: Threshold invariants ----------

describe('Layer 3 — threshold invariants', () => {
  // Build a synthetic scores object via controlled answers is hard — calculateResult
  // operates on raw scores from calculateScores. We test the threshold logic by
  // constructing answer vectors that produce the target deltas.

  it('secondary present when Δ = 3 (boundary inclusive)', () => {
    // surgeon 12 (Q1A,Q3A,Q5C,Q7D) vs architect 9 (Q4A, Q6A, Q8D). Δ=3 → secondary=architect.
    const answers = { Q1: 'A', Q2: 'C', Q3: 'A', Q4: 'A', Q5: 'C', Q6: 'A', Q7: 'D', Q8: 'D' };
    const result = calculateResult(answers);
    const delta = result.scores[result.primary] - result.scores[result.secondary ?? result.primary];
    expect(result.primary).toBe('surgeon');
    expect(delta).toBeLessThanOrEqual(3);
    expect(result.secondary).not.toBeNull();
  });

  it('secondary null when Δ = 4 (just outside)', () => {
    // Construct Δ=4 between primary and runner-up.
    // surgeon 12 (Q1A,Q3A,Q5C,Q7D). architect 8 (Q4A, Q8D + Q2B 3, minus one → adjust).
    // Easier: put surgeon as 3-pt four times; fill rest with answers giving different archetypes ≤8.
    // Q2=A (translator 3, copilot 1), Q4=D (maker 3, librarian 1), Q6=B (librarian 3, architect 1), Q8=A (librarian 3, architect 1).
    // surgeon = 12, librarian = 1+3+3 = 7, maker = 1+3 = 4, translator = 3, architect = 1+1 = 2.
    // Δ = 12 - 7 = 5 → still tertiary. Want Δ=4: reduce surgeon or boost runner-up.
    // Use Q8=D (architect 3, sparring 1) instead of Q8=A: architect = 1+3 = 4, librarian = 3+3 = 6, surgeon stays 12 (Q7D gives architect+1 though).
    // Let's just compute what we have: pick Q2=A, Q4=D, Q6=B, Q8=A keeps librarian at 7. Δ=5.
    // Switch Q6=D (maker 3, copilot 1): librarian 3, maker 3+3=6, copilot 1+1=2, translator 3, architect 1.
    // Still Δ=6. Swap Q4=B (copilot 3, maker 1): maker 1+1=2, copilot 3+1=4, librarian 3, translator 3. Δ=12-4=8.
    // Want Δ=4: runner-up = 8. Put runner-up stacking: Q2=B(architect 3), Q4=A(architect 3), Q6=A(architect 3)... but then surgeon-only ques are only Q7D — surgeon=3+arch 1. architect=3+3+3=9, surgeon=3+3(Q3A surgeon)+3(Q5C surgeon)+3(Q7D surgeon)=12. Hmm let me redo.
    // Surgeon 3-pt: Q1A, Q3A, Q5C, Q7D (12 total, +Q7D gives architect+1 too).
    // Filler Q2, Q4, Q6, Q8 — stack on a single archetype for Δ=4:
    //   Q2B architect+3, Q4A architect+3, Q6A architect+3, Q8D architect+3 (=12). Δ=0.
    //   Drop one: Q2B, Q4A, Q6A, Q8A(librarian+3, architect+1) = architect 3+3+3+1+1(Q7D)=11. Δ=1.
    //   Q2B, Q4A, Q6D(maker+3, copilot+1), Q8D = architect 3+3+3+1=10. Δ=2.
    //   Q2B, Q4B(copilot+3, maker+1), Q6A, Q8D = arch 3+3+3+1=10. Δ=2.
    //   Q2B, Q4C(closer+3, maker+1), Q6A, Q8D = arch 3+3+3+1=10. Δ=2.
    //   Q2A(translator+3, copilot+1), Q4A, Q6A, Q8D = arch 3+3+3+1=10. Δ=2.
    //   Q2B, Q4A, Q6C(sparring+3), Q8D = arch 3+3+3+1=10. Δ=2.
    //   Q2C(closer+3, surgeon+1), Q4A, Q6A, Q8D = arch 3+3+3+1=10, surgeon 12+1=13. Δ=3.
    //   Q2A, Q4C(closer+3, maker+1), Q6A, Q8D = arch 3+3+1=7, surgeon 12. Δ=5.
    //   Q2B, Q4A, Q6A, Q8C(translator+3, copilot+1) = arch 3+3+3+1=10, translator 3. Δ=2.
    //   Q2B, Q4A, Q6A, Q8B(maker+3, surgeon+1) = arch 3+3+3+1=10, surgeon 13. Δ=3.
    // Want Δ=4. Boost runner-up to 9 with surgeon=13:
    //   Q2C(closer+3, surgeon+1) [surg 13], Q4A(arch+3), Q6A(arch+3), Q8D(arch+3, sparring+1). arch=3+3+3+1(Q7D)=10. Δ=13-10=3.
    //   Try Q2C, Q4B(copilot+3, maker+1), Q6A, Q8D: arch=3+1+3+1=8. surgeon=13. Δ=5.
    //   Q2A, Q4A, Q6A, Q8D: arch=3+3+3+1=10. surgeon=12. Δ=2.
    //   Q2A, Q4A, Q6B(librarian+3, arch+1), Q8D: arch=3+1+3+1=8. Δ=4. ✓
    const answers = { Q1: 'A', Q2: 'A', Q3: 'A', Q4: 'A', Q5: 'C', Q6: 'B', Q7: 'D', Q8: 'D' };
    const result = calculateResult(answers);
    expect(result.primary).toBe('surgeon');
    // Find the actual Δ to second-highest
    const sorted = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
    const delta = sorted[0][1] - sorted[1][1];
    expect(delta).toBe(4);
    expect(result.secondary).toBeNull();
  });

  it('tertiary present when Δ ≤ 5', () => {
    // Construct: architect 9, surgeon 9 (tie → alpha ASC picks architect primary, surgeon secondary Δ=0),
    // sparring 8 (Δ=1, tertiary present).
    //   Q1A: surg 3, maker 1, closer 1
    //   Q2B: arch 3
    //   Q3A: surg 3, spar 1
    //   Q4A: arch 3
    //   Q5C: surg 3
    //   Q6C: spar 3
    //   Q7A: spar 3, lib 1, closer 1
    //   Q8D: arch 3, spar 1
    // arch=9, surg=9, spar=1+3+3+1=8.
    const answers = { Q1: 'A', Q2: 'B', Q3: 'A', Q4: 'A', Q5: 'C', Q6: 'C', Q7: 'A', Q8: 'D' };
    const result = calculateResult(answers);
    expect(result.primary).toBe('architect');
    expect(result.secondary).toBe('surgeon');
    expect(result.tertiary).toBe('sparring');
  });

  it('tiebreaker is alphabetical ASC among equal scores', () => {
    // All-A answers: compute scores, primary should be alphabetically-first among top-scorers.
    const answers = { Q1: 'A', Q2: 'A', Q3: 'A', Q4: 'A', Q5: 'A', Q6: 'A', Q7: 'A', Q8: 'A' };
    const result = calculateResult(answers);
    // Verify primary is lexicographically ≤ any other archetype with equal score.
    const primaryScore = result.scores[result.primary];
    for (const id of ARCHETYPE_IDS) {
      if (result.scores[id] === primaryScore) {
        expect(result.primary.localeCompare(id)).toBeLessThanOrEqual(0);
      }
    }
  });
});

// ---------- Layer 4: Question-set integrity ----------

describe('Layer 4 — question-set integrity', () => {
  it('has exactly 8 questions', () => {
    expect(QUESTIONS).toHaveLength(8);
  });

  it('each question has 4 answers keyed A/B/C/D', () => {
    for (const q of QUESTIONS) {
      expect(Object.keys(q.answers).sort()).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('question IDs are Q1..Q8', () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']);
  });

  it('every scored archetype key is a valid ArchetypeId', () => {
    for (const q of QUESTIONS) {
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        for (const arch of Object.keys(q.answers[key].scores)) {
          expect(ARCHETYPE_IDS).toContain(arch as ArchetypeId);
        }
      }
    }
  });

  it('every archetype is the 3-point option in exactly 4 questions (balanced)', () => {
    const threePointCount: Record<ArchetypeId, number> = {
      surgeon: 0, architect: 0, sparring: 0, translator: 0,
      copilot: 0, librarian: 0, closer: 0, maker: 0,
    };
    for (const q of QUESTIONS) {
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        for (const [arch, pts] of Object.entries(q.answers[key].scores)) {
          if (pts === 3) threePointCount[arch as ArchetypeId]++;
        }
      }
    }
    for (const id of ARCHETYPE_IDS) {
      expect(threePointCount[id], `${id} 3-point count`).toBe(4);
    }
  });

  it('total point allocation across all answers is within ±20% per archetype', () => {
    const totals: Record<ArchetypeId, number> = {
      surgeon: 0, architect: 0, sparring: 0, translator: 0,
      copilot: 0, librarian: 0, closer: 0, maker: 0,
    };
    for (const q of QUESTIONS) {
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        for (const [arch, pts] of Object.entries(q.answers[key].scores)) {
          totals[arch as ArchetypeId] += pts;
        }
      }
    }
    const values = Object.values(totals);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    for (const id of ARCHETYPE_IDS) {
      const deviation = Math.abs(totals[id] - mean) / mean;
      expect(deviation, `${id} total deviation from mean (${totals[id]} vs ${mean})`).toBeLessThanOrEqual(0.2);
    }
  });

  it('calculateScores returns 0 for archetypes that score nothing (no undefineds)', () => {
    const scores = calculateScores({ Q1: 'A', Q2: 'B', Q3: 'A', Q4: 'A', Q5: 'C', Q6: 'A', Q7: 'D', Q8: 'D' });
    for (const id of ARCHETYPE_IDS) {
      expect(typeof scores[id]).toBe('number');
      expect(Number.isFinite(scores[id])).toBe(true);
    }
  });
});
