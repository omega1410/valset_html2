import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checklistsService } from '../../services/checklistsService';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { ChecklistSkeleton } from '../../components/SkeletonLoader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ChecklistDetail = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hintTaskName, setHintTaskName] = useState('');

  useEffect(() => {
    loadChecklist();
  }, [type]);

  const loadChecklist = async () => {
    try {
      const data = await checklistsService.getChecklist(type as string);
      setChecklist(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      navigate('/checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: number, isDone: boolean) => {
    try {
      const response = await checklistsService.toggleTask(type as string, taskId, !isDone);
      await loadChecklist();
      
      if (response.reset) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
        });
        
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.5, x: 0.5 },
            colors: ['#f59e0b', '#fbbf24']
          });
        }, 250);
        
        toast.success('🎉 Поздравляем! Чек-лист выполнен!', {
          duration: 5000,
          icon: '✅'
        });
      } else {
        toast.success(isDone ? 'Задача отмечена как невыполненная' : 'Задача выполнена');
      }
    } catch (error) {
      toast.error('Ошибка при обновлении');
    }
  };

  const handleReset = async () => {
    if (confirm('Сбросить все задачи?')) {
      try {
        await checklistsService.resetChecklist(type as string);
        await loadChecklist();
        toast.success('Чек-лист сброшен');
      } catch (error) {
        toast.error('Ошибка при сбросе');
      }
    }
  };

  if (loading) {
    return <ChecklistSkeleton />;
  }

  if (!checklist) return null;

  const completedCount = checklist.tasks.filter((t: any) => t.is_done).length;
  const percentage = checklist.percentage;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/checklists')}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Назад
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"
        >
          Сбросить всё
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">{checklist.name}</h1>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
              <span>Прогресс</span>
              <span>{completedCount} из {checklist.total}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
          
          {percentage === 100 && checklist.total > 0 && (
            <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 animate-pulse">
              🎉 Поздравляем! Все задачи выполнены!
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {checklist.tasks.map((task: any) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
            >
              <div
                onClick={() => handleToggleTask(task.id, task.is_done)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition cursor-pointer ${
                  task.is_done
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                }`}
              >
                {(task.is_done == 1 || task.is_done === true) && (
                  <svg 
                    className="w-3 h-3 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                )}
              </div>
              
              <span
                onClick={() => handleToggleTask(task.id, task.is_done)}
                className={`flex-1 text-slate-700 dark:text-slate-300 transition cursor-pointer ${
                  task.is_done ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}
              >
                {task.text}
              </span>
              
              {task.hint && (
                <button
                  onClick={() => {
                    setHintText(task.hint);
                    setHintTaskName(task.text);
                    setShowHintModal(true);
                  }}
                  className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 md:opacity-0 md:group-hover:opacity-100 transition"
                  title="Подробнее"
                >
                  ℹ️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно подсказки с поддержкой Markdown */}
      {showHintModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={() => setShowHintModal(false)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-md max-h-[80vh] overflow-y-auto z-50 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {hintTaskName}
              </h3>
              <button
                onClick={() => setShowHintModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {hintText}
              </ReactMarkdown>
            </div>
            <button
              onClick={() => setShowHintModal(false)}
              className="mt-6 w-full btn-primary"
            >
              Понятно
            </button>
          </div>
        </>
      )}
    </div>
  );
};
