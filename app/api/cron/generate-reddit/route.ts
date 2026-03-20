import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/supabase';

const GITHUB_REPO = 'niho0903/bootfile-app';

const SUBREDDITS = [
  { name: 'ChatGPT', focus: 'ChatGPT tips, custom instructions, GPT usage' },
  { name: 'ClaudeAI', focus: 'Claude tips, system prompts, Anthropic features' },
  { name: 'artificial', focus: 'AI industry discussion, trends, tools' },
  { name: 'productivity', focus: 'AI for productivity, workflow optimization' },
  { name: 'ArtificialIntelligence', focus: 'AI tools, comparisons, new developments' },
];

const REDDIT_SYSTEM_PROMPT = `You generate Reddit content for BootFile (bootfile.ai), a product that creates personalized AI instruction profiles.

CRITICAL RULES:
- Write like a real Reddit user, NOT a marketer
- Be genuinely helpful first. The mention of BootFile should be natural and secondary
- Match the tone and norms of each subreddit
- Never be promotional or salesy. Reddit users will destroy you for it
- Use casual language, contractions, personal anecdotes
- If a post doesn't naturally connect to BootFile, don't force it — just be helpful
- Posts should provide standalone value even without clicking any links
- Comments should feel like they come from someone who genuinely uses and knows about AI

FORMAT OPTIONS:
1. "discussion" — Start a genuine discussion/question that relates to AI personalization
2. "value_post" — Share a tip, insight, or guide that naturally references BootFile
3. "comment" — A helpful comment reply to a common type of post in the subreddit

For each piece, return JSON:
{
  "type": "discussion|value_post|comment",
  "subreddit": "SubredditName",
  "title": "Post title (for posts, not comments)",
  "body": "The full post or comment text",
  "context": "What kind of existing post this comment would reply to (for comments only)",
  "notes": "Posting strategy notes — best time, what to watch for"
}`;

/**
 * Generates Reddit-ready content for manual posting.
 * Runs Tuesdays and Fridays. Stores drafts in Supabase for review via admin panel.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_AGENT_TOKEN;

  if (!anthropicKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  try {
    // 1. Fetch recent blog posts for content source material
    const recentPosts = await fetchRecentBlogPosts(githubToken || '');

    // 2. Pick 2 subreddits to target this run
    const targetSubs = pickSubreddits(2);

    // 3. Generate content for each subreddit
    const client = new Anthropic({ apiKey: anthropicKey });
    const results: Array<Record<string, unknown>> = [];

    for (const sub of targetSubs) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: REDDIT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate one piece of Reddit content for r/${sub.name}.
Subreddit focus: ${sub.focus}

Recent blog posts from bootfile.ai (use as source material if relevant):
${recentPosts.map(p => `- ${p.title} (bootfile.ai/blog/${p.slug})`).join('\n') || 'No recent posts'}

Key product facts:
- Free quiz discovers your AI reasoning archetype (8 types: Surgeon, Architect, Sparring Partner, Translator, Co-Pilot, Librarian, Closer, Maker)
- Full BootFile is $4.99 one-time
- Works with ChatGPT, Claude, Gemini, Grok, DeepSeek, Copilot
- The quiz takes ~5 minutes
- There's a free simulator at bootfile.ai/simulator

Generate content that would genuinely get upvotes in r/${sub.name}. Return ONLY valid JSON.`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      try {
        const parsed = JSON.parse(text);
        results.push(parsed);
      } catch {
        console.warn(`[REDDIT CRON] Failed to parse response for r/${sub.name}`);
      }
    }

    // 4. Store in Supabase for review
    const stored = await storeRedditDrafts(results);

    return NextResponse.json({ generated: results.length, stored });
  } catch (error) {
    console.error('[REDDIT CRON] Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

function pickSubreddits(count: number): typeof SUBREDDITS {
  // Rotate through subreddits based on day of year
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const shuffled = [...SUBREDDITS].sort((a, b) => {
    const hashA = (dayOfYear * 31 + a.name.charCodeAt(0)) % 100;
    const hashB = (dayOfYear * 31 + b.name.charCodeAt(0)) % 100;
    return hashA - hashB;
  });
  return shuffled.slice(0, count);
}

interface BlogPostRef {
  title: string;
  slug: string;
}

async function fetchRecentBlogPosts(token: string): Promise<BlogPostRef[]> {
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/content/blog`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return [];
    const files: Array<{ name: string }> = await res.json();
    return files
      .filter(f => f.name.endsWith('.md'))
      .map(f => ({
        slug: f.name.replace('.md', ''),
        title: f.name.replace('.md', '').replace(/-/g, ' '),
      }))
      .slice(-5); // Last 5 posts
  } catch {
    return [];
  }
}

async function storeRedditDrafts(drafts: Array<Record<string, unknown>>): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase || drafts.length === 0) return 0;

  // Create reddit_drafts table if it doesn't exist — we'll use a simple insert
  // and handle the "table doesn't exist" error gracefully
  let stored = 0;
  for (const draft of drafts) {
    try {
      const { error } = await supabase.from('reddit_drafts').insert({
        subreddit: draft.subreddit || 'unknown',
        post_type: draft.type || 'discussion',
        title: draft.title || null,
        body: draft.body || '',
        context: draft.context || null,
        notes: draft.notes || null,
        status: 'pending',
      });
      if (!error) stored++;
      else console.warn('[REDDIT CRON] Insert error:', error.message);
    } catch {
      // Table might not exist yet
    }
  }
  return stored;
}
