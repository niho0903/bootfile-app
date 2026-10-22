/** Explicit allowlist: business briefs, payment pages and private links stay out. */
export function isPublicAnalyticsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return ['/', '/quiz', '/studio/sample', '/sample', '/methodology', '/terms', '/privacy', '/blog', '/guides'].includes(pathname)
    || ['/blog/', '/guides/', '/share/'].some(prefix => pathname.startsWith(prefix));
}

export function isPrivatePath(pathname: string): boolean {
  return ['/api/', '/operations', '/admin', '/build', '/bootfile', '/result'].some(prefix => pathname.startsWith(prefix))
    || (pathname.startsWith('/studio') && !['/studio/sample', '/studio/sample/'].includes(pathname));
}

export function isPrivateUrl(value: string): boolean {
  try { return isPrivatePath(new URL(value, 'https://bootfile.ai').pathname); }
  catch { return true; }
}
