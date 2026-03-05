'use client';

import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeId } from '@/lib/questions';

interface ArchetypeRevealProps {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
}

export function ArchetypeReveal({ primary, secondary }: ArchetypeRevealProps) {
  const arch = ARCHETYPES[primary];
  const secondaryArch = secondary ? ARCHETYPES[secondary] : null;

  return (
    <div className="animate-[scaleIn_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="bg-white border border-[#dcd9d5] rounded-2xl p-8 md:p-10 shadow-md max-w-[640px] mx-auto text-center">
        {/* Color accent bar */}
        <div
          className="w-12 h-1 rounded-full mx-auto mb-6"
          style={{ backgroundColor: arch.color }}
        />

        {/* Icon */}
        <div className="text-6xl mb-4">{arch.icon}</div>

        {/* Name */}
        <h1 className="font-heading text-3xl md:text-4xl text-gray-900 mb-2">
          {arch.name}
        </h1>

        {/* Tagline */}
        <p className="text-lg text-gray-500 italic mb-6">
          &ldquo;{arch.tagline}&rdquo;
        </p>

        {/* Description */}
        <p className="text-base text-gray-700 leading-relaxed text-left max-w-[540px] mx-auto">
          {arch.description}
        </p>

        {/* Secondary badge */}
        {secondaryArch && (
          <div className="mt-6 pt-6 border-t border-[#edeae5]">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f7f6f2] text-sm text-gray-600">
              <span>{secondaryArch.icon}</span>
              You also have strong <span className="font-medium">{secondaryArch.name}</span> tendencies.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
