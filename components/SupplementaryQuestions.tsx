'use client';

import { useState } from 'react';
import { ArchetypeId } from '@/lib/questions';
import {
  SupplementaryAnswers,
  DOMAIN_OPTIONS,
  PRIMARY_USE_OPTIONS,
  DECISION_STYLE_OPTIONS,
  RESPONSE_LENGTH_OPTIONS,
  PET_PEEVE_OPTIONS,
} from '@/lib/supplementary';

interface SupplementaryQuestionsProps {
  archetypeId: ArchetypeId;
  onSubmit: (data: SupplementaryAnswers) => void;
  isGenerating: boolean;
}

export function SupplementaryQuestions({ archetypeId, onSubmit, isGenerating }: SupplementaryQuestionsProps) {
  const [formData, setFormData] = useState<SupplementaryAnswers>({
    domain: '',
    domainOther: '',
    technicalLevel: 5,
    primaryUse: '',
    decisionStyle: '',
    responseLength: '',
    petPeeves: [],
    customAvoidances: '',
    openDescription: '',
  });

  const petPeeveOptions = PET_PEEVE_OPTIONS[archetypeId];

  const isValid =
    formData.domain !== '' &&
    (formData.domain !== 'Other' || formData.domainOther.trim().length > 0) &&
    formData.primaryUse !== '' &&
    formData.decisionStyle !== '' &&
    formData.responseLength !== '' &&
    formData.petPeeves.length >= 1 &&
    formData.openDescription.trim().length >= 10;

  const handlePetPeeveToggle = (peeve: string) => {
    setFormData(prev => {
      const already = prev.petPeeves.includes(peeve);
      if (already) {
        return { ...prev, petPeeves: prev.petPeeves.filter(p => p !== peeve) };
      }
      if (prev.petPeeves.length >= 2) return prev;
      return { ...prev, petPeeves: [...prev.petPeeves, peeve] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="text-center mb-8">
        <p className="text-sm text-gray-500">8 questions &mdash; takes about 3 minutes</p>
      </div>

      {/* Q1: Professional Domain */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          What field do you work in?
        </legend>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_OPTIONS.map(domain => (
            <button
              key={domain}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, domain, domainOther: domain === 'Other' ? prev.domainOther : '' }))}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                formData.domain === domain
                  ? 'bg-[#0e6e6e] text-white border-[#0e6e6e]'
                  : 'bg-white text-gray-700 border-[#dcd9d5] hover:border-[#0e6e6e] hover:text-[#0e6e6e]'
              }`}
            >
              {domain}
            </button>
          ))}
        </div>
        {formData.domain === 'Other' && (
          <input
            type="text"
            placeholder="Your field..."
            value={formData.domainOther}
            onChange={e => setFormData(prev => ({ ...prev, domainOther: e.target.value }))}
            className="mt-3 w-full max-w-sm px-4 py-2.5 rounded-lg border border-[#dcd9d5] bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e6e6e] focus:border-transparent"
          />
        )}
      </fieldset>

      {/* Q2: Technical Depth */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          How technical is your daily work?
        </legend>
        <div className="max-w-md">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Non-technical</span>
            <span>Highly technical</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.technicalLevel}
            onChange={e => setFormData(prev => ({ ...prev, technicalLevel: parseInt(e.target.value) }))}
            className="w-full accent-[#0e6e6e]"
          />
          <div className="text-center mt-2">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#f0fafa] text-[#0e6e6e] font-semibold text-lg">
              {formData.technicalLevel}
            </span>
          </div>
        </div>
      </fieldset>

      {/* Q3: Primary AI Use Case */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          What do you use AI for most?
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRIMARY_USE_OPTIONS.map(use => (
            <button
              key={use}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, primaryUse: use }))}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                formData.primaryUse === use
                  ? 'bg-[#0e6e6e] text-white border-[#0e6e6e]'
                  : 'bg-white text-gray-700 border-[#dcd9d5] hover:border-[#0e6e6e] hover:text-[#0e6e6e]'
              }`}
            >
              {use}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q4: Decision Style */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          When you need to make a decision, what helps most?
        </legend>
        <div className="space-y-2">
          {DECISION_STYLE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, decisionStyle: option.value }))}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all text-sm ${
                formData.decisionStyle === option.value
                  ? 'border-[#0e6e6e] bg-[#f0fafa]'
                  : 'border-[#edeae5] bg-white hover:border-[#dcd9d5]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q5: Response Length */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          How much detail do you want by default?
        </legend>
        <div className="flex flex-wrap gap-2">
          {RESPONSE_LENGTH_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, responseLength: option.value }))}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                formData.responseLength === option.value
                  ? 'bg-[#0e6e6e] text-white border-[#0e6e6e]'
                  : 'bg-white text-gray-700 border-[#dcd9d5] hover:border-[#0e6e6e] hover:text-[#0e6e6e]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q6: Pet Peeves */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-1">
          When AI gets it wrong, what bothers you most?
        </legend>
        <p className="text-xs text-gray-500 mb-3">Pick up to 2</p>
        <div className="space-y-2">
          {petPeeveOptions.map(peeve => {
            const isSelected = formData.petPeeves.includes(peeve);
            const isDisabled = !isSelected && formData.petPeeves.length >= 2;
            return (
              <button
                key={peeve}
                type="button"
                onClick={() => handlePetPeeveToggle(peeve)}
                disabled={isDisabled}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                  isSelected
                    ? 'border-[#0e6e6e] bg-[#f0fafa]'
                    : isDisabled
                    ? 'border-[#edeae5] bg-[#fdfcfb] opacity-50 cursor-not-allowed'
                    : 'border-[#edeae5] bg-white hover:border-[#dcd9d5]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-[#0e6e6e] border-[#0e6e6e]' : 'border-[#dcd9d5]'
                  }`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {peeve}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Q7: Custom Avoidances */}
      <fieldset>
        <legend className="text-base font-medium text-gray-900 mb-3">
          Any specific phrases, habits, or behaviors you want your AI to never do?
        </legend>
        <div className="relative">
          <textarea
            value={formData.customAvoidances}
            onChange={e => {
              if (e.target.value.length <= 300) {
                setFormData(prev => ({ ...prev, customAvoidances: e.target.value }));
              }
            }}
            placeholder={`e.g., "Don't start responses with 'Great question!'" or "Never use the word 'delve'" or "No em dashes"`}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-[#dcd9d5] bg-white text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0e6e6e] focus:border-transparent"
          />
          <span className="absolute bottom-2 right-3 text-xs text-gray-400">
            {formData.customAvoidances.length}/300
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Optional</p>
      </fieldset>

      {/* Q8: Open Description (KEY DIFFERENTIATOR) */}
      <fieldset className="border-2 border-[#0e6e6e] rounded-xl p-6 bg-[#f0fafa]/30">
        <legend className="text-base font-semibold text-gray-900 mb-1 px-2">
          In your own words, what do you want from your AI?
        </legend>
        <p className="text-sm text-[#0e6e6e] font-medium mb-3">
          This is the most important question. The more specific, the better.
        </p>
        <div className="relative">
          <textarea
            value={formData.openDescription}
            onChange={e => {
              if (e.target.value.length <= 500) {
                setFormData(prev => ({ ...prev, openDescription: e.target.value }));
              }
            }}
            placeholder="Describe what your ideal AI interaction looks like. What should it feel like to work with AI that truly gets you? What's missing from your current experience?"
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-[#0e6e6e]/30 bg-white text-gray-900 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#0e6e6e] focus:border-transparent"
          />
          <span className="absolute bottom-2 right-3 text-xs text-gray-400">
            {formData.openDescription.length}/500
          </span>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!isValid || isGenerating}
          className={`w-full font-medium px-8 py-4 rounded-lg min-h-[52px] text-base transition-all duration-200 ${
            isValid && !isGenerating
              ? 'bg-[#0e6e6e] hover:bg-[#0a5454] active:bg-[#073d3d] text-white hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate My BootFile'}
        </button>
      </div>
    </form>
  );
}
