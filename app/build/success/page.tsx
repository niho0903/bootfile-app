'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BuildUnlocked } from '@/components/build/BuildUnlocked';
import { ArchetypeId } from '@/lib/questions';
import { PlatformId } from '@/lib/platform-variants';
import { useBrowserStorage } from '@/lib/use-browser-storage';

export default function BuildSuccessPage() {
  const router = useRouter();
  const bootfileText = useBrowserStorage('bootfile_output');
  const rawVariants = useBrowserStorage('bootfile_variants');
  const rawQuiz = useBrowserStorage('bootfile_quiz');
  const variants = useMemo(() => {
    try {
      return rawVariants ? JSON.parse(rawVariants) as Record<PlatformId, string> : null;
    } catch { return null; }
  }, [rawVariants]);
  const archetypeId = useMemo(() => {
    try {
      return rawQuiz ? (JSON.parse(rawQuiz)?.primary as ArchetypeId | null) : null;
    } catch { return null; }
  }, [rawQuiz]);

  useEffect(() => {
    if (bootfileText !== undefined && !bootfileText) router.replace('/quiz');
  }, [bootfileText, router]);

  if (!bootfileText) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #7D8B6E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 80, paddingBottom: 64, padding: '80px 20px 64px' }}>
        <BuildUnlocked bootfileText={bootfileText} archetypeId={archetypeId || 'surgeon'} variants={variants} />
      </main>
      <Footer />
    </>
  );
}
