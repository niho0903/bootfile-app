import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StudioIntakeForm } from '@/components/studio/StudioIntakeForm';
import { StudioFooter, StudioHeader } from '@/components/studio/StudioChrome';

export const metadata: Metadata = {
  title: 'Build your Marketing Setup | Bootfile',
  description: 'Tell us about one business offer. Review your brief, then get your email, social posts, and reusable ChatGPT setup.',
  robots: { index: false, follow: true },
};

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if ((await searchParams).demo === '1') redirect('/studio/sample');
  return <><StudioHeader compact /><StudioIntakeForm /><StudioFooter /></>;
}
