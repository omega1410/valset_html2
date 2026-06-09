// Базовый скелетон для карточки
export const CardSkeleton = () => {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
    </div>
  );
};

// Скелетон для таблицы (логбук, админка)
export const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-t-lg mb-2"></div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-2 mb-2">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Скелетон для чек-листа
export const ChecklistSkeleton = () => {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex-1 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Скелетон для детальной страницы
export const DetailSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-6"></div>
      <div className="card overflow-hidden p-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-6"></div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-11/12"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-10/12"></div>
        </div>
      </div>
    </div>
  );
};

// Скелетон для теста
export const TestSkeleton = () => {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="card p-6">
        <div className="flex justify-between mb-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
        </div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-6"></div>
        <div className="space-y-3 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
};

// Скелетон для списка файлов
export const FilesSkeleton = () => {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex-1 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-24 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
