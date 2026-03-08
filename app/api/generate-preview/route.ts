import { NextRequest, NextResponse } from 'next/server';
import { buildPreviewPrompt } from '@/lib/preview-prompt';
import { validateGenerateInputs } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

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

    let apiResponse: Response;

    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'Generation service unavailable.' }, { status: 503 });
      }
      apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          stream: true,
        }),
      });
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Generation service unavailable.' }, { status: 503 });
      }
      apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        }),
      });
    }

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => 'Unknown error');
      console.error(`[${provider.toUpperCase()} PREVIEW ERROR]`, errText);
      return NextResponse.json({ error: 'Preview generation failed. Please try again.' }, { status: 502 });
    }

    // Stream text chunks from the LLM SSE response to the client
    const encoder = new TextEncoder();
    const isOpenAI = provider === 'openai';
    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const text = isOpenAI
                  ? parsed.choices?.[0]?.delta?.content
                  : (parsed.type === 'content_block_delta' ? parsed.delta?.text : null);
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        } catch (err) {
          console.error('[STREAM ERROR]', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[PREVIEW ERROR]', errMsg, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
