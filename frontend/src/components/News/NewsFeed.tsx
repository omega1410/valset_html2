import { useEffect, useState } from 'react';
import { newsService } from '../../services/newsService';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const data = await newsService.getNews();
      setNews(data);
    } catch (error) {
      console.error('Ошибка загрузки новостей:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Добавляем 3 часа для МСК
    date.setHours(date.getHours() + 3);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">Нет новостей</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200">
      <div className="max-h-[502px] overflow-y-auto">
        {news.map((item: any) => (
          <div key={item.id} className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-slate-800 dark:text-white">{item.title}</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                {formatDate(item.created_at)}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{item.content}</p>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Автор: {item.author_name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
