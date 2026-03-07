import { NextRequest, NextResponse } from 'next/server';
import { buildMetaPrompt } from '@/lib/generation-prompt';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateGenerateInputs } from '@/lib/validation';

export const maxDuration = 60;

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

function validateBootfile(text: string): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_SECTIONS.filter(h => !text.includes(h));
  return { valid: missing.length === 0, missing };
}

async function callLLM(systemPrompt: string, userMessage: string, provider: string): Promise<{ bootfile: string | null; error: string | null; status?: number }> {
  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      return { bootfile: null, error: 'Generation service unavailable.', status: 503 };
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
      return { bootfile: null, error: 'Generation failed. Please try again.', status: 502 };
    }
    return { bootfile: data.choices[0].message.content, error: null };
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { bootfile: null, error: 'Generation service unavailable.', status: 503 };
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
      return { bootfile: null, error: 'Generation failed. Please try again.', status: 502 };
    }
    return { bootfile: data.content[0].text, error: null };
  }
}

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
      // If already consumed, try to return the existing bootfile from Supabase
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
      // PaymentIntent verification (new embedded checkout flow)
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch {
        return NextResponse.json({ error: 'Invalid payment.' }, { status: 403 });
      }
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed.' }, { status: 403 });
      }
      // Try to get email from charge
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          customerEmail = charge.billing_details?.email || null;
        } catch { /* non-critical */ }
      }
    } else {
      // Checkout Session verification (backward compat)
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

    // --- Generate ---
    const { systemPrompt, userMessage } = buildMetaPrompt(inputs);
    const provider = process.env.BOOTFILE_LLM_PROVIDER || 'anthropic';

    const firstResult = await callLLM(systemPrompt, userMessage, provider);
    if (firstResult.error) {
      return NextResponse.json({ error: firstResult.error }, { status: firstResult.status || 502 });
    }

    let bootfile = firstResult.bootfile!;
    const firstValidation = validateBootfile(bootfile);

    if (!firstValidation.valid) {
      console.warn('[BOOTFILE VALIDATION] Missing sections on first attempt:', firstValidation.missing);

      const retryResult = await callLLM(systemPrompt, userMessage, provider);
      if (retryResult.bootfile) {
        const retryValidation = validateBootfile(retryResult.bootfile);
        if (retryValidation.missing.length < firstValidation.missing.length) {
          bootfile = retryResult.bootfile;
          if (retryValidation.missing.length > 0) {
            console.warn('[BOOTFILE VALIDATION] Still missing after retry:', retryValidation.missing);
          }
        }
      }
    }

    // Store in Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: storeError } = await supabase.from('bootfile_versions').insert({
        stripe_session_id: paymentId,
        email: customerEmail,
        archetype_id: inputs.primaryArchetype,
        bootfile_text: bootfile,
        version: 1,
        tier: 'standard',
      });
      if (storeError) {
        console.error('[STORE BOOTFILE ERROR]', storeError.message);
      }
    }

    return NextResponse.json({ bootfile });
  } catch (error: unknown) {
    console.error('[GENERATE-FULL ERROR]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
