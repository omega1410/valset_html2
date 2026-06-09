import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface BreadcrumbItem {
  title: string;
  path: string;
  icon?: string;
}

export const Breadcrumbs = () => {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const items: BreadcrumbItem[] = [];
    
    // Всегда показываем "Главная"
    items.push({ title: 'Главная', path: '/' });
    
    let currentPath = '';
    
    for (let i = 0; i < pathnames.length; i++) {
      const segment = pathnames[i];
      currentPath += `/${segment}`;
      
      let title = '';
      let icon = '';
      
      // Определяем названия для разных путей
      switch (segment) {
        case 'sections':
          title = 'База знаний';
          break;
        case 'tests':
          title = 'Тестирование';
          break;
        case 'checklists':
          title = 'Чек-листы';
          break;
        case 'files':
          title = 'Документы';
          break;
        case 'logbook':
          title = 'Логбук';
          break;
        case 'admin':
          title = 'Админ-панель';
          break;
        case 'profile':
          title = 'Мой профиль';
          break;
        case 'day':
          title = 'Дневная смена';
          break;
        case 'night':
          title = 'Ночная смена';
          break;
        case 'paged':
          // Пропускаем сегмент paged
          continue;
        default:
          // Пытаемся получить название из state
          const state = location.state as { title?: string };
          console.log('Segment:', segment, 'State:', state); // Для отладки
          
          if (state?.title) {
            title = state.title;
          } else if (/^\d+$/.test(segment)) {
            // Если это ID, пробуем найти название из localStorage или оставляем "Детали"
            const cachedTitle = localStorage.getItem(`page_title_${currentPath}`);
            if (cachedTitle) {
              title = cachedTitle;
            } else {
              title = 'Просмотр';
            }
          } else {
            title = decodeURIComponent(segment).replace(/-/g, ' ');
            title = title.charAt(0).toUpperCase() + title.slice(1);
          }
      }
      
      if (title) {
        items.push({ title: icon ? `${icon} ${title}` : title, path: currentPath });
      }
    }
    
    return items;
  }, [location]);
  
  // Если мы на главной - не показываем хлебные крошки
  if (breadcrumbs.length <= 1) return null;
  
  return (
    <nav className="mb-6" aria-label="Хлебные крошки">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={item.path} className="flex items-center gap-2">
              {index > 0 && (
                <svg 
                  className="w-4 h-4 text-slate-400 dark:text-slate-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              
              {isLast ? (
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {item.title}
                </span>
              ) : (
                <Link 
                  to={item.path}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
