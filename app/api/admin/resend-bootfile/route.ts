import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, bootfileId } = await req.json();

  if (!email || !bootfileId) {
    return NextResponse.json({ error: 'Email and bootfileId required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: bootfile, error } = await supabase
    .from('bootfile_versions')
    .select('bootfile_text, archetype_id')
    .eq('id', bootfileId)
    .single();

  if (error || !bootfile?.bootfile_text) {
    return NextResponse.json({ error: 'Bootfile not found' }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
  }

  const resend = new Resend(apiKey);

  const { error: sendError } = await resend.emails.send({
    from: 'BootFile <hello@bootfile.ai>',
    to: email.trim().toLowerCase(),
    subject: 'Your BootFile — Resent by Support',
    html: buildResendHtml(bootfile.bootfile_text),
  });

  if (sendError) {
    console.error('[ADMIN RESEND ERROR]', sendError);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function buildResendHtml(bootfileText: string): string {
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
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;color:#2D2926;font-weight:400;margin:0 0 8px 0;">Your BootFile</h1>
      <p style="font-size:14px;color:#7A746B;margin:0;">Here's your personalized AI instruction profile, resent by our support team.</p>
    </div>

    <div style="background-color:#FEF9E7;border:1px solid #F0D878;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#5D4E37;"><strong>Save this email.</strong> Copy the text below into your AI platform's custom instructions. See <a href="https://bootfile.ai/guides" style="color:#7D8B6E;">our guides</a> for step-by-step setup.</p>
    </div>

    <div style="background-color:#ffffff;border:1px solid #DDD6CC;border-radius:12px;padding:24px;">
      <p style="margin:0 0 16px 0;line-height:1.7;color:#4A453E;">${formatted}</p>
    </div>

    <div style="text-align:center;margin-top:32px;">
      <a href="https://bootfile.ai/guides" style="display:inline-block;background-color:#7D8B6E;color:#fff;font-weight:500;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Platform Setup Guides</a>
    </div>

    <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #DDD6CC;">
      <p style="font-size:12px;color:#A39E95;margin:0;">&copy; ${new Date().getFullYear()} BootFile &middot; <a href="https://bootfile.ai" style="color:#7D8B6E;">bootfile.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}
