'use client';

import { Analytics } from '@vercel/analytics/next';
import { usePathname } from 'next/navigation';
import { isPublicAnalyticsPath } from '@/lib/privacy';

export function PublicAnalytics() {
  const pathname = usePathname();
  if (!isPublicAnalyticsPath(pathname)) return null;

  return (
    <Analytics
      beforeSend={(event) => {
        // Recheck every event: the script may survive a client-side navigation.
        const url = new URL(event.url);
        if (!isPublicAnalyticsPath(url.pathname)) return null;
        return { ...event, url: `${url.origin}${url.pathname}` };
      }}
    />
  );
}
