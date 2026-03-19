import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getWeeklyReport, SearchAnalyticsRow } from '@/lib/search-console';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Search Console data
    const gscReport = await getWeeklyReport();

    // 2. Supabase business metrics (last 7 days)
    const businessMetrics = await getBusinessMetrics();

    // 3. Build email
    const html = buildReportEmail(gscReport, businessMetrics);

    // 4. Send via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const reportEmail = process.env.REPORT_EMAIL || 'support@bootfile.ai';
    if (!resendKey) {
      console.error('[WEEKLY REPORT] RESEND_API_KEY not set');
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'BootFile <support@bootfile.ai>',
      to: reportEmail,
      subject: `BootFile Weekly Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      html,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[WEEKLY REPORT ERROR]', error);
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }
}

interface BusinessMetrics {
  quizCompletions: number;
  purchases: number;
  conversionRate: number;
  topArchetypes: Array<{ archetype: string; count: number }>;
}

async function getBusinessMetrics(): Promise<BusinessMetrics | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  const [quizRes, purchaseRes, archetypeRes] = await Promise.all([
    supabase
      .from('quiz_completions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase
      .from('quiz_completions')
      .select('primary_archetype')
      .gte('created_at', since),
  ]);

  const quizCompletions = quizRes.count || 0;
  const purchases = purchaseRes.count || 0;

  // Count archetypes
  const archetypeCounts: Record<string, number> = {};
  for (const row of archetypeRes.data || []) {
    const a = row.primary_archetype;
    if (a) archetypeCounts[a] = (archetypeCounts[a] || 0) + 1;
  }
  const topArchetypes = Object.entries(archetypeCounts)
    .map(([archetype, count]) => ({ archetype, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    quizCompletions,
    purchases,
    conversionRate: quizCompletions > 0 ? purchases / quizCompletions : 0,
    topArchetypes,
  };
}

function formatRow(row: SearchAnalyticsRow): string {
  return `<tr>
    <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;">${row.keys[0]}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${row.clicks}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${row.impressions}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${(row.ctr * 100).toFixed(1)}%</td>
    <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${row.position.toFixed(1)}</td>
  </tr>`;
}

function buildReportEmail(
  gsc: Awaited<ReturnType<typeof getWeeklyReport>>,
  biz: BusinessMetrics | null
): string {
  const s = (label: string, value: string | number) =>
    `<div style="text-align:center;padding:16px;">
      <div style="font-size:28px;font-weight:600;color:#2D2926;">${value}</div>
      <div style="font-size:12px;color:#7A746B;margin-top:4px;">${label}</div>
    </div>`;

  let gscSection = '<p style="color:#7A746B;">Google Search Console not configured yet. Add GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY env vars.</p>';

  if (gsc) {
    const tableHead = `<thead><tr style="background:#F0EDE7;">
      <th style="padding:6px 12px;text-align:left;">Query</th>
      <th style="padding:6px 12px;text-align:right;">Clicks</th>
      <th style="padding:6px 12px;text-align:right;">Impressions</th>
      <th style="padding:6px 12px;text-align:right;">CTR</th>
      <th style="padding:6px 12px;text-align:right;">Position</th>
    </tr></thead>`;

    const trendingRows = gsc.queriesTrending.length > 0
      ? gsc.queriesTrending.map(formatRow).join('')
      : '<tr><td colspan="5" style="padding:12px;color:#7A746B;">No trending queries yet</td></tr>';

    const decliningRows = gsc.queriesDeclining.length > 0
      ? gsc.queriesDeclining.map(formatRow).join('')
      : '<tr><td colspan="5" style="padding:12px;color:#7A746B;">No declining queries</td></tr>';

    gscSection = `
      <div style="display:flex;gap:0;border:1px solid #E8E3DB;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        ${s('Total Clicks', gsc.totalClicks)}
        ${s('Impressions', gsc.totalImpressions.toLocaleString())}
        ${s('Avg CTR', (gsc.avgCtr * 100).toFixed(1) + '%')}
        ${s('Avg Position', gsc.avgPosition.toFixed(1))}
      </div>

      <h3 style="color:#2D2926;font-size:16px;margin:24px 0 8px;">Top Queries</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${tableHead}
        <tbody>${gsc.topQueries.slice(0, 15).map(formatRow).join('')}</tbody>
      </table>

      <h3 style="color:#2D2926;font-size:16px;margin:24px 0 8px;">Trending Up</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${tableHead}
        <tbody>${trendingRows}</tbody>
      </table>

      <h3 style="color:#2D2926;font-size:16px;margin:24px 0 8px;">Declining</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${tableHead}
        <tbody>${decliningRows}</tbody>
      </table>

      <h3 style="color:#2D2926;font-size:16px;margin:24px 0 8px;">Top Pages</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#F0EDE7;">
          <th style="padding:6px 12px;text-align:left;">Page</th>
          <th style="padding:6px 12px;text-align:right;">Clicks</th>
          <th style="padding:6px 12px;text-align:right;">Impressions</th>
          <th style="padding:6px 12px;text-align:right;">CTR</th>
          <th style="padding:6px 12px;text-align:right;">Position</th>
        </tr></thead>
        <tbody>${gsc.topPages.map((p) => {
          const url = new URL(p.keys[0]);
          return `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;">${url.pathname}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${p.clicks}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${p.impressions}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${(p.ctr * 100).toFixed(1)}%</td>
            <td style="padding:6px 12px;border-bottom:1px solid #E8E3DB;text-align:right;">${p.position.toFixed(1)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  let bizSection = '';
  if (biz) {
    bizSection = `
      <h2 style="color:#2D2926;font-size:18px;margin:32px 0 12px;">Business Metrics (Last 7 Days)</h2>
      <div style="display:flex;gap:0;border:1px solid #E8E3DB;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        ${s('Quiz Completions', biz.quizCompletions)}
        ${s('Purchases', biz.purchases)}
        ${s('Conversion Rate', (biz.conversionRate * 100).toFixed(1) + '%')}
      </div>
      ${biz.topArchetypes.length > 0 ? `
        <h3 style="color:#2D2926;font-size:16px;margin:16px 0 8px;">Top Archetypes</h3>
        <ul style="margin:0;padding:0 0 0 20px;color:#4A453E;">
          ${biz.topArchetypes.map((a) => `<li>${a.archetype}: ${a.count}</li>`).join('')}
        </ul>` : ''}`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;color:#2D2926;font-weight:400;margin:0 0 4px;">BootFile Weekly Report</h1>
    <p style="font-size:13px;color:#7A746B;margin:0 0 24px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <h2 style="color:#2D2926;font-size:18px;margin:0 0 12px;">Search Performance</h2>
    ${gscSection}
    ${bizSection}

    <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #E8E3DB;">
      <p style="font-size:11px;color:#A39E95;margin:0;">&copy; ${new Date().getFullYear()} BootFile &middot; Automated weekly report</p>
    </div>
  </div>
</body>
</html>`;
}
