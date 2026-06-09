import { NextResponse } from 'next/server';
import { ARCHETYPE_IDS, ArchetypeId } from '@/lib/questions';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Nightly rarity snapshot.
 *
 * Aggregates `quiz_completions.primary_archetype` cumulative counts and upserts
 * one row per archetype per UTC day into `rarity_snapshot`. The public-facing
 * UI reads the latest snapshot via lib/rarity.ts, which keeps the display gated
 * below RARITY_DISPLAY_THRESHOLD.
 *
 * Expected `rarity_snapshot` schema:
 *   id                bigserial primary key
 *   snapshot_date     date not null
 *   archetype_id      text not null
 *   count             integer not null
 *   total_completions integer not null
 *   created_at        timestamptz not null default now()
 *   unique (snapshot_date, archetype_id)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('quiz_completions')
      .select('primary_archetype');

    if (error) {
      console.error('[RARITY] Read error:', error.message);
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    const counts: Record<ArchetypeId, number> = {
      surgeon: 0, architect: 0, sparring: 0, translator: 0,
      copilot: 0, librarian: 0, closer: 0, maker: 0,
    };
    let total = 0;
    for (const row of data || []) {
      const id = row.primary_archetype as ArchetypeId | null;
      if (!id || !ARCHETYPE_IDS.includes(id)) continue;
      counts[id]++;
      total++;
    }

    const snapshotDate = new Date().toISOString().slice(0, 10);
    const rows = ARCHETYPE_IDS.map((id) => ({
      snapshot_date: snapshotDate,
      archetype_id: id,
      count: counts[id],
      total_completions: total,
    }));

    const { error: upsertError } = await supabase
      .from('rarity_snapshot')
      .upsert(rows, { onConflict: 'snapshot_date,archetype_id' });

    if (upsertError) {
      console.error('[RARITY] Upsert error:', upsertError.message);
      return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      snapshotDate,
      totalCompletions: total,
      counts,
    });
  } catch (err) {
    console.error('[RARITY] Unexpected error:', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
