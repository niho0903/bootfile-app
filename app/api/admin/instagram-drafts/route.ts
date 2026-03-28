import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

export interface InstagramDraft {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  hook: string;
  caption: string;
  hashtags: string[];
  postType: string;
}

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts', 'instagram');

// Map Growth Agent contentType to display-friendly post type
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

function readDrafts(status?: string): InstagramDraft[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];

  const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
  const drafts: InstagramDraft[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf-8'));
      const id = file.replace('.json', '');

      // Parse date from filename like "2026-03-24T12-00-12-myth-bust"
      const dateMatch = id.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
      const createdAt = dateMatch
        ? `${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:${dateMatch[4]}Z`
        : new Date().toISOString();

      const draft: InstagramDraft = {
        id,
        status: raw.status || 'pending',
        createdAt,
        hook: raw.hook || '',
        caption: raw.caption || '',
        hashtags: raw.hashtags || [],
        postType: TYPE_MAP[raw.contentType || raw.post_type || 'frustration'] || 'frustration',
      };

      if (!status || status === 'all' || draft.status === status) {
        drafts.push(draft);
      }
    } catch {
      // skip malformed files
    }
  }

  return drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const drafts = readDrafts(status);

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

  const filePath = path.join(DRAFTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (status) raw.status = status;
    if (caption !== undefined) raw.caption = caption;
    if (hook !== undefined) raw.hook = hook;

    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
