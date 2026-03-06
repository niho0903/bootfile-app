'use client';

import { SupplementaryQuestions } from '@/components/SupplementaryQuestions';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';
import { SupplementaryAnswers } from '@/lib/supplementary';

interface BuildQuestionsProps {
  archetypeId: ArchetypeId;
  onSubmit: (data: SupplementaryAnswers) => void;
}

export function BuildQuestions({ archetypeId, onSubmit }: BuildQuestionsProps) {
  const arch = ARCHETYPES[archetypeId];

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 9999,
            backgroundColor: '#ECEAE4',
            fontSize: 14,
            color: '#7D8B6E',
            fontWeight: 500,
            marginBottom: 16,
          }}
        >
          {arch.icon} {arch.name}
        </span>
        <h1
          className="font-heading"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', color: '#2D2926', marginBottom: 8 }}
        >
          Let&apos;s personalize your BootFile
        </h1>
        <p style={{ color: '#7A746B' }}>
          These questions help us calibrate your BootFile to your exact needs.
        </p>
      </div>

      <SupplementaryQuestions
        archetypeId={archetypeId}
        onSubmit={onSubmit}
        isGenerating={false}
      />
    </>
  );
}
