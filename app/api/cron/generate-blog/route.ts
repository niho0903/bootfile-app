import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOG_SYSTEM_PROMPT } from '@/lib/content-prompts';

const GITHUB_REPO = 'niho0903/bootfile-app';
const BLOG_DAYS: Record<string, string> = {
  '1': 'comparison', // Monday
  '4': 'guide',      // Thursday
};

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if today is a blog day (UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay().toString();
  const pillar = BLOG_DAYS[dayOfWeek];

  if (!pillar) {
    return NextResponse.json({ skipped: true, reason: `Not a blog day (day ${dayOfWeek})` });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_AGENT_TOKEN;

  if (!anthropicKey || !githubToken) {
    console.error('[CRON] Missing ANTHROPIC_API_KEY or GITHUB_AGENT_TOKEN');
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  try {
    // 1. Fetch existing blog posts from GitHub to avoid duplicates
    const existingPosts = await fetchExistingPostTitles(githubToken);

    // 2. Load upcoming topics from calendar.json in the repo
    const upcomingTopics = await fetchUpcomingTopics(githubToken);
    const topicHint = upcomingTopics.length > 0
      ? `Suggested topics (pick the best one or choose your own): ${upcomingTopics.join(', ')}`
      : 'Choose the highest-value topic for this pillar based on current AI trends.';

    // 3. Generate the blog post via Claude
    const today = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: BLOG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write a blog post.
Pillar: ${pillar}
${topicHint}
Existing articles (do NOT duplicate these, but link to relevant ones):
${existingPosts.map(t => `- ${t}`).join('\n') || 'None yet'}
Today's date: ${today}

Important: Include an "author" field in the frontmatter. Pick one of these archetype IDs that best matches the article's tone: surgeon, architect, sparring, translator, copilot, librarian, closer, maker`,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!content) {
      return NextResponse.json({ error: 'Empty generation' }, { status: 500 });
    }

    // 4. Extract slug from the generated markdown title
    const slug = extractSlug(content);
    if (!slug) {
      console.error('[CRON] Could not extract slug from generated content');
      return NextResponse.json({ error: 'Could not extract slug' }, { status: 500 });
    }

    // 5. Commit the file to GitHub (triggers Vercel redeploy)
    const filePath = `content/blog/${slug}.md`;
    await commitToGitHub(githubToken, filePath, content, `Add blog post: ${slug}`);

    console.log(`[CRON] Published blog post: ${slug}`);
    return NextResponse.json({ published: true, slug, pillar });
  } catch (error) {
    console.error('[CRON] Blog generation error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

function extractSlug(markdown: string): string | null {
  // Try to extract title from frontmatter
  const titleMatch = markdown.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch) {
    return titleMatch[1]
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }
  return `post-${Date.now()}`;
}

async function fetchExistingPostTitles(token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content/blog`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return [];
    const files: Array<{ name: string }> = await res.json();
    return files
      .filter(f => f.name.endsWith('.md'))
      .map(f => f.name.replace('.md', '').replace(/-/g, ' '));
  } catch {
    return [];
  }
}

async function fetchUpcomingTopics(token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content/calendar.json`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return [];
    const data: { content: string } = await res.json();
    const calendar = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    return calendar.upcoming_topics?.blog || [];
  } catch {
    return [];
  }
}

async function commitToGitHub(
  token: string,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  // Check if file already exists (get its sha)
  let sha: string | undefined;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (existing.ok) {
      const data: { sha: string } = await existing.json();
      sha = data.sha;
    }
  } catch { /* file doesn't exist, which is fine */ }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${error}`);
  }
}
