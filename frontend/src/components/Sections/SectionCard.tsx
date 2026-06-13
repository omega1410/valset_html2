import { Link } from 'react-router-dom';

interface SectionCardProps {
  section: {
    id: number;
    title: string;
    content: string;
  };
  index: number;
}

export const SectionCard = ({ section, index }: SectionCardProps) => {
  const previewContent = section.content.length > 120 
    ? section.content.substring(0, 120) + '...' 
    : section.content;

  return (
    <Link
      to={`/sections/${section.id}`}
      state={{ title: section.title }}
      className="rounded-xl bg-white dark:bg-slate-800 p-5 shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-700 block transition-all duration-300 group hover:-translate-y-1 stagger-fade"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <h3 className="font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {section.title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
        {previewContent}
      </p>
      <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
        Подробнее 
        <svg 
          className="w-4 h-4 transition-transform group-hover:translate-x-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};
