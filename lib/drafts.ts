import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  saveDraftSupabase,
  getDraftsSupabase,
  getDraftSupabase,
  updateDraftSupabase,
} from './drafts-supabase';
import { upsertBlogPostSupabase } from './blog-supabase';
import type { Post } from './blog';

export interface Draft {
  id: string;
  channel: 'blog' | 'instagram';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  content: string;
  metadata: Record<string, unknown>;
}

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');

// ─── Filesystem fallback (read-only during migration parallel-read window) ───

function getDraftsFromFilesystem(channel?: 'blog' | 'instagram', status?: string): Draft[] {
  const channels = channel ? [channel] : ['blog', 'instagram'];
  const drafts: Draft[] = [];

  for (const ch of channels) {
    const dir = path.join(DRAFTS_DIR, ch);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        const draft = normalizeFilesystemDraft(file, ch as 'blog' | 'instagram', parsed);
        if (!draft) continue;
        if (!status || status === 'all' || draft.status === status) {
          drafts.push(draft);
        }
      } catch {
        // skip malformed files
      }
    }
  }

  return drafts;
}

/**
 * Normalize a filesystem draft JSON payload to the canonical Draft shape.
 *
 * Two legacy shapes exist:
 *   - lib/drafts.ts shape: {id, channel, status, createdAt, content, metadata}
 *   - instagram-drafts shape: {hook, caption, hashtags, contentType, status}
 *
 * The Instagram shape gets folded into metadata so the canonical Draft
 * interface stays single. Hook + caption are joined into `content` for display.
 */
function normalizeFilesystemDraft(
  filename: string,
  channel: 'blog' | 'instagram',
  raw: Record<string, unknown>,
): Draft | null {
  if (typeof raw !== 'object' || raw === null) return null;

  // Already canonical shape?
  if ('id' in raw && 'channel' in raw && 'content' in raw && 'createdAt' in raw) {
    return raw as unknown as Draft;
  }

  // Instagram-legacy shape — fold structured fields into metadata.
  if (channel === 'instagram' && ('hook' in raw || 'caption' in raw)) {
    const id = filename.replace('.json', '');
    const dateMatch = id.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
    const createdAt = dateMatch
      ? `${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:${dateMatch[4]}Z`
      : new Date().toISOString();
    const hook = (raw.hook as string) ?? '';
    const caption = (raw.caption as string) ?? '';
    return {
      id,
      channel: 'instagram',
      status: ((raw.status as string) ?? 'pending') as Draft['status'],
      createdAt,
      content: [hook, caption].filter(Boolean).join('\n\n'),
      metadata: {
        hook,
        caption,
        hashtags: raw.hashtags ?? [],
        contentType: raw.contentType ?? raw.post_type ?? null,
      },
    };
  }

  return null;
}

function getDraftFromFilesystem(id: string): Draft | null {
  for (const channel of ['blog', 'instagram'] as const) {
    const filePath = path.join(DRAFTS_DIR, channel, `${id}.json`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return normalizeFilesystemDraft(`${id}.json`, channel, raw);
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Public API (Supabase-first, filesystem fallback during migration) ───

export async function saveDraft(
  channel: 'blog' | 'instagram',
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<Draft> {
  const saved = await saveDraftSupabase(channel, content, metadata);
  if (saved) return saved;

  // Should not happen in production (Supabase is required). Return a stub so
  // callers don't crash; the missing persistence will be logged elsewhere.
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel,
    status: 'pending',
    createdAt: new Date().toISOString(),
    content,
    metadata,
  };
}

export async function getDrafts(
  channel?: 'blog' | 'instagram',
  status?: string,
): Promise<Draft[]> {
  const [supabaseDrafts, fsDrafts] = await Promise.all([
    getDraftsSupabase(channel, status),
    Promise.resolve(getDraftsFromFilesystem(channel, status)),
  ]);

  const byId = new Map<string, Draft>();
  for (const d of fsDrafts) byId.set(d.id, d);
  for (const d of supabaseDrafts) byId.set(d.id, d);

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getDraft(id: string): Promise<Draft | null> {
  const fromSupabase = await getDraftSupabase(id);
  if (fromSupabase) return fromSupabase;
  return getDraftFromFilesystem(id);
}

export async function updateDraft(
  id: string,
  updates: Partial<Pick<Draft, 'status' | 'content' | 'metadata'>>,
): Promise<Draft | null> {
  return updateDraftSupabase(id, updates);
}

/**
 * Promote an approved blog draft into the live `blog_posts` table.
 * Returns the slug on success, null on failure.
 *
 * No filesystem writes. The historical `fs.writeFileSync` path was ephemeral on
 * Vercel — any new publish must hit Supabase or the post disappears at cold start.
 */
export async function publishBlogDraft(draft: Draft): Promise<string | null> {
  if (draft.channel !== 'blog') return null;

  const content = draft.content;
  let frontmatter: Record<string, unknown> = {};
  let body = content;
  let slug: string;

  try {
    const parsed = matter(content);
    frontmatter = parsed.data as Record<string, unknown>;
    body = parsed.content.trim();
    const title = (frontmatter.title as string) || 'untitled';
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  } catch {
    slug = `post-${Date.now()}`;
  }

  const post: Post = {
    slug,
    title: (frontmatter.title as string) ?? slug,
    description: (frontmatter.description as string) ?? '',
    publishedAt:
      (frontmatter.publishedAt as string) ?? new Date().toISOString().slice(0, 10),
    updatedAt: frontmatter.updatedAt as string | undefined,
    body,
    meta_title: frontmatter.meta_title as string | undefined,
    meta_description: frontmatter.meta_description as string | undefined,
    target_query: frontmatter.target_query as string | undefined,
    pillar: frontmatter.pillar as string | undefined,
    author: frontmatter.author as string | undefined,
  };

  const ok = await upsertBlogPostSupabase(post);
  if (!ok) return null;

  await updateDraft(draft.id, { status: 'approved' });
  return slug;
}
