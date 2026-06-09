import type { Draft } from './drafts';
import { getSupabaseAdmin } from './supabase';

/**
 * Supabase-backed content draft storage.
 *
 * Expected `content_drafts` schema:
 *   id          text primary key
 *   channel     text not null check (channel in ('blog','instagram'))
 *   status      text not null default 'pending' check (status in ('pending','approved','rejected'))
 *   content     text not null
 *   metadata    jsonb not null default '{}'::jsonb
 *   created_at  timestamptz not null default now()
 *   updated_at  timestamptz not null default now()
 *
 * create index content_drafts_channel_status_idx on content_drafts(channel, status, created_at desc);
 */

interface DraftRow {
  id: string;
  channel: 'blog' | 'instagram';
  status: 'pending' | 'approved' | 'rejected';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function rowToDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    createdAt: row.created_at,
    content: row.content,
    metadata: row.metadata ?? {},
  };
}

export async function saveDraftSupabase(
  channel: 'blog' | 'instagram',
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<Draft | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const { data, error } = await supabase
      .from('content_drafts')
      .insert({
        id,
        channel,
        status: 'pending',
        content,
        metadata,
      })
      .select('*')
      .single();

    if (error || !data) return null;
    return rowToDraft(data as DraftRow);
  } catch {
    return null;
  }
}

export async function getDraftsSupabase(
  channel?: 'blog' | 'instagram',
  status?: string,
): Promise<Draft[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    let query = supabase
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as DraftRow[]).map(rowToDraft);
  } catch {
    return [];
  }
}

export async function getDraftSupabase(id: string): Promise<Draft | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('content_drafts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToDraft(data as DraftRow);
  } catch {
    return null;
  }
}

export async function updateDraftSupabase(
  id: string,
  updates: Partial<Pick<Draft, 'status' | 'content' | 'metadata'>>,
): Promise<Draft | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.metadata !== undefined) patch.metadata = updates.metadata;

  try {
    const { data, error } = await supabase
      .from('content_drafts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) return null;
    return rowToDraft(data as DraftRow);
  } catch {
    return null;
  }
}
