'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BootFilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/build');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F4EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid #7D8B6E',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
    </div>
  );
}
