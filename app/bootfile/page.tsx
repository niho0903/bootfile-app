'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BootFileDisplay } from '@/components/BootFileDisplay';
import { ShareButtons } from '@/components/ShareButtons';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

export default function BootFilePage() {
  const router = useRouter();
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);

  useEffect(() => {
    const output = sessionStorage.getItem('bootfile_output');
    if (!output) {
      router.push('/');
      return;
    }
    setBootfileText(output);

    const raw = sessionStorage.getItem('bootfile_quiz');
    if (raw) {
      try {
        const quizState = JSON.parse(raw);
        setArchetypeId(quizState.primary as ArchetypeId);
      } catch {
        // Non-critical
      }
    }
  }, [router]);

  if (!bootfileText) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#0e6e6e] border-t-transparent rounded-full" />
      </div>
    );
  }

  const arch = archetypeId ? ARCHETYPES[archetypeId] : null;

  return (
    <>
      <Header />
      <main className="pt-[80px] pb-16 px-5">
        <div className="max-w-[700px] mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl md:text-3xl text-gray-900 mb-3">
              Your BootFile is ready
            </h1>
            {arch && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0fafa] text-sm text-[#0e6e6e] font-medium">
                {arch.icon} {arch.name}
              </span>
            )}
          </div>

          {/* BootFile Display */}
          <div className="bg-white border border-[#dcd9d5] rounded-2xl p-6 md:p-8 shadow-sm">
            <BootFileDisplay bootfileText={bootfileText} />
          </div>

          {/* Share */}
          {archetypeId && (
            <div className="mt-10 pt-8 border-t border-[#edeae5]">
              <p className="text-sm text-gray-500 text-center mb-4">Share your archetype</p>
              <ShareButtons archetypeId={archetypeId} />
            </div>
          )}

          {/* Start Over */}
          <div className="mt-8 text-center">
            <Link
              href="/quiz"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Start Over
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
