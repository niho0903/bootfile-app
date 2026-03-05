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

  // Clear prior quiz state on mount
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
        // Final answer — calculate and save
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

  // Keyboard support
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
    <div className="min-h-screen bg-[#f7f6f2]">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#edeae5]">
        <div className="max-w-[960px] mx-auto px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">
            Question {currentQ + 1} of {QUESTIONS.length}
          </span>
          <span className="text-sm text-gray-400">BootFile</span>
        </div>
        <div className="h-1 bg-[#edeae5]">
          <div
            className="h-full bg-[#0e6e6e] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="pt-24 pb-16 px-5">
        <div
          className="max-w-[640px] mx-auto transition-opacity duration-300"
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <h2 className="font-heading text-2xl md:text-3xl text-gray-900 mb-8 leading-snug">
            {question.text}
          </h2>

          <div className="space-y-3">
            {answerKeys.map((key) => {
              const answer = question.answers[key];
              const isSelected = selectedAnswer === key;

              return (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  disabled={isTransitioning}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-start gap-4 min-h-[56px] ${
                    isSelected
                      ? 'border-[#0e6e6e] bg-[#f0fafa]'
                      : 'border-[#edeae5] bg-white hover:border-[#dcd9d5] hover:bg-[#fdfcfb]'
                  } ${isTransitioning && !isSelected ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-[#0e6e6e] text-white'
                        : 'bg-[#f7f6f2] text-gray-500'
                    }`}
                  >
                    {key}
                  </span>
                  <span className="text-base text-gray-800 pt-1">
                    {answer.text}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Press 1-4 or A-D to select
          </p>
        </div>
      </div>
    </div>
  );
}
