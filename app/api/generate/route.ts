import { NextRequest, NextResponse } from 'next/server';
import { buildMetaPrompt } from '@/lib/generation-prompt';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const inputs = await req.json();
    const { systemPrompt, userMessage } = buildMetaPrompt(inputs);

    const provider = process.env.BOOTFILE_LLM_PROVIDER || 'anthropic';

    let bootfile: string;

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });
      const data = await response.json();
      bootfile = data.choices[0].message.content;
    } else {
      // Anthropic (default)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await response.json();
      bootfile = data.content[0].text;
    }

    return NextResponse.json({ bootfile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GENERATE ERROR]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
