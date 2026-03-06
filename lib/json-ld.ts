const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BootFile',
    url: BASE_URL,
    logo: `${BASE_URL}/api/og`,
    sameAs: [],
    description:
      'BootFile creates personalized AI instruction profiles based on how you think, not generic templates.',
  };
}

export function webApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BootFile',
    url: BASE_URL,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    description:
      'Take a short quiz to discover your AI reasoning style. Get a personalized instruction profile that works across ChatGPT, Claude, Gemini, Grok, DeepSeek, and Copilot.',
    offers: {
      '@type': 'Offer',
      name: 'BootFile',
      price: '4.99',
      priceCurrency: 'USD',
      description:
        'Personalized AI instruction profile for all 6 platforms.',
    },
    featureList: [
      'Reasoning style quiz',
      '8 AI interaction archetypes',
      'Custom instructions for ChatGPT, Claude, Gemini, Grok, DeepSeek, and Copilot',
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
    },
    image: `${BASE_URL}/api/og`,
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
