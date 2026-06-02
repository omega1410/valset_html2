import { Link } from 'react-router-dom';
import { useTests } from '../../hooks/useTests';
import { CardSkeleton } from '../../components/SkeletonLoader';

export const TestsList = () => {
  const { data: tests, isLoading, error } = useTests();

  if (error) {
    return (
      <div className="card p-12 text-center">
        <p className="text-red-500">Ошибка загрузки тестов</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Тестирование</h1>
        <p className="page-subtitle">Проверьте свои знания</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : tests?.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Нет доступных тестов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests?.map((test: any) => (
            <Link
              key={test.id}
              to={`/tests/${test.id}`}
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
      )}
    </div>
  );
};