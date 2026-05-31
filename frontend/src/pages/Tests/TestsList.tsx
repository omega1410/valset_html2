import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { testsService } from '../../services/testsService';

export const TestsList = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await testsService.getTests();
      setTests(data);
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>;
  }

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Тестирование</h1>
        <p className="page-subtitle">Проверьте свои знания</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tests.map((test: any) => (
          <Link
            key={test.section_id}
            to={`/tests/${test.section_id}`}
            className="card p-5 hover:shadow-md transition hover:border-slate-300 dark:hover:border-slate-600"
          >
            <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{test.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Вопросов: {test.questions_count}</p>
            {test.completed && (
              <div className="mt-3">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  Пройден: {test.result?.correct_answers}/{test.result?.total_questions}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};