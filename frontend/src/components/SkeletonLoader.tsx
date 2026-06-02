export const SkeletonLoader = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
      </div>
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
    </div>
  );
};