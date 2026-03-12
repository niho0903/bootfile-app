import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { saveDraft } from '@/lib/drafts';
import { BLOG_SYSTEM_PROMPT, INSTAGRAM_SYSTEM_PROMPT } from '@/lib/content-prompts';
import { getAllPosts } from '@/lib/blog';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { channel, pillar, topic, type, archetype, notes } = body;

    if (!channel || !['blog', 'instagram'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let response;

    if (channel === 'blog') {
      const existingPosts = getAllPosts().map((p) => `- ${p.title} (${p.slug})`).join('\n');

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: BLOG_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Write a blog post.
Pillar: ${pillar || 'Choose the best pillar for this topic'}
Topic: ${topic || 'Choose the highest-value topic for this pillar'}
Notes: ${notes || 'None'}
Existing articles (for internal linking):
${existingPosts || 'None yet'}
Today's date: ${today}`,
          },
        ],
      });
    } else {
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: INSTAGRAM_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Create an Instagram post.
Type: ${type || 'frustration'}
Archetype: ${archetype || 'choose one'}
Notes: ${notes || 'None'}
Today's date: ${today}`,
          },
        ],
      });
    }

    const generatedContent =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const draft = saveDraft(channel, generatedContent, {
      pillar,
      topic,
      type,
      archetype,
      notes,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('[GENERATE CONTENT ERROR]', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}
