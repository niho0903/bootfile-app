import { NextRequest, NextResponse } from 'next/server';
import { SIMULATOR_ARCHETYPES, buildSimulatorSystemPrompt } from '@/lib/simulator-prompts';
import { ArchetypeId } from '@/lib/questions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt || prompt.length > 800) {
      return NextResponse.json(
        { error: 'Prompt must be between 1 and 800 characters.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Service unavailable.' },
        { status: 503 },
      );
    }

    // Fire 4 parallel Haiku calls
    const calls = SIMULATOR_ARCHETYPES.map(async (archetypeId: ArchetypeId) => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 400,
            system: buildSimulatorSystemPrompt(archetypeId),
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!res.ok) {
          console.error(`[SIMULATOR] ${archetypeId} API error:`, res.status);
          return { archetypeId, text: '' };
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        return { archetypeId, text };
      } catch (err) {
        console.error(`[SIMULATOR] ${archetypeId} failed:`, err);
        return { archetypeId, text: '' };
      }
    });

    const settled = await Promise.all(calls);

    const results: Record<string, string> = {};
    for (const { archetypeId, text } of settled) {
      results[archetypeId] = text;
    }

    return NextResponse.json({ prompt, results });
  } catch (err) {
    console.error('[SIMULATOR ERROR]', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
