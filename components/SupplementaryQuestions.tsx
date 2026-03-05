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

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid',
    borderColor: selected ? '#0e6e6e' : '#dcd9d5',
    backgroundColor: selected ? '#0e6e6e' : '#fff',
    color: selected ? '#fff' : '#555',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const legendStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 500,
    color: '#1a1a1a',
    marginBottom: 12,
  };

  const radioCardStyle = (selected: boolean): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left' as const,
    padding: 16,
    borderRadius: 8,
    border: `2px solid ${selected ? '#0e6e6e' : '#edeae5'}`,
    backgroundColor: selected ? '#f0fafa' : '#fff',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 14, color: '#999' }}>8 questions &mdash; takes about 3 minutes</p>
      </div>

      {/* Q1: Professional Domain */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          What field do you work in?
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DOMAIN_OPTIONS.map(domain => (
            <button
              key={domain}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, domain, domainOther: domain === 'Other' ? prev.domainOther : '' }))}
              style={pillStyle(formData.domain === domain)}
              onMouseEnter={e => {
                if (formData.domain !== domain) {
                  e.currentTarget.style.borderColor = '#0e6e6e';
                  e.currentTarget.style.color = '#0e6e6e';
                }
              }}
              onMouseLeave={e => {
                if (formData.domain !== domain) {
                  e.currentTarget.style.borderColor = '#dcd9d5';
                  e.currentTarget.style.color = '#555';
                }
              }}
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
            style={{
              marginTop: 12,
              width: '100%',
              maxWidth: 384,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #dcd9d5',
              backgroundColor: '#fff',
              color: '#1a1a1a',
              fontSize: 14,
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #0e6e6e';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#dcd9d5';
            }}
          />
        )}
      </fieldset>

      {/* Q2: Technical Depth */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          How technical is your daily work?
        </legend>
        <div style={{ maxWidth: 448 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999', marginBottom: 8 }}>
            <span>Non-technical</span>
            <span>Highly technical</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.technicalLevel}
            onChange={e => setFormData(prev => ({ ...prev, technicalLevel: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: '#0e6e6e' }}
          />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#f0fafa',
                color: '#0e6e6e',
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              {formData.technicalLevel}
            </span>
          </div>
        </div>
      </fieldset>

      {/* Q3: Primary AI Use Case */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          What do you use AI for most?
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRIMARY_USE_OPTIONS.map(use => (
            <button
              key={use}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, primaryUse: use }))}
              style={pillStyle(formData.primaryUse === use)}
              onMouseEnter={e => {
                if (formData.primaryUse !== use) {
                  e.currentTarget.style.borderColor = '#0e6e6e';
                  e.currentTarget.style.color = '#0e6e6e';
                }
              }}
              onMouseLeave={e => {
                if (formData.primaryUse !== use) {
                  e.currentTarget.style.borderColor = '#dcd9d5';
                  e.currentTarget.style.color = '#555';
                }
              }}
            >
              {use}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q4: Decision Style */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          When you need to make a decision, what helps most?
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DECISION_STYLE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, decisionStyle: option.value }))}
              style={radioCardStyle(formData.decisionStyle === option.value)}
              onMouseEnter={e => {
                if (formData.decisionStyle !== option.value) {
                  e.currentTarget.style.borderColor = '#dcd9d5';
                }
              }}
              onMouseLeave={e => {
                if (formData.decisionStyle !== option.value) {
                  e.currentTarget.style.borderColor = '#edeae5';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q5: Response Length */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          How much detail do you want by default?
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {RESPONSE_LENGTH_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, responseLength: option.value }))}
              style={pillStyle(formData.responseLength === option.value)}
              onMouseEnter={e => {
                if (formData.responseLength !== option.value) {
                  e.currentTarget.style.borderColor = '#0e6e6e';
                  e.currentTarget.style.color = '#0e6e6e';
                }
              }}
              onMouseLeave={e => {
                if (formData.responseLength !== option.value) {
                  e.currentTarget.style.borderColor = '#dcd9d5';
                  e.currentTarget.style.color = '#555';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Q6: Pet Peeves */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={{ ...legendStyle, marginBottom: 4 }}>
          When AI gets it wrong, what bothers you most?
        </legend>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Pick up to 2</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {petPeeveOptions.map(peeve => {
            const isSelected = formData.petPeeves.includes(peeve);
            const isDisabled = !isSelected && formData.petPeeves.length >= 2;
            return (
              <button
                key={peeve}
                type="button"
                onClick={() => handlePetPeeveToggle(peeve)}
                disabled={isDisabled}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 8,
                  border: `2px solid ${isSelected ? '#0e6e6e' : '#edeae5'}`,
                  backgroundColor: isSelected ? '#f0fafa' : isDisabled ? '#fdfcfb' : '#fff',
                  fontSize: 14,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.borderColor = '#dcd9d5';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.borderColor = '#edeae5';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `2px solid ${isSelected ? '#0e6e6e' : '#dcd9d5'}`,
                      backgroundColor: isSelected ? '#0e6e6e' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
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
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          Any specific phrases, habits, or behaviors you want your AI to never do?
        </legend>
        <div style={{ position: 'relative' }}>
          <textarea
            value={formData.customAvoidances}
            onChange={e => {
              if (e.target.value.length <= 300) {
                setFormData(prev => ({ ...prev, customAvoidances: e.target.value }));
              }
            }}
            placeholder={`e.g., "Don't start responses with 'Great question!'" or "Never use the word 'delve'" or "No em dashes"`}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #dcd9d5',
              backgroundColor: '#fff',
              color: '#1a1a1a',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #0e6e6e';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#dcd9d5';
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#999' }}>
            {formData.customAvoidances.length}/300
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Optional</p>
      </fieldset>

      {/* Q8: Open Description (KEY DIFFERENTIATOR) */}
      <fieldset
        style={{
          border: '2px solid #0e6e6e',
          borderRadius: 12,
          padding: 24,
          backgroundColor: 'rgba(240, 250, 250, 0.3)',
          marginBottom: 40,
        }}
      >
        <legend
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: 4,
            padding: '0 8px',
          }}
        >
          In your own words, what do you want from your AI?
        </legend>
        <p style={{ fontSize: 14, color: '#0e6e6e', fontWeight: 500, marginBottom: 12 }}>
          This is the most important question. The more specific, the better.
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            value={formData.openDescription}
            onChange={e => {
              if (e.target.value.length <= 500) {
                setFormData(prev => ({ ...prev, openDescription: e.target.value }));
              }
            }}
            placeholder="Describe what your ideal AI interaction looks like. What should it feel like to work with AI that truly gets you? What's missing from your current experience?"
            rows={6}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid rgba(14, 110, 110, 0.3)',
              backgroundColor: '#fff',
              color: '#1a1a1a',
              fontSize: 16,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #0e6e6e';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(14, 110, 110, 0.3)';
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#999' }}>
            {formData.openDescription.length}/500
          </span>
        </div>
      </fieldset>

      {/* Submit */}
      <div style={{ paddingTop: 16 }}>
        <button
          type="submit"
          disabled={!isValid || isGenerating}
          style={{
            width: '100%',
            fontWeight: 600,
            padding: '16px 32px',
            borderRadius: 12,
            minHeight: 52,
            fontSize: 16,
            border: 'none',
            cursor: isValid && !isGenerating ? 'pointer' : 'not-allowed',
            backgroundColor: isValid && !isGenerating ? '#0e6e6e' : '#d4d1ca',
            color: isValid && !isGenerating ? '#fff' : '#999',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (isValid && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#0a5454';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={e => {
            if (isValid && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#0e6e6e';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
          onMouseDown={e => {
            if (isValid && !isGenerating) {
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate My BootFile'}
        </button>
      </div>
    </form>
  );
}
