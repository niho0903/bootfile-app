import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Post-purchase email drip sequence.
 * Runs daily. Checks which customers are due for their next drip email.
 *
 * Sequence:
 *   Day 2  — Setup tips (platform-specific guides)
 *   Day 5  — Share prompt (referral + quiz link for friends)
 *   Day 14 — Check-in (how's it going + blog highlights)
 */

interface DripEmail {
  day: number;
  subject: string;
  buildHtml: (data: CustomerData) => string;
}

interface CustomerData {
  email: string;
  archetypeId: string | null;
  createdAt: string;
}

const DRIP_SEQUENCE: DripEmail[] = [
  {
    day: 2,
    subject: 'Get the most out of your BootFile',
    buildHtml: (data) => wrapEmail(`
      <h2 style="color:#2D2926;font-size:20px;font-weight:400;margin:0 0 16px;">Quick setup tips</h2>
      <p style="margin:0 0 16px;line-height:1.7;color:#4A453E;">
        You've got your BootFile — here's how to make it work harder for you.
      </p>

      <div style="background:#fff;border:1px solid #DDD6CC;border-radius:8px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#2D2926;font-size:15px;margin:0 0 12px;">1. Paste the full text</h3>
        <p style="margin:0 0 12px;color:#4A453E;font-size:14px;line-height:1.6;">
          Don't summarize or trim your BootFile. The full profile gives your AI the context it needs
          to actually adapt to how you think.
        </p>

        <h3 style="color:#2D2926;font-size:15px;margin:0 0 12px;">2. Use it everywhere</h3>
        <p style="margin:0 0 12px;color:#4A453E;font-size:14px;line-height:1.6;">
          Your BootFile works with ChatGPT, Claude, Gemini, Grok, DeepSeek, and Copilot.
          Set it up on every platform you use.
        </p>

        <h3 style="color:#2D2926;font-size:15px;margin:0 0 12px;">3. Try your Quick Commands</h3>
        <p style="margin:0;color:#4A453E;font-size:14px;line-height:1.6;">
          Your BootFile includes trigger phrases like "deep dive" or "just decide."
          Try them in your next conversation — they change how the AI responds.
        </p>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="https://bootfile.ai/guides" style="display:inline-block;background-color:#7D8B6E;color:#fff;font-weight:500;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
          Platform Setup Guides
        </a>
      </div>
    `),
  },
  {
    day: 5,
    subject: 'Know someone who argues with their AI?',
    buildHtml: (data) => {
      const archetypeLine = data.archetypeId
        ? `You turned out to be <strong>The ${capitalize(data.archetypeId)}</strong> — imagine what your friends might discover about how they think.`
        : `You discovered your thinking style — imagine what your friends might find out about theirs.`;

      return wrapEmail(`
        <h2 style="color:#2D2926;font-size:20px;font-weight:400;margin:0 0 16px;">Everyone uses AI differently</h2>
        <p style="margin:0 0 16px;line-height:1.7;color:#4A453E;">
          ${archetypeLine}
        </p>
        <p style="margin:0 0 24px;line-height:1.7;color:#4A453E;">
          The quiz is free and takes about 5 minutes. Share it with someone who'd find it interesting.
        </p>

        <div style="background:#F0EDE7;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
          <p style="margin:0 0 12px;color:#4A453E;font-size:14px;">Share the quiz:</p>
          <a href="https://bootfile.ai/quiz" style="display:inline-block;background-color:#7D8B6E;color:#fff;font-weight:500;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">
            bootfile.ai/quiz
          </a>
        </div>

        <p style="margin:0;line-height:1.7;color:#7A746B;font-size:13px;">
          No referral codes, no incentives. We just think more people should know how they think.
        </p>
      `);
    },
  },
  {
    day: 14,
    subject: 'How\'s your AI treating you?',
    buildHtml: (data) => wrapEmail(`
      <h2 style="color:#2D2926;font-size:20px;font-weight:400;margin:0 0 16px;">Two weeks in</h2>
      <p style="margin:0 0 16px;line-height:1.7;color:#4A453E;">
        By now your AI should feel noticeably different — less generic, more like it actually
        gets how you work. If something feels off, reply to this email. We read everything.
      </p>

      <div style="background:#fff;border:1px solid #DDD6CC;border-radius:8px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#2D2926;font-size:15px;margin:0 0 12px;">Things to try</h3>
        <ul style="margin:0;padding:0 0 0 20px;color:#4A453E;font-size:14px;line-height:1.8;">
          <li>Ask your AI to explain something complex — notice how it matches your style</li>
          <li>Try the same prompt with and without your BootFile loaded</li>
          <li>Use your Quick Commands when you want a specific kind of response</li>
        </ul>
      </div>

      <p style="margin:0 0 16px;line-height:1.7;color:#4A453E;">
        We've been writing about how to get more from AI on the blog. Here are a few worth reading:
      </p>

      <div style="text-align:center;margin-top:24px;">
        <a href="https://bootfile.ai/blog" style="display:inline-block;background-color:#7D8B6E;color:#fff;font-weight:500;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
          Read the Blog
        </a>
      </div>
    `),
  },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const sent: string[] = [];
  const errors: string[] = [];

  try {
    for (const drip of DRIP_SEQUENCE) {
      // Find customers who purchased exactly N days ago
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - drip.day);
      const dayStart = new Date(targetDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      // Query bootfile_versions for customers from that day
      const { data: customers, error } = await supabase
        .from('bootfile_versions')
        .select('email, archetype_id, created_at')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .not('email', 'is', null);

      if (error) {
        console.error(`[DRIP] Query error for day ${drip.day}:`, error.message);
        continue;
      }

      if (!customers || customers.length === 0) continue;

      // Deduplicate by email
      const seen = new Set<string>();
      for (const customer of customers) {
        const email = customer.email?.trim().toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);

        try {
          const { error: sendError } = await resend.emails.send({
            from: 'BootFile <support@bootfile.ai>',
            to: email,
            subject: drip.subject,
            html: drip.buildHtml({
              email,
              archetypeId: customer.archetype_id,
              createdAt: customer.created_at,
            }),
          });

          if (sendError) {
            errors.push(`${email} (day ${drip.day}): ${sendError.message}`);
          } else {
            sent.push(`${email} (day ${drip.day})`);
          }
        } catch (err) {
          errors.push(`${email} (day ${drip.day}): ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }

    return NextResponse.json({ sent: sent.length, errors: errors.length, details: { sent, errors } });
  } catch (error) {
    console.error('[DRIP] Error:', error);
    return NextResponse.json({ error: 'Drip failed' }, { status: 500 });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function wrapEmail(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#7D8B6E,#5C6650);display:inline-block;margin-right:6px;vertical-align:middle;"></div>
      <span style="font-size:16px;color:#2D2926;font-weight:400;vertical-align:middle;">bootfile</span>
    </div>

    ${body}

    <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #DDD6CC;">
      <p style="font-size:11px;color:#A39E95;margin:0;">
        &copy; ${new Date().getFullYear()} BootFile &middot;
        <a href="https://bootfile.ai" style="color:#7D8B6E;">bootfile.ai</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
