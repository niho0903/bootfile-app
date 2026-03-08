import { NextRequest, NextResponse } from 'next/server';
import { buildPreviewPrompt } from '@/lib/preview-prompt';
import { validateGenerateInputs } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const rateResult = checkRateLimit(`preview:${ip}`, 5, 3600000);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many preview requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const inputs = validateGenerateInputs(body);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }

    const { systemPrompt, userMessage } = buildPreviewPrompt(inputs);
    const provider = process.env.BOOTFILE_LLM_PROVIDER || 'anthropic';

    let preview: string;

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'Generation service unavailable.' }, { status: 503 });
      }
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
          max_tokens: 800,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[OPENAI PREVIEW ERROR]', JSON.stringify(data));
        return NextResponse.json({ error: 'Preview generation failed. Please try again.' }, { status: 502 });
      }
      preview = data.choices[0].message.content;
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Generation service unavailable.' }, { status: 503 });
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[ANTHROPIC PREVIEW ERROR]', JSON.stringify(data));
        return NextResponse.json({ error: 'Preview generation failed. Please try again.' }, { status: 502 });
      }
      preview = data.content[0].text;
    }

    return NextResponse.json({ preview });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[PREVIEW ERROR]', errMsg, error);
    return NextResponse.json({ error: `Preview error: ${errMsg}` }, { status: 500 });
  }
}
