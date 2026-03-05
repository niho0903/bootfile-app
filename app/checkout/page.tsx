'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('bootfile_quiz');
    if (!raw) {
      router.push('/');
      return;
    }

    let quizState: { primary: string; scores: Record<string, number> };
    try {
      quizState = JSON.parse(raw);
    } catch {
      router.push('/');
      return;
    }

    const createCheckout = async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archetypeId: quizState.primary,
            scoresJson: JSON.stringify(quizState.scores),
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || 'Failed to create checkout session');
        }
      } catch (err) {
        setError('Something went wrong. Please try again.');
      }
    };

    createCheckout();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="bg-[#0e6e6e] hover:bg-[#0a5454] text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#0e6e6e] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Setting up your BootFile...</p>
      </div>
    </div>
  );
}
