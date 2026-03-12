import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/json-ld';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      ...(post.updatedAt && { modifiedTime: post.updatedAt }),
      url: `${baseUrl}/blog/${post.slug}`,
      images: [{ url: `${baseUrl}/api/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`${baseUrl}/api/og`],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd(post),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Blog', href: '/blog' },
            { name: post.title, href: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Header />
      <main className="editorial-content" style={{ maxWidth: 640, margin: '0 auto', padding: '80px 20px' }}>
        <Link
          href="/blog"
          style={{
            fontSize: '0.85rem',
            color: '#7A746B',
            textDecoration: 'none',
            marginBottom: 32,
            display: 'inline-block',
          }}
        >
          &larr; Back to Blog
        </Link>

        <article>
          <h1
            className="font-heading"
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
              color: '#2D2926',
              fontWeight: 400,
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            {post.title}
          </h1>

          <time
            dateTime={post.publishedAt}
            style={{
              fontSize: '0.85rem',
              color: '#A39E95',
              display: 'block',
              marginBottom: 40,
            }}
          >
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>

          <div>
            <MarkdownRenderer content={post.body} />
          </div>
        </article>

        {/* CTA */}
        <div
          style={{
            marginTop: 48,
            padding: 32,
            backgroundColor: '#2D2926',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <p
            className="font-heading"
            style={{
              fontSize: '1.3rem',
              color: '#F7F4EF',
              fontWeight: 400,
              marginBottom: 16,
            }}
          >
            Discover how you think.
          </p>
          <Link
            href="/quiz"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 500,
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Take the Quiz
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
