const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BootFile',
    url: BASE_URL,
    logo: `${BASE_URL}/api/og`,
    sameAs: ['https://www.instagram.com/bootfile.ai/', 'https://www.tiktok.com/@bootfileai'],
    description:
      'BootFile creates practical marketing setups and reusable AI instructions from an approved business brief.',
  };
}

export function webApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BootFile Marketing Setup',
    url: `${BASE_URL}/studio`,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    description:
      'Create one promotional email, three coordinated social posts, and a reusable AI workflow from a reviewed business brief.',
    offers: {
      '@type': 'Offer',
      name: 'Marketing Setup',
      price: '49.00',
      priceCurrency: 'USD',
      description:
        'One-time marketing setup for one business brief.',
    },
    featureList: [
      'Approved business brief',
      'One promotional email and three coordinated social posts',
      'Reusable AI context, workflow, and review checklist',
    ],
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function articleJsonLd(post: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    url: `${BASE_URL}/blog/${post.slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${post.slug}`,
    },
    datePublished: post.publishedAt,
    ...(post.updatedAt && { dateModified: post.updatedAt }),
    author: {
      '@type': 'Organization',
      name: 'BootFile',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BootFile',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/api/og`,
      },
    },
    image: `${BASE_URL}/api/og?title=${encodeURIComponent(post.title)}`,
  };
}

export function howToJsonLd(guide: {
  title: string;
  description: string;
  platform: string;
  steps: { title: string; text: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    description: guide.description,
    url: `${BASE_URL}/guides/${guide.platform}`,
    step: guide.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.title,
      text: step.text,
    })),
  };
}

export function collectionPageJsonLd(posts: { slug: string; title: string; description: string; publishedAt: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'BootFile Blog',
    description: 'Practical guides to using AI for business tasks, clear briefs, and reusable workflows.',
    url: `${BASE_URL}/blog`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE_URL}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; href: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.href}`,
    })),
  };
}
