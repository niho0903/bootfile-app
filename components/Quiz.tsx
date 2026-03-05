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
    <div style={{ minHeight: '100vh', backgroundColor: '#f7f6f2' }}>
      {/* Progress header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #edeae5',
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
          <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>
            Question {currentQ + 1} of {QUESTIONS.length}
          </span>
          <span className="font-heading" style={{ fontSize: 16, color: '#aaa' }}>
            BootFile
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, backgroundColor: '#edeae5' }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#0e6e6e',
              width: `${progressPercent}%`,
              transition: 'width 0.5s ease-out',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      </div>

      {/* Question area — vertically centered like TurboTax */}
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
            maxWidth: 600,
            width: '100%',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {/* Question number pill */}
          <div
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 9999,
              backgroundColor: '#f0fafa',
              color: '#0e6e6e',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            {currentQ + 1} / {QUESTIONS.length}
          </div>

          {/* Question text */}
          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              lineHeight: 1.3,
              color: '#1a1a1a',
              marginBottom: 36,
              letterSpacing: '-0.01em',
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
                    padding: '18px 20px',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #0e6e6e' : '2px solid #e0ddd8',
                    backgroundColor: isSelected ? '#f0fafa' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: isTransitioning ? 'default' : 'pointer',
                    opacity: isFaded ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected
                      ? '0 0 0 1px #0e6e6e, 0 2px 8px rgba(14,110,110,0.12)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  {/* Letter badge */}
                  <span
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      backgroundColor: isSelected ? '#0e6e6e' : '#f3f0ec',
                      color: isSelected ? '#fff' : '#888',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {key}
                  </span>
                  {/* Answer text */}
                  <span style={{ fontSize: 16, color: '#333', lineHeight: 1.5 }}>
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
              fontSize: 13,
              color: '#bbb',
            }}
          >
            Press 1&ndash;4 or A&ndash;D to select
          </p>
        </div>
      </div>
    </div>
  );
}
