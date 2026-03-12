import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getDrafts, getDraft, updateDraft } from '@/lib/drafts';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') as 'blog' | 'instagram' | null;
  const status = searchParams.get('status') || undefined;

  const drafts = getDrafts(channel || undefined, status);
  return NextResponse.json({ drafts });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, content } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
    }

    const existing = getDraft(id);
    if (!existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const updates: Partial<Pick<import('@/lib/drafts').Draft, 'status' | 'content'>> = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      updates.status = status as 'pending' | 'approved' | 'rejected';
    }
    if (content !== undefined) updates.content = content;

    const updated = updateDraft(id, updates);
    return NextResponse.json({ draft: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
