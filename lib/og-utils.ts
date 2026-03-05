const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export function getOgImageUrl(archetypeId: string): string {
  return `${BASE_URL}/api/og?archetype=${encodeURIComponent(archetypeId)}`;
}

export function getShareUrl(archetypeId: string): string {
  return `${BASE_URL}/share/${encodeURIComponent(archetypeId)}`;
}
