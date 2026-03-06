import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import './globals.css';

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  applicationName: 'BootFile',
  authors: [{ name: 'BootFile', url: baseUrl }],
  creator: 'BootFile',
  publisher: 'BootFile',
  title: {
    default: 'BootFile | Know Your AI Style',
    template: '%s | BootFile',
  },
  description:
    'Take the free quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    siteName: 'BootFile',
    type: 'website',
    url: baseUrl,
    locale: 'en_US',
    title: 'BootFile | Know Your AI Style',
    description:
      'Take the free quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: 'BootFile | Know Your AI Style',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BootFile | Know Your AI Style',
    description:
      'Take the free quiz. Get a personalized AI instruction profile that tells your AI how to reason with you, not just how to talk.',
    images: [`${baseUrl}/api/og`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
