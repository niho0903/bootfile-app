import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Archetype Simulator',
  description:
    'Enter one prompt and see how four different AI thinking styles respond. Compare The Surgeon, The Architect, The Sparring Partner, and The Maker side by side.',
  alternates: {
    canonical: '/simulator',
  },
  openGraph: {
    title: 'AI Archetype Simulator | BootFile',
    description:
      'Same prompt. Four thinking styles. See which AI response feels most like you.',
    url: '/simulator',
  },
};

export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
