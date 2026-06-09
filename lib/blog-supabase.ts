import type { Post } from './blog';
import { getSupabaseAdmin } from './supabase';

/**
 * Supabase-backed blog post storage.
 *
 * Expected `blog_posts` schema:
 *   slug              text primary key
 *   title             text not null
 *   description       text not null default ''
 *   body              text not null
 *   published_at      date not null
 *   updated_at        timestamptz
 *   meta_title        text
 *   meta_description  text
 *   target_query      text
 *   pillar            text
 *   author            text
 *   created_at        timestamptz not null default now()
 *
 * create index blog_posts_published_at_idx on blog_posts(published_at desc);
 */

interface BlogPostRow {
  slug: string;
  title: string;
  description: string;
  body: string;
  published_at: string;
  updated_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  target_query: string | null;
  pillar: string | null;
  author: string | null;
}

function rowToPost(row: BlogPostRow): Post {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    publishedAt: row.published_at,
    updatedAt: row.updated_at ?? undefined,
    body: row.body,
    meta_title: row.meta_title ?? undefined,
    meta_description: row.meta_description ?? undefined,
    target_query: row.target_query ?? undefined,
    pillar: row.pillar ?? undefined,
    author: row.author ?? undefined,
  };
}

export async function getAllPostsSupabase(): Promise<Post[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !data) return [];
    return (data as BlogPostRow[]).map(rowToPost);
  } catch {
    return [];
  }
}

export async function getPostBySlugSupabase(slug: string): Promise<Post | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return undefined;
    return rowToPost(data as BlogPostRow);
  } catch {
    return undefined;
  }
}

export async function upsertBlogPostSupabase(post: Post): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('blog_posts')
      .upsert({
        slug: post.slug,
        title: post.title,
        description: post.description,
        body: post.body,
        published_at: post.publishedAt,
        updated_at: post.updatedAt ?? null,
        meta_title: post.meta_title ?? null,
        meta_description: post.meta_description ?? null,
        target_query: post.target_query ?? null,
        pillar: post.pillar ?? null,
        author: post.author ?? null,
      }, { onConflict: 'slug' });

    return !error;
  } catch {
    return false;
  }
}
