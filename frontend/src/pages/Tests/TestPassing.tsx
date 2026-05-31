import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testsService } from '../../services/testsService';
import toast from 'react-hot-toast';

export const TestPassing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTest();
  }, [id]);

  const loadTest = async () => {
    try {
      const data = await testsService.getTest(Number(id));
      setTest(data);
      setAnswers(new Array(data.questions.length).fill(-1));
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

  const submitTest = async () => {
    if (answers.includes(-1)) {
      toast.error('Ответьте на все вопросы');
      return;
    }

    try {
      const data = await testsService.submitTest(Number(id), answers);
      setResult(data);
      setSubmitted(true);
      toast.success('Тест завершён');
    } catch (error: any) {
      console.error('Ошибка:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при сохранении результатов';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>;
  }

  if (!test) return null;

  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">Результаты теста</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {result.correct} / {result.total}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Правильных ответов: {result.percentage}%</p>
          {result.passed ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg mb-4">Тест пройден!</div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">Тест не пройден. Попробуйте ещё раз.</div>
          )}
          <button
            onClick={() => navigate('/tests')}
            className="btn-primary"
          >
            К списку тестов
          </button>
        </div>
      </div>
    );
  }

  const question = test.questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Вопрос {currentQuestion + 1} из {test.questions.length}
          </span>
          <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${((currentQuestion + 1) / test.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-6">{question.question}</h3>

        <div className="space-y-3 mb-8">
          {question.options.map((option: string, idx: number) => (
            <label
              key={idx}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
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
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-slate-700 dark:text-slate-300">{option}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
            className="btn-outline disabled:opacity-50"
          >
            Назад
          </button>
          {currentQuestion === test.questions.length - 1 ? (
            <button
              onClick={submitTest}
              className="btn-secondary"
            >
              Завершить
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={answers[currentQuestion] === -1}
              className="btn-primary disabled:opacity-50"
            >
              Далее
            </button>
          )}
        </div>
      </div>
    </div>
  );
};