import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { buildMetaPrompt } from '@/lib/generation-prompt';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateGenerateInputs } from '@/lib/validation';

export const runtime = 'edge';

const REQUIRED_SECTIONS = [
  '### First Message',
  '### About Me',
  '### How I Think',
  '### How to Reason With Me',
  '### Communication Rules',
  '### Format Preferences',
  '### Failure Detection',
  '### Never Do This',
  '### Quick Commands',
];

// In-memory consumed sessions fallback (when Supabase is not configured)
const consumedSessions = new Set<string>();
const MAX_MEMORY_SESSIONS = 10000;

async function isSessionConsumed(paymentId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('consumed_sessions')
      .select('id')
      .eq('stripe_session_id', paymentId)
      .single();
    return !!data;
  }
  return consumedSessions.has(paymentId);
}

async function markSessionConsumed(paymentId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase
      .from('consumed_sessions')
      .insert({ stripe_session_id: paymentId })
      .single();
  }
  if (consumedSessions.size >= MAX_MEMORY_SESSIONS) {
    const first = consumedSessions.values().next().value;
    if (first) consumedSessions.delete(first);
  }
  consumedSessions.add(paymentId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Determine payment type ---
    const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId.trim() : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const paymentId = paymentIntentId || sessionId;

    if (!paymentId || paymentId.length > 200) {
      return NextResponse.json({ error: 'Payment verification required.' }, { status: 403 });
    }

    if (await isSessionConsumed(paymentId)) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: existing } = await supabase
          .from('bootfile_versions')
          .select('bootfile_text')
          .eq('stripe_session_id', paymentId)
          .single();
        if (existing?.bootfile_text) {
          return NextResponse.json({ bootfile: existing.bootfile_text });
        }
      }
      return NextResponse.json({ error: 'This payment session has already been used.' }, { status: 403 });
    }

    // --- Verify payment ---
    const stripe = getStripe();
    let customerEmail: string | null = null;

    if (paymentIntentId) {
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch {
        return NextResponse.json({ error: 'Invalid payment.' }, { status: 403 });
      }
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed.' }, { status: 403 });
      }
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          customerEmail = charge.billing_details?.email || null;
        } catch { /* non-critical */ }
      }
    } else {
      let stripeSession;
      try {
        stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      } catch {
        return NextResponse.json({ error: 'Invalid payment session.' }, { status: 403 });
      }
      if (stripeSession.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Payment not completed.' }, { status: 403 });
      }
      customerEmail = stripeSession.customer_details?.email || null;
    }

    await markSessionConsumed(paymentId);

    // --- Input validation ---
    const inputs = validateGenerateInputs(body);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }

    // --- Generate (streaming) ---
    const { systemPrompt, userMessage } = buildMetaPrompt(inputs);
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
          max_tokens: 2500,
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
          model: 'claude-sonnet-4-6',
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true,
        }),
      });
    }

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => 'Unknown error');
      console.error(`[${provider.toUpperCase()} API ERROR]`, errText);
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 502 });
    }

    // Stream LLM response to client, collect full text for storage
    const encoder = new TextEncoder();
    const isOpenAI = provider === 'openai';
    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

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
                  fullText += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        } catch (err) {
          console.error('[STREAM ERROR]', err);
        }

        // Validate and log missing sections
        const missing = REQUIRED_SECTIONS.filter(h => !fullText.includes(h));
        if (missing.length > 0) {
          console.warn('[BOOTFILE VALIDATION] Missing sections:', missing);
        }

        // Store in Supabase (fire-and-forget)
        try {
          const supabase = getSupabaseAdmin();
          if (supabase && fullText.length > 0) {
            supabase.from('bootfile_versions').insert({
              stripe_session_id: paymentId,
              email: customerEmail,
              archetype_id: inputs.primaryArchetype,
              bootfile_text: fullText,
              version: 1,
              tier: 'standard',
            }).then(({ error: storeError }) => {
              if (storeError) console.error('[STORE BOOTFILE ERROR]', storeError.message);
            });
          }
        } catch (storeErr) {
          console.error('[STORE BOOTFILE ERROR]', storeErr);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[GENERATE-FULL ERROR]', errMsg, error);
    Sentry.captureException(error, { tags: { route: 'generate-full', stage: 'post-payment' } });
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
