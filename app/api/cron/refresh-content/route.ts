import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOG_SYSTEM_PROMPT } from '@/lib/content-prompts';
import { getWeeklyReport } from '@/lib/search-console';

const GITHUB_REPO = 'niho0903/bootfile-app';

/**
 * Content refresh cron — runs weekly (Wednesdays).
 * Identifies declining blog posts via Search Console and refreshes them.
 * Also updates posts that rank on page 2 (positions 8-20) to push them to page 1.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_AGENT_TOKEN;

  if (!anthropicKey || !githubToken) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  try {
    // 1. Get search performance data
    const report = await getWeeklyReport();
    if (!report) {
      return NextResponse.json({ skipped: true, reason: 'Search Console not configured' });
    }

    // 2. Find refresh candidates
    const candidates = findRefreshCandidates(report.pagePerformance);
    if (candidates.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No posts need refreshing' });
    }

    // 3. Pick the highest-priority candidate (1 per run to stay within limits)
    const target = candidates[0];
    const slug = extractSlugFromUrl(target.url);
    if (!slug) {
      return NextResponse.json({ error: 'Could not extract slug' }, { status: 500 });
    }

    // 4. Fetch the current post content from GitHub
    const currentContent = await fetchFileFromGitHub(githubToken, `content/blog/${slug}.md`);
    if (!currentContent) {
      return NextResponse.json({ error: `Post not found: ${slug}` }, { status: 404 });
    }

    // 5. Research current landscape for this topic via Perplexity
    const freshResearch = await researchForRefresh(slug, target.topQueries);

    // 6. Refresh the post via Claude
    const client = new Anthropic({ apiKey: anthropicKey });
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: BLOG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `REFRESH this existing blog post. Do NOT write a new post — update the existing one.

CURRENT POST:
${currentContent}

SEARCH PERFORMANCE:
- Current position: ${target.position.toFixed(1)}
- Clicks last week: ${target.clicks}
- Impressions: ${target.impressions}
- CTR: ${(target.ctr * 100).toFixed(1)}%
- Refresh reason: ${target.reason}
- Top queries driving traffic: ${target.topQueries.join(', ')}

${freshResearch ? `FRESH RESEARCH (use to update outdated information):\n${freshResearch}` : ''}

TODAY'S DATE: ${today}

INSTRUCTIONS:
1. Keep the same slug-friendly title (or improve slightly for CTR)
2. Update the "Last updated" date to today
3. Add an "updatedAt" field to the frontmatter with today's date (YYYY-MM-DD)
4. Refresh any outdated information, statistics, or model versions
5. Strengthen the opening summary (this is what LLMs cite)
6. If position is 8-20, add more depth to compete with page-1 results
7. Improve internal linking to other bootfile.ai blog posts
8. Keep the same author in frontmatter
9. Return the COMPLETE updated post with frontmatter`,
        },
      ],
    });

    const refreshed = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!refreshed) {
      return NextResponse.json({ error: 'Empty refresh' }, { status: 500 });
    }

    // 7. Commit the refreshed post
    const filePath = `content/blog/${slug}.md`;
    await commitToGitHub(
      githubToken,
      filePath,
      refreshed,
      `Refresh blog post: ${slug} (position ${target.position.toFixed(1)}, ${target.reason})`
    );

    console.log(`[CRON] Refreshed blog post: ${slug} (${target.reason})`);
    return NextResponse.json({
      refreshed: true,
      slug,
      reason: target.reason,
      position: target.position,
    });
  } catch (error) {
    console.error('[CRON] Content refresh error:', error);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}

interface RefreshCandidate {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  reason: string;
  priority: number;
  topQueries: string[];
}

function findRefreshCandidates(
  pages: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>
): RefreshCandidate[] {
  const candidates: RefreshCandidate[] = [];

  for (const page of pages) {
    const url = page.keys[0];
    // Only refresh blog posts
    if (!url.includes('/blog/')) continue;

    // Priority 1: Page 2 posts with decent impressions (positions 8-20)
    // These are close to page 1 and worth pushing up
    if (page.position >= 8 && page.position <= 20 && page.impressions >= 10) {
      candidates.push({
        ...page,
        url,
        reason: 'near page 1 — worth pushing up',
        priority: 1,
        topQueries: [],
      });
    }

    // Priority 2: Low CTR despite good position (position < 10 but CTR < 3%)
    // Title/description may need improvement
    if (page.position < 10 && page.ctr < 0.03 && page.impressions >= 20) {
      candidates.push({
        ...page,
        url,
        reason: 'low CTR despite good position — needs better title/meta',
        priority: 2,
        topQueries: [],
      });
    }

    // Priority 3: Declining traffic (handled by trending data — we use position as proxy)
    // Posts ranking above 20 with some impressions are losing ground
    if (page.position > 20 && page.impressions >= 5) {
      candidates.push({
        ...page,
        url,
        reason: 'ranking declining — needs content refresh',
        priority: 3,
        topQueries: [],
      });
    }
  }

  // Sort by priority, then by impressions (higher impression = bigger opportunity)
  return candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.impressions - a.impressions;
  });
}

function extractSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/blog\/(.+?)(?:\/)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function researchForRefresh(slug: string, topQueries: string[]): Promise<string> {
  const pplxKey = process.env.PERPLEXITY_API_KEY;
  if (!pplxKey) return '';

  const topic = slug.replace(/-/g, ' ');

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pplxKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `I'm refreshing a blog post about: "${topic}"
${topQueries.length > 0 ? `It currently ranks for: ${topQueries.join(', ')}` : ''}

What's changed recently about this topic? Give me:
1. Any new developments, releases, or updates
2. New statistics or data points
3. What the current top-ranking articles cover that mine might be missing
Keep it concise — bullet points only.`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

async function fetchFileFromGitHub(token: string, filePath: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return null;
    const data: { content: string } = await res.json();
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

async function commitToGitHub(
  token: string,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
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
  } catch { /* file doesn't exist */ }

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
