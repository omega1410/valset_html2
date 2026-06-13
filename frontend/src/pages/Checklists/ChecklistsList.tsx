import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checklistsService } from '../../services/checklistsService';
import { CardSkeleton } from '../../components/SkeletonLoader';

export const ChecklistsList = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const data = await checklistsService.getTypes();
      setTypes(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    return type === 'day' 
      ? '/assets/checklists/day.svg'
      : '/assets/checklists/night.svg';
  };

  const getBgClass = (type: string) => {
    return type === 'day' 
      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' 
      : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
  };

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Чек-листы</h1>
        <p className="page-subtitle">Чек-листы для дневной и ночной смены</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : types.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Нет доступных чек-листов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {types.map((item: any, index: number) => (
            <Link
              key={item.type}
              to={`/checklists/${item.type}`}
              className={`block rounded-xl border p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 stagger-fade ${getBgClass(item.type)}`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="text-4xl mb-3">
                <img 
                  src={getIcon(item.type)} 
                  alt={item.name}
                  className="w-12 h-12 invert dark:invert-0"
                />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{item.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{item.tasks_count} задач</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
