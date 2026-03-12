import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const { email, bootfileText, archetypeId } = await req.json();

    if (!email || typeof email !== 'string' || !bootfileText || typeof bootfileText !== 'string') {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[SEND-BOOTFILE] RESEND_API_KEY not set, skipping email');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(apiKey);

    const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);
    const archetype = typeof archetypeId === 'string' ? archetypeId : 'your';

    const { error } = await resend.emails.send({
      from: 'BootFile <hello@bootfile.ai>',
      to: sanitizedEmail,
      subject: 'Your BootFile is ready',
      html: buildEmailHtml(bootfileText, archetype),
    });

    if (error) {
      console.error('[SEND-BOOTFILE ERROR]', error);
      return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SEND-BOOTFILE ERROR]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

function buildEmailHtml(bootfileText: string, archetype: string): string {
  // Convert markdown-style headers and preserve formatting
  const formatted = bootfileText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="color:#2D2926;font-size:16px;font-weight:600;margin:24px 0 8px 0;">$1</h3>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:4px;">$1</li>')
    .replace(/\n{2,}/g, '</p><p style="margin:0 0 16px 0;line-height:1.7;color:#4A453E;">')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#7D8B6E,#5C6650);display:inline-block;margin-bottom:12px;"></div>
      <h1 style="font-size:24px;color:#2D2926;font-weight:400;margin:0 0 8px 0;">Your BootFile</h1>
      <p style="font-size:14px;color:#7A746B;margin:0;">Your personalized AI instruction profile is below.</p>
    </div>

    <!-- Save reminder -->
    <div style="background-color:#FEF9E7;border:1px solid #F0D878;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#5D4E37;"><strong>Save this email.</strong> Copy the text below into your AI platform's custom instructions. See <a href="https://bootfile.ai/guides" style="color:#7D8B6E;">our guides</a> for step-by-step setup.</p>
    </div>

    <!-- BootFile content -->
    <div style="background-color:#ffffff;border:1px solid #DDD6CC;border-radius:12px;padding:24px;">
      <p style="margin:0 0 16px 0;line-height:1.7;color:#4A453E;">${formatted}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:32px;">
      <p style="font-size:14px;color:#7A746B;margin-bottom:16px;">Need help setting it up?</p>
      <a href="https://bootfile.ai/guides" style="display:inline-block;background-color:#7D8B6E;color:#fff;font-weight:500;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Platform Setup Guides</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #DDD6CC;">
      <p style="font-size:12px;color:#A39E95;margin:0;">&copy; ${new Date().getFullYear()} BootFile &middot; <a href="https://bootfile.ai" style="color:#7D8B6E;">bootfile.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}
