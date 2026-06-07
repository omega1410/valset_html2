import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadTest();
  }, [id, currentPage]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const data = await testsService.getTestPaged(Number(id), currentPage);
      setTest(data);
    } catch (error) {
      console.error('Ошибка загрузки теста:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: number, answerIndex: number) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answerIndex);
    setAnswers(newAnswers);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitTest = async () => {
    const totalAnswered = answers.size;
    if (totalAnswered !== test?.total_questions) {
      toast.error(`Ответьте на все вопросы! Отвечено: ${totalAnswered} из ${test?.total_questions}`);
      return;
    }

    setSubmitting(true);
    try {
      const answersArray: number[] = [];
      for (let i = 1; i <= test!.total_questions; i++) {
        const answer = answers.get(i);
        answersArray.push(answer !== undefined ? answer : 0);
      }

      const data = await testsService.submitTest(Number(id), answersArray);
      setResult(data);
      setSubmitted(true);
      
      if (data.passed) {
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.3 } }), 200);
        setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.7 } }), 400);
        toast.success('🎉 Поздравляем! Тест пройден!');
      } else {
        toast.error('Тест не пройден. Попробуйте ещё раз!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении результатов');
    } finally {
      setSubmitting(false);
    }
  };

  // Скелетон при загрузке
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          <div className="mb-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3"></div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 p-2 mb-2">
                  <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ))}
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
          <div className="text-4xl font-bold text-blue-600 mb-2">{result.correct} / {result.total}</div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Правильных ответов: {result.percentage}%</p>
          {result.passed ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg mb-4">🎉 Тест пройден!</div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">Тест не пройден. Нужно 70% правильных ответов.</div>
          )}
          <button onClick={() => navigate('/tests')} className="btn-primary">К списку тестов</button>
        </div>
      </div>
    );
  }

  const currentQuestions = test.questions;
  const progressPercent = (answers.size / test.total_questions) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2">{test.title}</h1>
          {test.description && <p className="text-slate-500 dark:text-slate-400">{test.description}</p>}
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
            <span>Прогресс</span>
            <span>{answers.size} из {test.total_questions} вопросов</span>
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
                <h3 className="font-medium text-slate-800 dark:text-white mb-3">Вопрос {globalNum}: {question.question}</h3>
                <div className="space-y-2 ml-4">
                  {question.options.map((option, optIdx) => (
                    <label key={optIdx} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${answers.get(question.id) === optIdx ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <input type="radio" name={`question_${question.id}`} checked={answers.get(question.id) === optIdx} onChange={() => handleAnswer(question.id, optIdx)} className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-700 dark:text-slate-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {test.total_pages > 1 && (
          <div className="flex justify-center gap-2 mb-8">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50">← Назад</button>
            <span className="px-3 py-1 text-slate-600 dark:text-slate-400">Страница {currentPage} из {test.total_pages}</span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === test.total_pages} className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50">Вперед →</button>
          </div>
        )}

        {currentPage === test.total_pages && (
          <div className="flex justify-end">
            <button onClick={submitTest} disabled={submitting || answers.size !== test.total_questions} className="btn-primary disabled:opacity-50">{submitting ? 'Отправка...' : 'Завершить тест'}</button>
          </div>
        )}
      </div>
    </div>
  );
};
