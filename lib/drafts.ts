import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Draft {
  id: string;
  channel: 'blog' | 'instagram';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  content: string;
  metadata: Record<string, unknown>;
}

const DRAFTS_DIR = path.join(process.cwd(), 'content', 'drafts');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveDraft(channel: 'blog' | 'instagram', content: string, metadata: Record<string, unknown> = {}): Draft {
  const dir = path.join(DRAFTS_DIR, channel);
  ensureDir(dir);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const draft: Draft = {
    id,
    channel,
    status: 'pending',
    createdAt: new Date().toISOString(),
    content,
    metadata,
  };

  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(draft, null, 2));
  return draft;
}

export function getDrafts(channel?: 'blog' | 'instagram', status?: string): Draft[] {
  const channels = channel ? [channel] : ['blog', 'instagram'];
  const drafts: Draft[] = [];

  for (const ch of channels) {
    const dir = path.join(DRAFTS_DIR, ch);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const draft = JSON.parse(raw) as Draft;
        if (!status || draft.status === status) {
          drafts.push(draft);
        }
      } catch {
        // skip malformed files
      }
    }
  }

  return drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getDraft(id: string): Draft | null {
  for (const channel of ['blog', 'instagram']) {
    const filePath = path.join(DRAFTS_DIR, channel, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Draft;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function updateDraft(id: string, updates: Partial<Pick<Draft, 'status' | 'content' | 'metadata'>>): Draft | null {
  const draft = getDraft(id);
  if (!draft) return null;

  const updated = { ...draft, ...updates };
  const filePath = path.join(DRAFTS_DIR, draft.channel, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export function publishBlogDraft(draft: Draft): string | null {
  if (draft.channel !== 'blog') return null;

  // Extract frontmatter and content from the draft
  const content = draft.content;

  // If the content already has frontmatter, write it directly
  // Otherwise, it's raw markdown from the AI — write as-is
  let slug: string;

  try {
    const { data } = matter(content);
    // Generate slug from title
    const title = (data.title as string) || 'untitled';
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  } catch {
    slug = `post-${Date.now()}`;
  }

  const blogDir = path.join(process.cwd(), 'content', 'blog');
  ensureDir(blogDir);

  const filePath = path.join(blogDir, `${slug}.md`);
  fs.writeFileSync(filePath, content);

  // Mark draft as approved
  updateDraft(draft.id, { status: 'approved' });

  return slug;
}
