import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Thinking Style Quiz',
  description:
    'Discover your AI reasoning style in 5 minutes. Eight questions reveal how you process information, make decisions, and what kind of AI output you actually find valuable.',
  alternates: {
    canonical: '/quiz',
  },
  openGraph: {
    title: 'AI Thinking Style Quiz | BootFile',
    description:
      'Discover your AI reasoning style in 5 minutes. Eight questions, eight archetypes, one personalized instruction profile.',
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
