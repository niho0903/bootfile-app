import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/quiz', '/share/', '/blog/', '/guides/', '/terms', '/privacy'],
      disallow: ['/api/', '/checkout', '/generate', '/bootfile'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
