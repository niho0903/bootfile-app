import type { Metadata } from 'next';
import { StudioFooter, StudioHeader } from '@/components/studio/StudioChrome';
import { StudioRecovery } from '@/components/studio/StudioRecovery';

export const metadata: Metadata = { title: 'Find your order | Bootfile', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function StudioRecoverPage() {
  return <><StudioHeader compact /><StudioRecovery /><StudioFooter /></>;
}
