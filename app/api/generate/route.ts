import { NextRequest, NextResponse } from 'next/server';
import { buildMetaPrompt } from '@/lib/generation-prompt';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateGenerateInputs } from '@/lib/validation';

export const maxDuration = 60;

// In-memory consumed sessions fallback (when Supabase is not configured)
const consumedSessions = new Set<string>();
const MAX_MEMORY_SESSIONS = 10000;

async function isSessionConsumed(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('consumed_sessions')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();
    return !!data;
  }
  return consumedSessions.has(sessionId);
}

async function markSessionConsumed(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase
      .from('consumed_sessions')
      .insert({ stripe_session_id: sessionId })
      .single();
  }
  // Always also mark in memory as backup
  if (consumedSessions.size >= MAX_MEMORY_SESSIONS) {
    const first = consumedSessions.values().next().value;
    if (first) consumedSessions.delete(first);
  }
  consumedSessions.add(sessionId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Payment verification ---
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!sessionId || sessionId.length > 200) {
      return NextResponse.json({ error: 'Payment verification required.' }, { status: 403 });
    }

    // Check if session was already used
    if (await isSessionConsumed(sessionId)) {
      return NextResponse.json({ error: 'This payment session has already been used.' }, { status: 403 });
    }

    // Verify payment with Stripe
    let stripeSession;
    try {
      const stripe = getStripe();
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return NextResponse.json({ error: 'Invalid payment session.' }, { status: 403 });
    }

    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed.' }, { status: 403 });
    }

    // Mark session as consumed BEFORE generation (prevents race condition)
    await markSessionConsumed(sessionId);

    // --- Input validation ---
    const inputs = validateGenerateInputs(body);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }

    // --- Generate ---
    const { systemPrompt, userMessage } = buildMetaPrompt(inputs);
    const provider = process.env.BOOTFILE_LLM_PROVIDER || 'anthropic';

    let bootfile: string;

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
          max_tokens: 2500,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[OPENAI API ERROR]', JSON.stringify(data));
        return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 502 });
      }
      bootfile = data.choices[0].message.content;
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
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[ANTHROPIC API ERROR]', JSON.stringify(data));
        return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 502 });
      }
      bootfile = data.content[0].text;
    }

    // Store BootFile for premium users
    const tier = stripeSession.metadata?.tier || 'basic';
    const isPremium = tier === 'premium' || tier === 'upgrade';

    if (isPremium) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const customerEmail = stripeSession.customer_details?.email || null;
        const { error: storeError } = await supabase.from('bootfile_versions').insert({
          stripe_session_id: sessionId,
          email: customerEmail,
          archetype_id: inputs.primaryArchetype,
          bootfile_text: bootfile,
          version: 1,
          tier,
        });
        if (storeError) {
          console.error('[STORE BOOTFILE ERROR]', storeError.message);
        }
      }
    }

    return NextResponse.json({ bootfile, tier });
  } catch (error: unknown) {
    console.error('[GENERATE ERROR]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
