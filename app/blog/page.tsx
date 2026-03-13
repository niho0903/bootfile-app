import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/json-ld';
import { getAllPosts } from '@/lib/blog';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Tips, insights, and guides on getting more from AI with personalized instruction profiles.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <JsonLd
        data={[
          collectionPageJsonLd(posts),
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Blog', href: '/blog' },
          ]),
        ]}
      />
      <Header />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '80px 20px' }}>
        <h1
          className="font-heading"
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.5rem)',
            color: '#2D2926',
            fontWeight: 400,
            marginBottom: 8,
          }}
        >
          Blog
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#7A746B', marginBottom: 48, lineHeight: 1.6 }}>
          Ideas on making AI work the way you think.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {posts.map((post) => (
            <article key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <h2
                  className="font-heading"
                  style={{
                    fontSize: '1.35rem',
                    color: '#2D2926',
                    fontWeight: 400,
                    marginBottom: 8,
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </h2>
              </Link>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#7A746B',
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}
              >
                {post.description}
              </p>
              <div style={{ fontSize: '0.82rem', color: '#A39E95', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {post.author && ARCHETYPES[post.author as ArchetypeId] && (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>{ARCHETYPES[post.author as ArchetypeId].icon}</span>
                      <span style={{ color: '#7A746B' }}>{ARCHETYPES[post.author as ArchetypeId].name}</span>
                    </span>
                    <span>&middot;</span>
                  </>
                )}
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span>&middot;</span>
                <span>{Math.max(1, Math.round(post.body.split(/\s+/).length / 230))} min read</span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
