'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BuildUnlocked } from '@/components/build/BuildUnlocked';
import { ArchetypeId } from '@/lib/questions';

export default function BuildSuccessPage() {
  const router = useRouter();
  const [bootfileText, setBootfileText] = useState<string | null>(null);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);

  useEffect(() => {
    // Read bootfile from localStorage
    const output = localStorage.getItem('bootfile_output');
    if (!output) {
      // No bootfile — redirect to quiz
      router.push('/quiz');
      return;
    }

    setBootfileText(output);

    // Get archetype from quiz state
    try {
      const raw = localStorage.getItem('quiz_state');
      if (raw) {
        const state = JSON.parse(raw);
        setArchetypeId(state.primary as ArchetypeId);
      }
    } catch { /* */ }

    // Fire conversion pixels
    try {
      // Reddit pixel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.rdt) {
        (w.rdt as (...args: unknown[]) => void)('track', 'Purchase', {
          value: 4.99,
          currency: 'USD',
          itemCount: 1,
        });
      }
    } catch { /* pixel not loaded */ }

    try {
      // Google Ads gtag conversion (will fire if gtag is loaded)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.gtag) {
        (w.gtag as (...args: unknown[]) => void)('event', 'conversion', {
          send_to: 'AW-18052246616/idTcCMD71ZIcENjY_Z9D',
          value: 1.0,
          currency: 'USD',
          transaction_id: localStorage.getItem('bootfile_payment_intent') || '',
        });
      }
    } catch { /* gtag not loaded */ }
  }, [router]);

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
        <BuildUnlocked bootfileText={bootfileText} archetypeId={archetypeId || 'surgeon'} />
      </main>
      <Footer />
    </>
  );
}
