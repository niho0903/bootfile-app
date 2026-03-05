import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bootfile.ai';

export async function generateStaticParams() {
  return Object.keys(ARCHETYPES).map(id => ({ archetype: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ archetype: string }> }) {
  const { archetype } = await params;
  const arch = ARCHETYPES[archetype as ArchetypeId];
  if (!arch) return {};

  return {
    title: `I'm ${arch.name} \u2014 What's your AI style?`,
    description: arch.description,
    openGraph: {
      title: `I'm ${arch.name} \u2014 What's your AI style? | BootFile`,
      description: arch.description,
      images: [{ url: `${BASE_URL}/api/og?archetype=${archetype}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `I'm ${arch.name} \u2014 What's your AI style?`,
      description: arch.description,
      images: [`${BASE_URL}/api/og?archetype=${archetype}`],
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ archetype: string }> }) {
  const { archetype } = await params;
  const arch = ARCHETYPES[archetype as ArchetypeId];

  if (!arch) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="pt-[80px] pb-16 px-5">
        <div className="max-w-[640px] mx-auto text-center">
          {/* Archetype Card */}
          <div className="bg-white border border-[#dcd9d5] rounded-2xl p-8 md:p-10 shadow-md mb-10">
            <div
              className="w-12 h-1 rounded-full mx-auto mb-6"
              style={{ backgroundColor: arch.color }}
            />
            <div className="text-6xl mb-4">{arch.icon}</div>
            <h1 className="font-heading text-3xl md:text-4xl text-gray-900 mb-2">
              {arch.name}
            </h1>
            <p className="text-lg text-gray-500 italic mb-6">
              &ldquo;{arch.tagline}&rdquo;
            </p>
            <p className="text-base text-gray-700 leading-relaxed text-left max-w-[540px] mx-auto">
              {arch.description}
            </p>
          </div>

          {/* CTA */}
          <h2 className="font-heading text-xl text-gray-900 mb-4">
            What&apos;s your AI style?
          </h2>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center bg-[#0e6e6e] hover:bg-[#0a5454] active:bg-[#073d3d] text-white font-medium px-8 py-4 rounded-lg min-h-[52px] text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            Find out &mdash; Free quiz &rarr;
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
