import { Suspense } from 'react';
import { ReportView } from './ReportView';

export const metadata = {
  title: 'Companion Report | BootFile',
  description: 'A printable companion report for your archetype.',
  robots: { index: false, follow: false },
};

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportView />
    </Suspense>
  );
}
