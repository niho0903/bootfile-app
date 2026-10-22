import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operations — Bootfile',
  robots: { index: false, follow: false },
};

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
