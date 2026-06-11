import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Attempt {
  id: number;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent: number | null;
  created_at: string;
}

interface AttemptDetail {
  question: string;
  options: string[];
  user_answer: number;
  is_correct: boolean;
}

export const TestAttempts = ({ testId, onClose }: { testId: number; onClose: () => void }) => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<AttemptDetail[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadAttempts();
  }, [testId]);

  const loadAttempts = async () => {
    try {
      const response = await api.get(`/tests/${testId}/attempts`);
      setAttempts(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  };

  const loadAttemptDetails = async (attemptId: number) => {
    setDetailsLoading(true);
    try {
      const response = await api.get(`/tests/${testId}/attempt/${attemptId}`);
      setAttemptDetails(response.data.details);
      setSelectedAttempt(attemptId);
    } catch (error) {
      toast.error('Ошибка загрузки деталей');
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            История попыток
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">Загрузка...</div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              У вас пока нет попыток прохождения этого теста
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Все попытки ({attempts.length})
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {attempts.map((attempt) => (
                    <button
                      key={attempt.id}
                      onClick={() => loadAttemptDetails(attempt.id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedAttempt === attempt.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-500'
                          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Попытка #{attempt.id}</span>
                        <span className={`text-sm font-bold ${getScoreColor(attempt.score)}`}>
                          {attempt.score}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <div>{formatDate(attempt.created_at)}</div>
                        <div>{attempt.correct_answers}/{attempt.total_questions}</div>
                        {attempt.time_spent && <div>{formatTime(attempt.time_spent)}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                {detailsLoading ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">Загрузка деталей...</div>
                ) : selectedAttempt && attemptDetails ? (
                  <div>
                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Детали попытки #{selectedAttempt}
                    </h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {attemptDetails.map((detail, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            detail.is_correct
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-lg">
                              {detail.is_correct ? '✅' : '❌'}
                            </span>
                            <p className="font-medium text-slate-800 dark:text-white">
                              {detail.question}
                            </p>
                          </div>
                          <div className="ml-7 space-y-1 text-sm">
                            {detail.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-1 rounded ${
                                  optIdx === detail.user_answer
                                    ? detail.is_correct
                                      ? 'bg-emerald-200 dark:bg-emerald-800/50 font-medium'
                                      : 'bg-red-200 dark:bg-red-800/50 font-medium'
                                    : ''
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                                {optIdx === detail.user_answer && (
                                  <span className="ml-2 text-xs">
                                    {detail.is_correct ? '(Ваш ответ ✓)' : '(Ваш ответ ✗)'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedAttempt ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    Выберите попытку для просмотра деталей
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    Выберите попытку
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
