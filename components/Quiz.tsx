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

  // Q9 state
  const [showOpenText, setShowOpenText] = useState(false);
  const [openQuizResponse, setOpenQuizResponse] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('bootfile_quiz');
    sessionStorage.removeItem('bootfile_output');
  }, []);

  const finishQuiz = useCallback((quizData: Record<string, unknown>) => {
    sessionStorage.setItem('bootfile_quiz', JSON.stringify(quizData));

    // Fire-and-forget tracking
    fetch('/api/track-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primary: quizData.primary,
        secondary: quizData.secondary,
        tertiary: quizData.tertiary,
        lowest: quizData.lowest,
        openResponse: quizData.openQuizResponse || '',
        consentGiven: quizData.consentChecked || false,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.quizId) {
          sessionStorage.setItem('bootfile_quiz_id', data.quizId);
        }
      })
      .catch(() => { /* non-blocking */ });

    router.push('/result');
  }, [router]);

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
        // After Q8, show optional Q9 instead of navigating directly
        const result = calculateResult(newAnswers);
        const quizData = {
          answers: newAnswers,
          scores: result.scores,
          primary: result.primary,
          secondary: result.secondary,
          tertiary: result.tertiary,
          lowest: result.lowest,
        };
        // Store quiz data temporarily so Q9 screen can access it
        sessionStorage.setItem('bootfile_quiz', JSON.stringify(quizData));
        setIsVisible(false);
        setTimeout(() => {
          setShowOpenText(true);
          setIsVisible(true);
        }, 300);
      }
    }, 400);
  }, [currentQ, answers, isTransitioning]);

  const handleQ9Submit = useCallback(() => {
    const raw = sessionStorage.getItem('bootfile_quiz');
    const quizData = raw ? JSON.parse(raw) : {};
    quizData.openQuizResponse = openQuizResponse;
    quizData.consentChecked = consentChecked;
    finishQuiz(quizData);
  }, [openQuizResponse, consentChecked, finishQuiz]);

  const handleQ9Skip = useCallback(() => {
    const raw = sessionStorage.getItem('bootfile_quiz');
    const quizData = raw ? JSON.parse(raw) : {};
    quizData.openQuizResponse = '';
    quizData.consentChecked = false;
    finishQuiz(quizData);
  }, [finishQuiz]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOpenText) return; // disable keyboard shortcuts on Q9
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
  }, [handleAnswer, isTransitioning, showOpenText]);

  const question = QUESTIONS[currentQ];
  const progressPercent = showOpenText ? 100 : (currentQ / QUESTIONS.length) * 100;
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
          {!showOpenText && (
            <span style={{ fontSize: '0.75rem', color: '#7A746B', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em' }}>
              {currentQ + 1} of {QUESTIONS.length}
            </span>
          )}
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

      {/* Q9 Open Text Screen */}
      {showOpenText ? (
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
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(1.4rem, 4vw, 1.6rem)',
                lineHeight: 1.3,
                color: '#2D2926',
                marginBottom: 12,
                letterSpacing: '-0.005em',
                fontWeight: 400,
              }}
            >
              One last thing &mdash; totally optional.
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#7A746B', lineHeight: 1.6, marginBottom: 24 }}>
              What frustrates you most when talking to AI? Your answer helps us improve BootFile for everyone.
            </p>

            <textarea
              value={openQuizResponse}
              onChange={e => setOpenQuizResponse(e.target.value.slice(0, 280))}
              placeholder="e.g. It talks too much, hedges everything, ignores what I asked..."
              maxLength={280}
              style={{
                width: '100%',
                minHeight: 120,
                padding: 16,
                borderRadius: 10,
                border: '1.5px solid #DDD6CC',
                backgroundColor: '#F7F4EF',
                fontSize: '0.95rem',
                color: '#2D2926',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#7D8B6E')}
              onBlur={e => (e.currentTarget.style.borderColor = '#DDD6CC')}
            />
            <p style={{ fontSize: '0.75rem', color: '#B0A899', textAlign: 'right', marginTop: 4 }}>
              {openQuizResponse.length}/280
            </p>

            {/* Consent checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginTop: 16,
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: '#7A746B',
                lineHeight: 1.5,
              }}
            >
              <span
                onClick={() => setConsentChecked(!consentChecked)}
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `1.5px solid ${consentChecked ? '#7D8B6E' : '#DDD6CC'}`,
                  backgroundColor: consentChecked ? '#7D8B6E' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  marginTop: 1,
                }}
              >
                {consentChecked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span onClick={() => setConsentChecked(!consentChecked)}>
                I agree that my anonymous response can be used in aggregate research to improve AI communication.{' '}
                <a href="/privacy" target="_blank" style={{ color: '#7D8B6E', textDecoration: 'underline' }}>Privacy policy</a>
              </span>
            </label>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
              <button
                onClick={handleQ9Submit}
                disabled={openQuizResponse.trim().length === 0 || !consentChecked}
                style={{
                  flex: 1,
                  backgroundColor: (openQuizResponse.trim().length > 0 && consentChecked) ? '#7D8B6E' : '#DDD6CC',
                  color: (openQuizResponse.trim().length > 0 && consentChecked) ? '#fff' : '#B0A899',
                  fontWeight: 500,
                  padding: '14px 28px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: (openQuizResponse.trim().length > 0 && consentChecked) ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                Submit
              </button>
              <button
                onClick={handleQ9Skip}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#7A746B',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  padding: '14px 16px',
                  fontFamily: 'inherit',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Question area */
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

            {/* Keyboard hint — desktop only */}
            <p
              className="keyboard-hint"
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
      )}
    </div>
  );
}
