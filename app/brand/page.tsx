import type { Metadata } from 'next';
import { BrandStudio } from '@/components/brand/BrandStudio';
import './brand.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Brand & AI Kit — interactive preview',
  description: 'A quiz-led foundation for your business, brand and AI tools. Prelaunch prototype with private working preferences, brand choices and portable exports.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  alternates: { canonical: '/brand' },
  openGraph: { title: 'Bootfile Brand & AI Kit — preview', description: 'Define your business. Give your AI a better brief.', images: [] },
};
export default function BrandPage() {
  return <><BrandStudio /><noscript>This interactive prototype needs JavaScript. No purchase is available and no information is sent without it.</noscript></>;
}
