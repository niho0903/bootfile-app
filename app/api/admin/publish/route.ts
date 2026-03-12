import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getDraft, publishBlogDraft } from '@/lib/drafts';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
    }

    const draft = getDraft(id);
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (draft.channel === 'blog') {
      const slug = publishBlogDraft(draft);
      if (!slug) {
        return NextResponse.json({ error: 'Failed to publish blog post' }, { status: 500 });
      }
      return NextResponse.json({ published: true, slug, url: `/blog/${slug}` });
    }

    if (draft.channel === 'instagram') {
      // Instagram publishing requires Meta API credentials
      // For now, mark as approved and return the content for manual posting
      const { updateDraft } = await import('@/lib/drafts');
      updateDraft(id, { status: 'approved' });

      return NextResponse.json({
        published: false,
        message: 'Instagram draft approved. Meta API publishing not yet configured — post manually.',
        content: draft.content,
      });
    }

    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
