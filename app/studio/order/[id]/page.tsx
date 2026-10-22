import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudioHeader, StudioFooter } from '@/components/studio/StudioChrome';
import { StudioOrderClient } from '@/components/studio/StudioOrderClient';

export const metadata: Metadata = {
  title: 'Your Marketing Setup | Bootfile',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function StudioOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <><StudioHeader compact /><StudioOrderClient orderId={id} /><StudioFooter /></>;
}
