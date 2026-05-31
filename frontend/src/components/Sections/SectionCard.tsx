import { Link } from 'react-router-dom';

export const SectionCard = ({ section }) => {
  const previewContent = section.content.length > 120 
    ? section.content.substring(0, 120) + '...' 
    : section.content;

  return (
    <Link
      to={`/sections/${section.id}`}
      className="card p-5 hover:shadow-md transition hover:border-slate-300 dark:hover:border-slate-600 block"
    >
      <h3 className="font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2">{section.title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{previewContent}</p>
      <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium">
        Подробнее →
      </div>
    </Link>
  );
};