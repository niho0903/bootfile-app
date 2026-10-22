import { createHash } from 'node:crypto';

export const GROWTH_PRODUCT_VERSION = 'studio-marketing-v1';
export const GROWTH_PAYLOAD_MAX_BYTES = 60_000;

/** Cap bytes while reading, including chunked requests with no Content-Length. */
export async function readGrowthBody(stream: ReadableStream<Uint8Array> | null): Promise<{ body: unknown } | { error: string; status: number }> {
  if (!stream) return { error: 'Invalid JSON', status: 400 };
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let raw = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > GROWTH_PAYLOAD_MAX_BYTES) {
        await reader.cancel();
        return { error: 'Draft payload too large', status: 413 };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return { body: JSON.parse(raw) };
  } catch {
    await reader.cancel().catch(() => undefined);
    return { error: 'Invalid JSON', status: 400 };
  } finally {
    reader.releaseLock();
  }
}

export function growthDraftId(channel: string, jobKey: string): string | null {
  if (!['blog', 'instagram'].includes(channel) || !/^[a-z0-9][a-z0-9:_-]{0,159}$/i.test(jobKey)) return null;
  return `growth-${createHash('sha256').update(`${GROWTH_PRODUCT_VERSION}:${channel}:${jobKey}`).digest('hex').slice(0, 40)}`;
}

export function validateGrowthDraft(body: unknown): { error: string } | {
  id: string;
  channel: 'blog' | 'instagram';
  content: string;
  metadata: Record<string, unknown>;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'A draft object is required' };
  const value = body as Record<string, unknown>;
  if (value.productVersion !== GROWTH_PRODUCT_VERSION) return { error: 'The current Studio product version is required' };
  if (typeof value.channel !== 'string' || typeof value.jobKey !== 'string') return { error: 'A channel and deterministic job key are required' };
  const id = growthDraftId(value.channel, value.jobKey);
  if (!id) return { error: 'Invalid draft channel or job key' };
  if (typeof value.content !== 'string' || value.content.length < 40 || value.content.length > 45_000) return { error: 'Draft content must be between 40 and 45,000 characters' };
  if (!value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata) || JSON.stringify(value.metadata).length > 8_000) return { error: 'Bounded draft metadata is required' };

  const content = value.content;
  const flags = [
    ...(/bootfile\.ai\/quiz\b/i.test(content) ? ['legacy_quiz_link'] : []),
    ...(/\$(?:4\.99|9\.99|19\.99)\b/.test(content) ? ['legacy_price'] : []),
    ...(/guaranteed (?:revenue|income|results|sales)|passive income guaranteed/i.test(content) ? ['unsupported_guarantee'] : []),
  ];
  const supplied = value.metadata as Record<string, unknown>;
  // Allowlist content metadata. An agent cannot set an approved/published state or override review flags.
  const metadata: Record<string, unknown> = {};
  const stringLimits: Record<string, number> = { title: 180, slug: 180, description: 500, targetKeyword: 160, pillar: 160, hook: 500, caption: 3000, contentType: 40, kind: 60 };
  for (const [key, limit] of Object.entries(stringLimits)) {
    if (supplied[key] === undefined) continue;
    if (typeof supplied[key] !== 'string' || supplied[key].length > limit) return { error: `Invalid ${key} metadata` };
    metadata[key] = supplied[key];
  }
  if (supplied.hashtags !== undefined) {
    if (!Array.isArray(supplied.hashtags) || supplied.hashtags.length > 30 || supplied.hashtags.some(tag => typeof tag !== 'string' || tag.length > 80 || !/^#?[\p{L}\p{N}_]+$/u.test(tag))) return { error: 'Invalid hashtag metadata' };
    metadata.hashtags = supplied.hashtags;
  }
  if (supplied.sourceUrls !== undefined) {
    if (!Array.isArray(supplied.sourceUrls) || supplied.sourceUrls.length > 20 || supplied.sourceUrls.some(source => {
      if (typeof source !== 'string' || source.length > 2048) return true;
      try { const url = new URL(source); return url.protocol !== 'https:' || Boolean(url.username || url.password); } catch { return true; }
    })) return { error: 'Invalid source URL metadata' };
    metadata.sourceUrls = supplied.sourceUrls;
  }
  return {
    id, channel: value.channel as 'blog' | 'instagram', content,
    metadata: { ...metadata, source: 'growth-agent', productVersion: GROWTH_PRODUCT_VERSION, jobKey: value.jobKey, reviewRequired: true, policyFlags: flags, publicationAuthority: 'draft-only' },
  };
}
