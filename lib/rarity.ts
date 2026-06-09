import { ARCHETYPE_IDS, ArchetypeId } from './questions';
import { getSupabaseAdmin } from './supabase';

/**
 * Minimum total quiz completions before any public-facing rarity copy is shown.
 * Below this, the gate stays closed and the UI must not display percentages.
 * Raise deliberately — this is a marketing-honesty floor, not a perf constant.
 */
export const RARITY_DISPLAY_THRESHOLD = 500;

export interface RarityState {
  unlocked: boolean;
  totalCompletions: number;
  threshold: number;
  snapshotDate: string | null;
  /** Archetype → share of primary results (0..1). Null when locked. */
  shares: Record<ArchetypeId, number> | null;
}

/**
 * Read the most recent rarity snapshot. Returns a locked state if the gating
 * threshold has not been met, or if the snapshot table has not been populated yet.
 * Never throws — degrades to locked on any DB error.
 */
export async function getLatestRarity(): Promise<RarityState> {
  const locked: RarityState = {
    unlocked: false,
    totalCompletions: 0,
    threshold: RARITY_DISPLAY_THRESHOLD,
    snapshotDate: null,
    shares: null,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return locked;

  try {
    const { data, error } = await supabase
      .from('rarity_snapshot')
      .select('snapshot_date, archetype_id, count, total_completions')
      .order('snapshot_date', { ascending: false })
      .limit(ARCHETYPE_IDS.length);

    if (error || !data || data.length === 0) return locked;

    // Rows are sorted desc by date — take the first batch for the latest date.
    const latestDate = data[0].snapshot_date as string;
    const latestRows = data.filter((r) => r.snapshot_date === latestDate);
    const total = latestRows[0]?.total_completions ?? 0;

    if (total < RARITY_DISPLAY_THRESHOLD) {
      return { ...locked, totalCompletions: total, snapshotDate: latestDate };
    }

    const shares: Record<ArchetypeId, number> = {
      surgeon: 0, architect: 0, sparring: 0, translator: 0,
      copilot: 0, librarian: 0, closer: 0, maker: 0,
    };
    for (const row of latestRows) {
      const id = row.archetype_id as ArchetypeId;
      if (!ARCHETYPE_IDS.includes(id)) continue;
      shares[id] = total > 0 ? (row.count as number) / total : 0;
    }

    return {
      unlocked: true,
      totalCompletions: total,
      threshold: RARITY_DISPLAY_THRESHOLD,
      snapshotDate: latestDate,
      shares,
    };
  } catch {
    return locked;
  }
}
