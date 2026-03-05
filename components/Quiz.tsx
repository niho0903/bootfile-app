'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QUESTIONS, AnswerKey } from '@/lib/questions';
import { calculateResult } from '@/lib/scoring';

export function Quiz() {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerKey | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem('bootfile_quiz');
    sessionStorage.removeItem('bootfile_output');
  }, []);

  const handleAnswer = useCallback((key: AnswerKey) => {
    if (isTransitioning) return;

    setSelectedAnswer(key);
    setIsTransitioning(true);

    const newAnswers = { ...answers, [QUESTIONS[currentQ].id]: key };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentQ(currentQ + 1);
          setSelectedAnswer(null);
          setIsTransitioning(false);
          setIsVisible(true);
        }, 300);
      } else {
        const result = calculateResult(newAnswers);
        sessionStorage.setItem('bootfile_quiz', JSON.stringify({
          answers: newAnswers,
          scores: result.scores,
          primary: result.primary,
          secondary: result.secondary,
          tertiary: result.tertiary,
          lowest: result.lowest,
        }));
        router.push('/result');
      }
    }, 400);
  }, [currentQ, answers, isTransitioning, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, AnswerKey> = {
        '1': 'A', '2': 'B', '3': 'C', '4': 'D',
        'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
      };
      const answer = keyMap[e.key.toLowerCase()];
      if (answer && !isTransitioning) {
        handleAnswer(answer);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer, isTransitioning]);

  const question = QUESTIONS[currentQ];
  const progressPercent = (currentQ / QUESTIONS.length) * 100;
  const answerKeys: AnswerKey[] = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF' }}>
      {/* Progress header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'rgba(247, 244, 239, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #DDD6CC',
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="font-heading" style={{ fontSize: '1.1rem', color: '#2D2926', letterSpacing: '-0.01em', fontWeight: 400 }}>
            bootfile
          </span>
          <span style={{ fontSize: '0.75rem', color: '#7A746B', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
            {currentQ + 1} of {QUESTIONS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, backgroundColor: '#ECEAE4' }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#7D8B6E',
              width: `${progressPercent}%`,
              transition: 'width 0.4s ease',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      </div>

      {/* Question area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '100px 24px 60px',
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Question text */}
          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(1.4rem, 4vw, 1.6rem)',
              lineHeight: 1.3,
              color: '#2D2926',
              marginBottom: 28,
              letterSpacing: '-0.005em',
              fontWeight: 400,
              paddingTop: 40,
            }}
          >
            {question.text}
          </h2>

          {/* Answer cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {answerKeys.map((key) => {
              const answer = question.answers[key];
              const isSelected = selectedAnswer === key;
              const isFaded = isTransitioning && !isSelected;

              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  disabled={isTransitioning}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 20px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: isSelected ? '#7D8B6E' : '#ECEAE4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: isTransitioning ? 'default' : 'pointer',
                    opacity: isFaded ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  {/* Letter badge */}
                  <span
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: isSelected ? '#5C6650' : '#DDD6CC',
                      color: isSelected ? '#fff' : '#7A746B',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {key}
                  </span>
                  {/* Answer text */}
                  <span style={{ fontSize: '0.95rem', color: isSelected ? '#fff' : '#2D2926', lineHeight: 1.5 }}>
                    {answer.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Keyboard hint */}
          <p
            style={{
              marginTop: 28,
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#C8C0B5',
            }}
          >
            Press 1&ndash;4 or A&ndash;D to select
          </p>
        </div>
      </div>
    </div>
  );
}
