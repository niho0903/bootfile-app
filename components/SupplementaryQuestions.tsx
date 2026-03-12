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
    email: '',
    domain: '',
    domainOther: '',
    technicalLevel: 5,
    primaryUses: [],
    decisionStyle: '',
    responseLength: '',
    petPeeves: [],
    customAvoidances: '',
    openDescription: '',
  });

  const petPeeveOptions = PET_PEEVE_OPTIONS[archetypeId];

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const isValid =
    isValidEmail &&
    formData.domain !== '' &&
    (formData.domain !== 'Other' || formData.domainOther.trim().length > 0) &&
    formData.primaryUses.length >= 1 &&
    formData.decisionStyle !== '' &&
    formData.responseLength !== '' &&
    formData.petPeeves.length >= 1 &&
    formData.openDescription.trim().length >= 10;

  const handlePrimaryUseToggle = (use: string) => {
    setFormData(prev => {
      const already = prev.primaryUses.includes(use);
      if (already) {
        return { ...prev, primaryUses: prev.primaryUses.filter(u => u !== use) };
      }
      return { ...prev, primaryUses: [...prev.primaryUses, use] };
    });
  };

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
    borderColor: selected ? '#7D8B6E' : '#DDD6CC',
    backgroundColor: selected ? '#7D8B6E' : '#fff',
    color: selected ? '#fff' : '#7A746B',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const legendStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 500,
    color: '#2D2926',
    marginBottom: 12,
  };

  const radioCardStyle = (selected: boolean): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left' as const,
    padding: 16,
    borderRadius: 8,
    border: `2px solid ${selected ? '#7D8B6E' : '#DDD6CC'}`,
    backgroundColor: selected ? '#ECEAE4' : '#ECEAE4',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 14, color: '#7A746B' }}>A few quick questions to personalize your BootFile</p>
      </div>

      {/* Email */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          Your email
        </legend>
        <p style={{ fontSize: 13, color: '#7A746B', marginBottom: 8, lineHeight: 1.5 }}>
          We&apos;ll send your BootFile here so you don&apos;t lose it. Also used for your receipt.
        </p>
        <input
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          style={{
            width: '100%',
            maxWidth: 384,
            padding: '10px 16px',
            borderRadius: 8,
            border: `1px solid ${formData.email.length > 0 && !isValidEmail ? '#DC2626' : '#DDD6CC'}`,
            backgroundColor: '#fff',
            color: '#2D2926',
            fontSize: 14,
            outline: 'none',
          }}
          onFocus={e => {
            e.currentTarget.style.boxShadow = '0 0 0 2px #7D8B6E';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          onBlur={e => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = formData.email.length > 0 && !isValidEmail ? '#DC2626' : '#DDD6CC';
          }}
        />
      </fieldset>

      {/* Q1: What's your world? */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          What&apos;s your world?
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
                  e.currentTarget.style.borderColor = '#7D8B6E';
                  e.currentTarget.style.color = '#7D8B6E';
                }
              }}
              onMouseLeave={e => {
                if (formData.domain !== domain) {
                  e.currentTarget.style.borderColor = '#DDD6CC';
                  e.currentTarget.style.color = '#7A746B';
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
            placeholder="Tell us more..."
            value={formData.domainOther}
            onChange={e => setFormData(prev => ({ ...prev, domainOther: e.target.value }))}
            style={{
              marginTop: 12,
              width: '100%',
              maxWidth: 384,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #DDD6CC',
              backgroundColor: '#fff',
              color: '#2D2926',
              fontSize: 14,
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #7D8B6E';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#DDD6CC';
            }}
          />
        )}
      </fieldset>

      {/* Q2: Technical depth */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={legendStyle}>
          How technical do you get?
        </legend>
        <div style={{ maxWidth: 448 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#7A746B', marginBottom: 8 }}>
            <span>Not at all</span>
            <span>Very</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.technicalLevel}
            onChange={e => setFormData(prev => ({ ...prev, technicalLevel: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: '#7D8B6E' }}
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
                backgroundColor: '#ECEAE4',
                color: '#7D8B6E',
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              {formData.technicalLevel}
            </span>
          </div>
        </div>
      </fieldset>

      {/* Q3: AI Use Cases — multi-select */}
      <fieldset style={{ border: 'none', padding: 0, marginBottom: 40 }}>
        <legend style={{ ...legendStyle, marginBottom: 4 }}>
          What do you use AI for?
        </legend>
        <p style={{ fontSize: 12, color: '#7A746B', marginBottom: 12 }}>Select all that apply</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRIMARY_USE_OPTIONS.map(use => {
            const isSelected = formData.primaryUses.includes(use);
            return (
              <button
                key={use}
                type="button"
                onClick={() => handlePrimaryUseToggle(use)}
                style={pillStyle(isSelected)}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#7D8B6E';
                    e.currentTarget.style.color = '#7D8B6E';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#DDD6CC';
                    e.currentTarget.style.color = '#7A746B';
                  }
                }}
              >
                {use}
              </button>
            );
          })}
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
                  e.currentTarget.style.borderColor = '#C8C0B5';
                }
              }}
              onMouseLeave={e => {
                if (formData.decisionStyle !== option.value) {
                  e.currentTarget.style.borderColor = '#DDD6CC';
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
                  e.currentTarget.style.borderColor = '#7D8B6E';
                  e.currentTarget.style.color = '#7D8B6E';
                }
              }}
              onMouseLeave={e => {
                if (formData.responseLength !== option.value) {
                  e.currentTarget.style.borderColor = '#DDD6CC';
                  e.currentTarget.style.color = '#7A746B';
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
        <p style={{ fontSize: 12, color: '#7A746B', marginBottom: 12 }}>Pick 1 or 2</p>
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
                  border: `2px solid ${isSelected ? '#7D8B6E' : '#DDD6CC'}`,
                  backgroundColor: isSelected ? '#ECEAE4' : isDisabled ? '#F7F4EF' : '#ECEAE4',
                  fontSize: 14,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.borderColor = '#C8C0B5';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.borderColor = '#DDD6CC';
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
                      border: `2px solid ${isSelected ? '#7D8B6E' : '#DDD6CC'}`,
                      backgroundColor: isSelected ? '#7D8B6E' : 'transparent',
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
              border: '1px solid #DDD6CC',
              backgroundColor: '#fff',
              color: '#2D2926',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #7D8B6E';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#DDD6CC';
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#7A746B' }}>
            {formData.customAvoidances.length}/300
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#7A746B', marginTop: 4 }}>Optional</p>
      </fieldset>

      {/* Q8: Open Description (KEY DIFFERENTIATOR) */}
      <fieldset
        style={{
          border: '2px solid #7D8B6E',
          borderRadius: 12,
          padding: 24,
          backgroundColor: 'rgba(236, 234, 228, 0.3)',
          marginBottom: 40,
        }}
      >
        <legend
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#2D2926',
            marginBottom: 4,
            padding: '0 8px',
          }}
        >
          In your own words, what do you want from your AI?
        </legend>
        <p style={{ fontSize: 14, color: '#7D8B6E', fontWeight: 500, marginBottom: 4 }}>
          This is the most important question.
        </p>
        <p style={{ fontSize: 13, color: '#7A746B', marginBottom: 12, lineHeight: 1.5 }}>
          Write this the way you&apos;d want your AI to talk to you. Your tone here becomes its tone.
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            value={formData.openDescription}
            onChange={e => {
              if (e.target.value.length <= 500) {
                setFormData(prev => ({ ...prev, openDescription: e.target.value }));
              }
            }}
            placeholder="Be direct if you want direct. Be casual if you want casual. Tell it what matters to you and how you want it to think with you."
            rows={6}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid rgba(125, 139, 110, 0.3)',
              backgroundColor: '#fff',
              color: '#2D2926',
              fontSize: 16,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #7D8B6E';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(125, 139, 110, 0.3)';
            }}
          />
          <span style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#7A746B' }}>
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
            backgroundColor: isValid && !isGenerating ? '#7D8B6E' : '#d4d1ca',
            color: isValid && !isGenerating ? '#fff' : '#7A746B',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (isValid && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#5C6650';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={e => {
            if (isValid && !isGenerating) {
              e.currentTarget.style.backgroundColor = '#7D8B6E';
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
