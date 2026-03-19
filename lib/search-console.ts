/**
 * Google Search Console API integration.
 * Uses a service account for authentication.
 *
 * Required env vars:
 *   GSC_CLIENT_EMAIL   — service account email
 *   GSC_PRIVATE_KEY    — service account private key (PEM, with \n for newlines)
 *   GSC_SITE_URL       — the property URL in Search Console (e.g. https://bootfile.ai)
 */

import { google } from 'googleapis';

function getAuth() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleReport {
  topQueries: SearchAnalyticsRow[];
  topPages: SearchAnalyticsRow[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  queriesTrending: SearchAnalyticsRow[];
  queriesDeclining: SearchAnalyticsRow[];
  pagePerformance: SearchAnalyticsRow[];
}

/**
 * Fetch search analytics for a given date range.
 */
async function querySearchAnalytics(
  auth: InstanceType<typeof google.auth.JWT>,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  rowLimit = 50
): Promise<SearchAnalyticsRow[]> {
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: 'final',
    },
  });

  return (res.data.rows || []).map((row) => ({
    keys: row.keys || [],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate a full weekly report comparing this week vs last week.
 */
export async function getWeeklyReport(): Promise<SearchConsoleReport | null> {
  const auth = getAuth();
  const siteUrl = process.env.GSC_SITE_URL || 'https://bootfile.ai';
  if (!auth) return null;

  const now = new Date();

  // This week: 7 days ending 3 days ago (GSC data has ~3 day delay)
  const thisWeekEnd = new Date(now);
  thisWeekEnd.setDate(now.getDate() - 3);
  const thisWeekStart = new Date(thisWeekEnd);
  thisWeekStart.setDate(thisWeekEnd.getDate() - 6);

  // Last week: the 7 days before this week
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

  const twStart = formatDate(thisWeekStart);
  const twEnd = formatDate(thisWeekEnd);
  const lwStart = formatDate(lastWeekStart);
  const lwEnd = formatDate(lastWeekEnd);

  // Fetch this week's data
  const [topQueries, topPages] = await Promise.all([
    querySearchAnalytics(auth, siteUrl, twStart, twEnd, ['query'], 50),
    querySearchAnalytics(auth, siteUrl, twStart, twEnd, ['page'], 25),
  ]);

  // Fetch last week's queries for trend comparison
  const lastWeekQueries = await querySearchAnalytics(auth, siteUrl, lwStart, lwEnd, ['query'], 100);
  const lastWeekMap = new Map(lastWeekQueries.map((q) => [q.keys[0], q]));

  // Find trending and declining queries
  const queriesTrending: SearchAnalyticsRow[] = [];
  const queriesDeclining: SearchAnalyticsRow[] = [];

  for (const q of topQueries) {
    const prev = lastWeekMap.get(q.keys[0]);
    if (!prev) {
      // New query this week
      queriesTrending.push(q);
    } else if (q.clicks > prev.clicks * 1.3) {
      queriesTrending.push(q);
    } else if (q.clicks < prev.clicks * 0.7 && prev.clicks >= 3) {
      queriesDeclining.push(q);
    }
  }

  // Also check for queries that disappeared
  for (const [query, prev] of lastWeekMap) {
    if (prev.clicks >= 3 && !topQueries.find((q) => q.keys[0] === query)) {
      queriesDeclining.push(prev);
    }
  }

  // Totals
  const totalClicks = topQueries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = topQueries.reduce((sum, q) => sum + q.impressions, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition =
    topQueries.length > 0
      ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length
      : 0;

  return {
    topQueries: topQueries.slice(0, 20),
    topPages: topPages.slice(0, 15),
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
    queriesTrending: queriesTrending.slice(0, 10),
    queriesDeclining: queriesDeclining.slice(0, 10),
    pagePerformance: topPages,
  };
}
