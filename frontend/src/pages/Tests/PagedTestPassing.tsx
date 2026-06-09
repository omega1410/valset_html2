import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsService } from '../../services/testsService';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface Question {
  id: number;
  question: string;
  options: string[];
  order_num: number;
}

interface TestData {
  id: number;
  title: string;
  description: string;
  questions: Question[];
  current_page: number;
  total_pages: number;
  total_questions: number;
  questions_per_page: number;
  time_limit: number;
}

export const PagedTestPassing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    loadTest();
  }, [id, currentPage]);

  useEffect(() => {
    if (!loading && !submitted && test && test.time_limit && !timeUp) {
      setTimeLeft(test.time_limit);
      
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeUp(true);
            toast.error('⏰ Время вышло! Тест будет автоматически завершён.', {
              duration: 5000
            });
            setTimeout(() => {
              if (!submitted) submitTest(true);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, submitted, test, timeUp]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const data = await testsService.getTestPaged(Number(id), currentPage);
      setTest(data);
      
      localStorage.setItem(`page_title_/tests/${id}`, data.title);
      
    } catch (error) {
      console.error('Ошибка загрузки теста:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (globalNum: number, answerIndex: number) => {
    const newAnswers = new Map(answers);
    newAnswers.set(globalNum, answerIndex);
    setAnswers(newAnswers);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (!test?.time_limit) return 'text-slate-600 dark:text-slate-400';
    const percent = (timeLeft / test.time_limit) * 100;
    if (percent < 20) return 'text-red-600 dark:text-red-400';
    if (percent < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const submitTest = async (autoSubmit = false) => {
    const totalAnswered = answers.size;
    if (!autoSubmit && totalAnswered !== test?.total_questions) {
      toast.error(`Ответьте на все вопросы! Отвечено: ${totalAnswered} из ${test?.total_questions}`);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    setSubmitting(true);
    
    const timeSpent = (test?.time_limit || 600) - timeLeft;
    
    try {
      const answersArray: number[] = [];
      for (let i = 1; i <= test!.total_questions; i++) {
        const answer = answers.get(i);
        answersArray.push(answer !== undefined ? answer : 0);
      }

      const data = await testsService.submitTest(Number(id), answersArray, timeSpent);
      setResult(data);
      setSubmitted(true);
      
      if (data.passed) {
        confetti({ 
          particleCount: 200, 
          spread: 70, 
          origin: { y: 0.6 },
          colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']
        });
        
        setTimeout(() => {
          confetti({ 
            particleCount: 100, 
            spread: 100, 
            origin: { y: 0.5, x: 0.3 },
            colors: ['#10b981', '#34d399', '#6ee7b7']
          });
        }, 200);
        
        setTimeout(() => {
          confetti({ 
            particleCount: 100, 
            spread: 100, 
            origin: { y: 0.5, x: 0.7 },
            colors: ['#f59e0b', '#fbbf24', '#fcd34d']
          });
        }, 400);
        
        toast.success('🎉 Поздравляем! Тест пройден!', {
          duration: 5000,
          icon: '🏆'
        });
      } else {
        if (autoSubmit) {
          toast.error('⏰ Время вышло! Тест не пройден.');
        } else {
          toast.error('Тест не пройден. Попробуйте ещё раз!');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении результатов');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                  <div className="space-y-2 ml-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test) return null;

  if (submitted && result) {
    const timeSpent = (test.time_limit || 600) - timeLeft;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">Результаты теста</h2>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {result.correct} / {result.total}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Правильных ответов: {result.percentage}%</p>
          <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            ⏱️ Время прохождения: {formatTime(timeSpent)}
          </div>
          {result.passed ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg mb-4">🎉 Тест пройден!</div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">❌ Тест не пройден. Нужно 70% правильных ответов.</div>
          )}
          <button onClick={() => navigate('/tests')} className="btn-primary">
            К списку тестов
          </button>
        </div>
      </div>
    );
  }

  const currentQuestions = test.questions;
  const progressPercent = (answers.size / test.total_questions) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white mb-2">{test.title}</h1>
          {test.description && <p className="text-sm text-slate-500 dark:text-slate-400">{test.description}</p>}
        </div>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between text-sm text-slate-600 dark:text-slate-400 mb-1 gap-2">
            <span>Прогресс</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-mono px-2 py-0.5 rounded ${getTimerColor()} ${timeLeft < 60 ? 'animate-pulse font-bold' : ''}`}>
                ⏱️ {formatTime(timeLeft)}
              </span>
              <span>{answers.size} из {test.total_questions} вопросов</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {currentQuestions.map((question, idx) => {
            const globalNum = (test.current_page - 1) * test.questions_per_page + idx + 1;
            return (
              <div key={question.id} className="border-b border-slate-200 dark:border-slate-700 pb-4">
                <h3 className="font-medium text-slate-800 dark:text-white mb-3 text-base sm:text-base">
                  Вопрос {globalNum}: {question.question}
                </h3>
                <div className="space-y-2 ml-4">
                  {question.options.map((option, optIdx) => (
                    <label 
                      key={optIdx} 
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition active:scale-[0.99] ${
                        answers.get(globalNum) === optIdx 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-500' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name={`question_${globalNum}`}
                        checked={answers.get(globalNum) === optIdx}
                        onChange={() => handleAnswer(globalNum, optIdx)} 
                        className="w-5 h-5 text-blue-600 shrink-0" 
                      />
                      <span className="text-slate-700 dark:text-slate-300 text-base sm:text-sm">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {test.total_pages > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button 
              onClick={() => goToPage(currentPage - 1)} 
              disabled={currentPage === 1} 
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
            >
              ← Назад
            </button>
            <span className="px-3 py-2 text-slate-600 dark:text-slate-400 text-sm">
              Страница {currentPage} из {test.total_pages}
            </span>
            <button 
              onClick={() => goToPage(currentPage + 1)} 
              disabled={currentPage === test.total_pages} 
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
            >
              Вперед →
            </button>
          </div>
        )}

        {currentPage === test.total_pages && (
          <div className="flex justify-end">
            <button 
              onClick={() => submitTest(false)} 
              disabled={submitting || answers.size !== test.total_questions} 
              className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 text-base sm:text-sm font-medium"
            >
              {submitting ? 'Отправка...' : 'Завершить тест'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
