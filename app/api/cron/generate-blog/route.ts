import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BLOG_SYSTEM_PROMPT } from '@/lib/content-prompts';
import { getWeeklyReport } from '@/lib/search-console';

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
  const pillar = BLOG_DAYS[dayOfWeek] || 'guide';

  // Allow manual override via ?force=true
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';
  if (!pillar && !force) {
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

    // 3. Fetch recent author archetypes to enforce rotation
    const recentAuthors = await fetchRecentAuthors(githubToken);

    // 4. Research: keyword/trend data from Perplexity
    const trendResearch = await researchTopics(pillar, upcomingTopics);

    // 5. Search Console insights (what's already ranking, gaps)
    const gscInsights = await getSearchInsights();

    // 6. Build the content brief
    const today = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const brief = buildContentBrief({
      pillar,
      upcomingTopics,
      existingPosts,
      trendResearch,
      gscInsights,
      today,
      recentAuthors,
    });

    // 6. Generate the blog post via Claude
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: BLOG_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: brief }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!content) {
      return NextResponse.json({ error: 'Empty generation' }, { status: 500 });
    }

    // 7. Quality gate — score the post before publishing
    const qualityCheck = await scorePost(client, content, pillar);
    if (!qualityCheck.pass) {
      console.warn(`[CRON] Post failed quality gate (${qualityCheck.score}/10): ${qualityCheck.reason}`);
      // Regenerate once with feedback
      const retry = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: BLOG_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: brief },
          { role: 'assistant', content },
          {
            role: 'user',
            content: `This draft scored ${qualityCheck.score}/10. Issues: ${qualityCheck.reason}

Please rewrite the article addressing these issues. Return the full revised article with frontmatter.`,
          },
        ],
      });
      const revised = retry.content[0].type === 'text' ? retry.content[0].text : '';
      if (revised) {
        return await publishPost(revised, githubToken, pillar);
      }
    }

    // 8. Publish
    return await publishPost(content, githubToken, pillar);
  } catch (error) {
    console.error('[CRON] Blog generation error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

// --- Research ---

async function researchTopics(pillar: string, upcomingTopics: string[]): Promise<string> {
  const pplxKey = process.env.PERPLEXITY_API_KEY;
  if (!pplxKey) return '';

  try {
    const topicList = upcomingTopics.length > 0
      ? `Suggested topics: ${upcomingTopics.join(', ')}`
      : 'AI custom instructions, AI personalization, prompt engineering';

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
            content: `I'm writing a ${pillar} blog post for bootfile.ai (AI instruction profiles / custom instructions).

${topicList}

Research the current landscape:
1. What are people actively searching for related to these topics right now?
2. What specific search queries have high intent and low competition?
3. What recent developments or news would make a timely angle?
4. What questions are people asking on Reddit and forums about this topic?

Give me 3 specific article ideas with target search queries, ranked by opportunity. Be specific about the search queries — real phrases people type.`,
          },
        ],
        max_tokens: 800,
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

async function getSearchInsights(): Promise<string> {
  try {
    const report = await getWeeklyReport();
    if (!report) return '';

    const lines: string[] = [];

    if (report.topQueries.length > 0) {
      lines.push('QUERIES ALREADY RANKING (build on these):');
      for (const q of report.topQueries.slice(0, 10)) {
        lines.push(`  "${q.keys[0]}" — ${q.clicks} clicks, position ${q.position.toFixed(1)}`);
      }
    }

    if (report.queriesTrending.length > 0) {
      lines.push('\nTRENDING UP (capitalize on momentum):');
      for (const q of report.queriesTrending.slice(0, 5)) {
        lines.push(`  "${q.keys[0]}" — ${q.clicks} clicks`);
      }
    }

    if (report.queriesDeclining.length > 0) {
      lines.push('\nDECLINING (consider refreshing):');
      for (const q of report.queriesDeclining.slice(0, 5)) {
        lines.push(`  "${q.keys[0]}" — ${q.clicks} clicks`);
      }
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

// --- Content Brief ---

interface BriefInput {
  pillar: string;
  upcomingTopics: string[];
  existingPosts: string[];
  trendResearch: string;
  gscInsights: string;
  today: string;
  recentAuthors: string[];
}

function buildContentBrief(input: BriefInput): string {
  const sections: string[] = [];

  sections.push(`Write a blog post.
Pillar: ${input.pillar}
Today's date: ${input.today}`);

  if (input.trendResearch) {
    sections.push(`KEYWORD & TREND RESEARCH (use this to pick the best topic and target query):
${input.trendResearch}`);
  } else if (input.upcomingTopics.length > 0) {
    sections.push(`Suggested topics (pick the best one or choose your own): ${input.upcomingTopics.join(', ')}`);
  } else {
    sections.push('Choose the highest-value topic for this pillar based on current AI trends.');
  }

  if (input.gscInsights) {
    sections.push(`SEARCH CONSOLE DATA (our current search performance — use for internal linking and topic selection):
${input.gscInsights}`);
  }

  sections.push(`Existing articles (do NOT duplicate these, but link to relevant ones):
${input.existingPosts.map(t => `- ${t}`).join('\n') || 'None yet'}`);

  const allArchetypes = ['surgeon', 'architect', 'sparring', 'translator', 'copilot', 'librarian', 'closer', 'maker'];
  const avoid = input.recentAuthors.slice(0, 3);
  const preferred = allArchetypes.filter(a => !avoid.includes(a));

  sections.push(`Important:
- Include an "author" field in the frontmatter. You MUST pick from these archetype IDs: ${preferred.join(', ')}
- Do NOT use these archetypes (used in recent posts): ${avoid.join(', ')}
- Target a specific, real search query that people actually type
- The target_query in frontmatter should be the exact phrase you're optimizing for
- If the research suggests a high-opportunity query, prioritize that`);

  return sections.join('\n\n');
}

// --- Quality Gate ---

async function scorePost(
  client: Anthropic,
  post: string,
  pillar: string
): Promise<{ pass: boolean; score: number; reason: string }> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Score this blog post on a scale of 1-10. It should be a ${pillar} post for bootfile.ai.

Criteria:
1. Does it target a specific, real search query?
2. Is the opening summary clear and quotable (for LLM citation)?
3. Is the BootFile mention natural (not salesy)?
4. Is it 1500+ words with real substance?
5. Would this rank for its target query against existing results?

Post:
${post.slice(0, 3000)}

Reply with ONLY this JSON format:
{"score": N, "pass": true/false, "reason": "brief explanation"}

Pass threshold is 7/10.`,
        },
      ],
    });

    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    const parsed = JSON.parse(text);
    return {
      score: parsed.score || 5,
      pass: parsed.pass !== false && (parsed.score || 5) >= 7,
      reason: parsed.reason || '',
    };
  } catch {
    // If scoring fails, let the post through
    return { pass: true, score: 7, reason: 'Scoring unavailable' };
  }
}

// --- Publish ---

async function publishPost(
  content: string,
  githubToken: string,
  pillar: string
): Promise<Response> {
  const slug = extractSlug(content);
  if (!slug) {
    console.error('[CRON] Could not extract slug from generated content');
    return NextResponse.json({ error: 'Could not extract slug' }, { status: 500 });
  }

  const filePath = `content/blog/${slug}.md`;
  await commitToGitHub(githubToken, filePath, content, `Add blog post: ${slug}`);

  console.log(`[CRON] Published blog post: ${slug} (pillar: ${pillar})`);
  return NextResponse.json({ published: true, slug, pillar });
}

// --- Helpers ---

function extractSlug(markdown: string): string | null {
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

async function fetchRecentAuthors(token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content/blog`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return [];
    const files: Array<{ name: string; download_url: string }> = await res.json();
    const mdFiles = files.filter(f => f.name.endsWith('.md')).slice(-5); // last 5 posts

    const authors: string[] = [];
    for (const file of mdFiles) {
      try {
        const content = await fetch(file.download_url).then(r => r.text());
        const authorMatch = content.match(/^author:\s*["']?(\w+)["']?\s*$/m);
        if (authorMatch) authors.push(authorMatch[1]);
      } catch { /* skip */ }
    }
    return authors;
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
