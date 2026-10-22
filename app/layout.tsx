import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import { PublicAnalytics } from '@/components/PublicAnalytics';
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
    default: 'BootFile | Your next marketing task, ready to use',
    template: '%s | BootFile',
  },
  description:
    'Turn your business brief into a promotional email, three coordinated social posts, and a reusable AI setup. One task, one payment, a clear place to start.',
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    siteName: 'BootFile',
    type: 'website',
    url: baseUrl,
    locale: 'en_US',
    title: 'BootFile | Your next marketing task, ready to use',
    description:
      'A marketing setup for solo service businesses: one promotional email, three social posts, and a reusable workflow built from your approved brief.',
    images: [
      {
        url: `${baseUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: 'BootFile | Your next marketing task, ready to use',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BootFile | Your next marketing task, ready to use',
    description:
      'A marketing setup for solo service businesses: one promotional email, three social posts, and a reusable workflow built from your approved brief.',
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
        <PublicAnalytics />
      </body>
    </html>
  );
}
