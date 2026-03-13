import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const posts = files
    .map((f) => readPostFromFile(path.join(BLOG_DIR, f)))
    .filter((p): p is Post => p !== null && !!p.publishedAt);

  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): Post | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;
  return readPostFromFile(filePath) ?? undefined;
}
