import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTests } from '../../hooks/useTests';
import { CardSkeleton } from '../../components/SkeletonLoader';

export const TestsList = () => {
  const { data: tests, isLoading, error } = useTests();
  const [activeTab, setActiveTab] = useState<'simple' | 'extended'>('simple');

  if (error) {
    return (
      <div className="card p-12 text-center">
        <p className="text-red-500">Ошибка загрузки тестов</p>
      </div>
    );
  }

  const simpleTests = tests?.filter((t: any) => t.questions_count <= 10) || [];
  const extendedTests = tests?.filter((t: any) => t.questions_count > 10) || [];

  const currentTests = activeTab === 'simple' ? simpleTests : extendedTests;

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Тестирование</h1>
        <p className="page-subtitle">Проверьте свои знания</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setActiveTab('simple')} className={`px-4 py-2 font-medium transition ${activeTab === 'simple' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Обычные тесты {simpleTests.length > 0 && <span className="ml-1 text-xs">({simpleTests.length})</span>}
        </button>
        <button onClick={() => setActiveTab('extended')} className={`px-4 py-2 font-medium transition ${activeTab === 'extended' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
          Расширенные тесты {extendedTests.length > 0 && <span className="ml-1 text-xs">({extendedTests.length})</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (<CardSkeleton key={i} />))}
        </div>
      ) : currentTests.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">{activeTab === 'simple' ? 'Нет обычных тестов' : 'Нет расширенных тестов'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentTests.map((test: any) => {
            const testUrl = activeTab === 'extended' ? `/tests/${test.id}/paged` : `/tests/${test.id}`;
            return (
              <Link key={test.id} to={testUrl} className="card p-5 hover:shadow-md transition hover:border-slate-300 dark:hover:border-slate-600">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{test.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Вопросов: {test.questions_count}</p>
                {activeTab === 'extended' && <span className="inline-block mt-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">Расширенный тест</span>}
                {test.completed && (
                  <div className="mt-3">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Пройден: {test.result?.correct_answers}/{test.result?.total_questions}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
