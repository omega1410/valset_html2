import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { NewsFeed } from '../components/News/NewsFeed';
import { statsService } from '../services/statsService';
import confetti from 'canvas-confetti';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 17) return 'Добрый день';
  if (hour >= 17 && hour < 22) return 'Добрый вечер';
  return 'Доброй ночи';
};

// Проверка дня рождения
const checkBirthday = (birthday: string | undefined) => {
  if (!birthday) return false;
  const today = new Date();
  const birthDate = new Date(birthday);
  return today.getDate() === birthDate.getDate() && 
         today.getMonth() === birthDate.getMonth();
};

export const Dashboard = () => {
  const { user, isAdmin } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  
  const isBirthday = checkBirthday(user?.birthday);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Запуск конфетти в день рождения (один раз за сессию)
  useEffect(() => {
    if (isBirthday && !confettiTriggered) {
      setConfettiTriggered(true);
      // Основной залп конфетти
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
      });
      
      // Второй залп через 0.5 секунды
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5, x: 0.3 }
        });
      }, 500);
      
      // Третий залп через 1 секунду
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5, x: 0.7 }
        });
      }, 1000);
    }
  }, [isBirthday, confettiTriggered]);

  const loadStats = async () => {
    try {
      const data = await statsService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { title: 'База знаний', description: 'Инструкции, правила и регламенты работы', href: '/sections', color: 'bg-blue-500' },
    { title: 'Тестирование', description: 'Проверка знаний и сертификация', href: '/tests', color: 'bg-emerald-500' },
    { title: 'Контрольные списки', description: 'Чек-листы для дневной и ночной смены', href: '/checklists', color: 'bg-purple-500' },
    { title: 'Документы', description: 'Бланки, формы и нормативные документы', href: '/files', color: 'bg-amber-500' },
  ];

  const statItems = [
    { key: 'tests_passed', label: 'Тестов пройдено', color: 'text-blue-600', darkColor: 'dark:text-blue-400', bgLight: 'bg-blue-100', darkBgLight: 'dark:bg-blue-900/30' },
    { key: 'avg_score', label: 'Средний балл', suffix: '%', color: 'text-emerald-600', darkColor: 'dark:text-emerald-400', bgLight: 'bg-emerald-100', darkBgLight: 'dark:bg-emerald-900/30' },
    { key: 'completed_checklists', label: 'Чек-листов выполнено', color: 'text-purple-600', darkColor: 'dark:text-purple-400', bgLight: 'bg-purple-100', darkBgLight: 'dark:bg-purple-900/30' },
    { key: 'viewed_sections', label: 'Разделов изучено', color: 'text-amber-600', darkColor: 'dark:text-amber-400', bgLight: 'bg-amber-100', darkBgLight: 'dark:bg-amber-900/30' },
    { key: 'test_attempts', label: 'Попыток тестов', color: 'text-rose-600', darkColor: 'dark:text-rose-400', bgLight: 'bg-rose-100', darkBgLight: 'dark:bg-rose-900/30' },
    { key: 'weekly_activity', label: 'Записей за неделю', color: 'text-cyan-600', darkColor: 'dark:text-cyan-400', bgLight: 'bg-cyan-100', darkBgLight: 'dark:bg-cyan-900/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Поздравительный баннер в день рождения */}
      {isBirthday && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 via-amber-500 to-pink-500 animate-gradient p-0.5">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl animate-bounce">🎂</span>
              <p className="text-lg font-semibold text-pink-600 dark:text-pink-400">
                Сегодня ваш день рождения!
              </p>
              <span className="text-3xl animate-bounce">🎉</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {isBirthday ? (
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-amber-600 bg-clip-text text-transparent">
              С днём рождения, {user?.first_name}!
            </h1>
          ) : (
            <h1 className="page-title">{greeting}, {user?.full_name}!</h1>
          )}
          <p className="page-subtitle">Добро пожаловать в систему адаптации персонала</p>
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Новости отеля</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((module) => (
              <a
                key={module.title}
                href={module.href}
                className="module-card block"
              >
                <div className={`w-10 h-10 ${module.color} rounded-lg mb-4 flex items-center justify-center`}>
                  <span className="text-white text-lg font-bold">{module.title.charAt(0)}</span>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white">{module.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
              </a>
            ))}
          </div>

          {!loading && stats && (
            <div className="stats-card">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Моя статистика</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {statItems.map((item) => {
                  const value = stats.personal[item.key];
                  const displayValue = item.key === 'avg_score' ? Math.round(value) : value;
                  
                  return (
                    <div key={item.key} className={`stat-item ${item.bgLight} ${item.darkBgLight} rounded-lg transition-all duration-200 hover:scale-105`}>
                      <div className={`stat-value ${item.color} ${item.darkColor}`}>
                        {displayValue}{item.suffix || ''}
                      </div>
                      <div className="stat-label text-slate-500 dark:text-slate-400">{item.label}</div>
                    </div>
                  );
                })}
              </div>
              
              {isAdmin && stats.admin && (
                <div className="mt-6 pt-4 divider">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Общая статистика</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-item bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <div className="stat-value text-blue-700 dark:text-blue-400">{stats.admin.total_users}</div>
                      <div className="stat-label text-slate-500 dark:text-slate-400">Сотрудников</div>
                    </div>
                    <div className="stat-item bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                      <div className="stat-value text-emerald-700 dark:text-emerald-400">{stats.admin.total_tests_all}</div>
                      <div className="stat-label text-slate-500 dark:text-slate-400">Всего тестов</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 flex flex-col">
          <NewsFeed />
        </div>
      </div>
    </div>
  );
};