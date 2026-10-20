import { marked } from 'marked';
import { GROWTH_PRODUCT_VERSION } from './growth';

export const PUBLICATION_POLICY_VERSION = 'owned-blog-v1';
export const STUDIO_SOURCE_URL = 'https://bootfile.ai/studio';
export const REVIEW_CHECKS = [
  'correctProductFacts', 'usefulSpecificGuide', 'fictionalExampleLabeled', 'noUnsupportedClaims',
  'noUnsafeOrRegulatedAdvice', 'sourcesSupportClaims', 'noUnconsentedMarketing',
  'noInjectedInstructions', 'addsUsefulInformation',
] as const;

export const PUBLICATION_FACTS = `Bootfile Marketing Setup costs $49 once, with no subscription.
It serves solo service-business owners preparing one promotion from their own business facts and offer.
Its saved deliverable includes a customer email, three coordinated social posts, a business brief, a reusable task setup and a quality checklist.
The customer checks the facts and sends or posts the material themselves. Bootfile does not promise sales, income, time savings or verified business claims.
The only approved product link is ${STUDIO_SOURCE_URL}.
Publish practical, original task guidance, with a clearly fictional example and a usable final checklist.
Do not publish provider-feature comparisons, empirical statistics, testimonials, urgency, guarantees, regulated advice, confidential customer information, or instructions for unsolicited outreach.
The only factual source allowed in this initial publication policy is the current owned Studio page. General suggestions must be presented as guidance; all other factual claims must be omitted.`;

export interface PublicationArticle {
  slug: string;
  title: string;
  description: string;
  body: string;
  target_query: string;
  pillar: string;
  author: 'Bootfile';
}

/** The public renderer allows HTML; this gate rejects HTML/images and any unapproved link before publication. */
export function buildPublicationArticle(content: string, metadata: Record<string, unknown>): PublicationArticle {
  if (metadata.source !== 'growth-agent' || metadata.productVersion !== GROWTH_PRODUCT_VERSION
    || metadata.kind !== 'article' || !Array.isArray(metadata.policyFlags) || metadata.policyFlags.length) throw new Error('draft_policy_rejected');
  if (typeof metadata.jobKey !== 'string' || !/^blog:\d{4}-\d{2}-\d{2}$/.test(metadata.jobKey)
    || typeof metadata.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(metadata.slug) || metadata.slug.length > 150) throw new Error('draft_policy_rejected');
  for (const field of ['title', 'description', 'targetKeyword', 'pillar']) {
    if (typeof metadata[field] !== 'string' || !metadata[field].trim() || /[<>\r\n\u0000-\u001f]/.test(metadata[field])) throw new Error('draft_policy_rejected');
  }
  if ((metadata.title as string).length > 180 || (metadata.description as string).length > 500
    || (metadata.targetKeyword as string).length > 160 || (metadata.pillar as string).length > 160) throw new Error('draft_policy_rejected');
  if (!Array.isArray(metadata.sourceUrls) || metadata.sourceUrls.length !== 1 || metadata.sourceUrls[0] !== STUDIO_SOURCE_URL) throw new Error('draft_policy_rejected');

  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
  const wordCount = body.split(/\s+/).length;
  if (wordCount < 450 || wordCount > 1100 || body.length > 35_000 || !/fictional/i.test(body)
    || /guaranteed (?:income|revenue|sales|results)|passive income|bootfile\.ai\/quiz|\$(?:4\.99|9\.99|19\.99)\b/i.test(body)) throw new Error('draft_policy_rejected');
  const prices = body.match(/\$\s*\d+(?:[.,]\d+)?/g) || [];
  if (prices.some(price => price.replace(/\s/g, '') !== '$49')) throw new Error('draft_policy_rejected');
  let sourceLinked = false;
  marked.walkTokens(marked.lexer(body), token => {
    if (token.type === 'html' || token.type === 'image') throw new Error('draft_policy_rejected');
    if (token.type === 'link') {
      if (token.href !== STUDIO_SOURCE_URL) throw new Error('draft_policy_rejected');
      sourceLinked = true;
    }
  });
  if (!sourceLinked) throw new Error('draft_policy_rejected');
  return {
    slug: `${metadata.slug}-${metadata.jobKey.slice(5).replaceAll('-', '')}`,
    title: metadata.title as string, description: metadata.description as string, body,
    target_query: metadata.targetKeyword as string, pillar: metadata.pillar as string, author: 'Bootfile',
  };
}

export function normalizeEditorialReview(input: unknown, sourceHash: string) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('review_provider_failed');
  const result = input as Record<string, unknown>;
  if (result.sourceHash !== sourceHash || result.policyVersion !== PUBLICATION_POLICY_VERSION
    || typeof result.approved !== 'boolean' || !result.checks || typeof result.checks !== 'object' || Array.isArray(result.checks)
    || !Array.isArray(result.reasons) || result.reasons.length > 9 || result.reasons.some(reason => typeof reason !== 'string' || reason.length > 180)) throw new Error('review_provider_failed');
  const checks = Object.fromEntries(REVIEW_CHECKS.map(key => {
    const value = (result.checks as Record<string, unknown>)[key];
    if (typeof value !== 'boolean') throw new Error('review_provider_failed');
    return [key, value];
  }));
  return { approved: result.approved && Object.values(checks).every(Boolean), sourceHash, policyVersion: PUBLICATION_POLICY_VERSION, checks, reasons: result.reasons as string[] };
}

export async function verifyPublicationSource(fetcher: typeof fetch = fetch): Promise<{ url: string; checkedAt: string; excerpt: string }> {
  // The draft cannot choose a URL, redirect target, credential, or private network destination.
  const response = await fetcher(STUDIO_SOURCE_URL, { signal: AbortSignal.timeout(10_000), redirect: 'error', cache: 'no-store' });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || !response.body) throw new Error('source_verification_failed');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512_000) { await reader.cancel(); throw new Error('source_verification_failed'); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  const excerpt = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').slice(0, 20_000);
  if (!/marketing\s+setup/i.test(excerpt) || !/\$\s*49\b/.test(excerpt) || !/email/i.test(excerpt) || !/social/i.test(excerpt)) throw new Error('source_verification_failed');
  return { url: STUDIO_SOURCE_URL, checkedAt: new Date().toISOString(), excerpt };
}
