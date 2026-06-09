import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  getAllPostsSupabase,
  getPostBySlugSupabase,
  upsertBlogPostSupabase,
} from './blog-supabase';

export interface Post {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  body: string;
  meta_title?: string;
  meta_description?: string;
  target_query?: string;
  pillar?: string;
  author?: string; // archetype ID (e.g., 'surgeon', 'architect')
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function readPostFromFile(filePath: string): Post | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const slug = path.basename(filePath, '.md');

    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      publishedAt: data.publishedAt || '',
      updatedAt: data.updatedAt,
      body: content.trim(),
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      target_query: data.target_query,
      pillar: data.pillar,
      author: data.author,
    };
  } catch {
    return null;
  }
}

function getAllPostsFromFilesystem(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const posts = files
    .map((f) => readPostFromFile(path.join(BLOG_DIR, f)))
    .filter((p): p is Post => p !== null && !!p.publishedAt);

  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function getPostBySlugFromFilesystem(slug: string): Post | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;
  return readPostFromFile(filePath) ?? undefined;
}

/**
 * Reads all blog posts. Merges Supabase (authoritative) with the filesystem
 * during the migration parallel-read window. Supabase wins on slug collisions.
 *
 * After all posts are confirmed in Supabase, drop the filesystem fallback.
 */
export async function getAllPosts(): Promise<Post[]> {
  const [supabasePosts, fsPosts] = await Promise.all([
    getAllPostsSupabase(),
    Promise.resolve(getAllPostsFromFilesystem()),
  ]);

  const bySlug = new Map<string, Post>();
  for (const p of fsPosts) bySlug.set(p.slug, p);
  for (const p of supabasePosts) bySlug.set(p.slug, p);

  return [...bySlug.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const fromSupabase = await getPostBySlugSupabase(slug);
  if (fromSupabase) return fromSupabase;
  return getPostBySlugFromFilesystem(slug);
}

/** Backfill a filesystem post into Supabase. Used by the migration endpoint. */
export async function migrateBlogPostToSupabase(slug: string): Promise<boolean> {
  const post = getPostBySlugFromFilesystem(slug);
  if (!post) return false;
  return upsertBlogPostSupabase(post);
}

/** List all filesystem-only posts (not yet in Supabase). */
export async function getFilesystemOnlyPosts(): Promise<Post[]> {
  const supabasePosts = await getAllPostsSupabase();
  const supabaseSlugs = new Set(supabasePosts.map((p) => p.slug));
  return getAllPostsFromFilesystem().filter((p) => !supabaseSlugs.has(p.slug));
}
