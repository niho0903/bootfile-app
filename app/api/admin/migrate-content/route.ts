import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getFilesystemOnlyPosts, migrateBlogPostToSupabase } from '@/lib/blog';

/**
 * One-shot migration: copy every filesystem-only blog post into Supabase.
 *
 * Idempotent — already-migrated slugs are filtered out by `getFilesystemOnlyPosts`.
 * Once the filesystem-fallback window closes, this endpoint can be deleted along
 * with `lib/blog.ts`'s `getAllPostsFromFilesystem` / `getPostBySlugFromFilesystem`.
 */
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pending = await getFilesystemOnlyPosts();
  const results: Array<{ slug: string; ok: boolean }> = [];

  for (const post of pending) {
    const ok = await migrateBlogPostToSupabase(post.slug);
    results.push({ slug: post.slug, ok });
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: results.length,
    succeeded,
    failed: failed.length,
    failedSlugs: failed.map((r) => r.slug),
  });
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pending = await getFilesystemOnlyPosts();
  return NextResponse.json({
    pendingCount: pending.length,
    pendingSlugs: pending.map((p) => p.slug),
  });
}
