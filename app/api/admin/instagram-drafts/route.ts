import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getDrafts, getDraft, updateDraft } from '@/lib/drafts';

export interface InstagramDraft {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  hook: string;
  caption: string;
  hashtags: string[];
  postType: string;
}

const TYPE_MAP: Record<string, string> = {
  'myth-bust': 'frustration',
  'tip': 'concept',
  'archetype-spotlight': 'archetype_card',
  'before-after': 'contrast',
  'frustration': 'frustration',
  'concept': 'concept',
  'archetype_card': 'archetype_card',
  'contrast': 'contrast',
  'product_moment': 'product_moment',
};

function toInstagramDraft(d: {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  metadata: Record<string, unknown>;
}): InstagramDraft {
  const meta = d.metadata || {};
  const contentType = (meta.contentType as string) ?? (meta.post_type as string) ?? 'frustration';
  return {
    id: d.id,
    status: d.status,
    createdAt: d.createdAt,
    hook: (meta.hook as string) ?? '',
    caption: (meta.caption as string) ?? '',
    hashtags: Array.isArray(meta.hashtags) ? (meta.hashtags as string[]) : [],
    postType: TYPE_MAP[contentType] || 'frustration',
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const all = await getDrafts('instagram', status);
  const drafts = all
    .map(toInstagramDraft)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ drafts });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, status, caption, hook } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const existing = await getDraft(id);
  if (!existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const updates: Parameters<typeof updateDraft>[1] = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    updates.status = status as 'pending' | 'approved' | 'rejected';
  }

  if (caption !== undefined || hook !== undefined) {
    const nextMeta = { ...existing.metadata };
    if (caption !== undefined) nextMeta.caption = caption;
    if (hook !== undefined) nextMeta.hook = hook;
    updates.metadata = nextMeta;

    const nextHook = (nextMeta.hook as string) ?? '';
    const nextCaption = (nextMeta.caption as string) ?? '';
    updates.content = [nextHook, nextCaption].filter(Boolean).join('\n\n');
  }

  const updated = await updateDraft(id, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
