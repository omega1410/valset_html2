import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsService } from '../../services/testsService';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const TestPassing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    loadTest();
  }, [id]);

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
    try {
      const data = await testsService.getTest(Number(id));
      setTest(data);
      setAnswers(new Array(data.questions.length).fill(-1));
      
      localStorage.setItem(`page_title_/tests/${id}`, data.title);
      
    } catch (error) {
      console.error('Ошибка загрузки теста:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submitTest = async (autoSubmit = false) => {
    if (!autoSubmit && answers.includes(-1)) {
      toast.error('Ответьте на все вопросы');
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = test.time_limit - timeLeft;

    try {
      const data = await testsService.submitTest(Number(id), answers, timeSpent);
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
      console.error('Ошибка:', error);
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении результатов');
    }
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!test) return null;

  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">Результаты теста</h2>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {result.correct} / {result.total}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Правильных ответов: {result.percentage}%</p>
          <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            ⏱️ Время прохождения: {formatTime(test.time_limit - timeLeft)}
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

  const question = test.questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-4 sm:p-6">
        {/* Шапка - адаптивная для мобилок */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Вопрос {currentQuestion + 1} из {test.questions.length}
          </span>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono px-2 py-1 rounded ${getTimerColor()} ${timeLeft < 60 ? 'animate-pulse font-bold' : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </span>
            <div className="w-24 sm:w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / test.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-medium text-slate-800 dark:text-white mb-6">{question.question}</h3>

        <div className="space-y-3 mb-8">
          {question.options.map((option: string, idx: number) => (
            <label
              key={idx}
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition active:scale-[0.99] ${
                answers[currentQuestion] === idx
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <input
                type="radio"
                name="question"
                checked={answers[currentQuestion] === idx}
                onChange={() => handleAnswer(idx)}
                className="w-5 h-5 text-blue-600 shrink-0"
              />
              <span className="text-slate-700 dark:text-slate-300 text-base sm:text-sm">
                {option}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 text-slate-700 dark:text-slate-300 text-base sm:text-sm"
          >
            ← Назад
          </button>
          {currentQuestion === test.questions.length - 1 ? (
            <button
              onClick={() => submitTest(false)}
              className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-base sm:text-sm font-medium"
            >
              Завершить тест
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={answers[currentQuestion] === -1}
              className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-base sm:text-sm font-medium"
            >
              Далее →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
