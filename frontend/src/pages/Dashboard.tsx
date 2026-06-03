import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { NewsFeed } from '../components/News/NewsFeed';
import { statsService } from '../services/statsService';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { WeatherWidget } from '../components/Weather/WeatherWidget';
import { WeatherEffects } from '../components/Weather/WeatherEffects';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 17) return 'Добрый день';
  if (hour >= 17 && hour < 22) return 'Добрый вечер';
  return 'Доброй ночи';
};

const checkBirthday = (birthday: string | undefined) => {
  if (!birthday) return false;
  const today = new Date();
  const birthDate = new Date(birthday);
  return today.getDate() === birthDate.getDate() && today.getMonth() === birthDate.getMonth();
};

export const Dashboard = () => {
  const { user, isAdmin } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  
  const [weatherMain, setWeatherMain] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  const isBirthday = checkBirthday(user?.birthday);
  const greeting = getGreeting();

  // 1-й useEffect (загрузка статистики, первая загрузка погоды, скролл)
  useEffect(() => {
    loadStats();
    fetchRealWeather();

    const handleScroll = () => {
      const hero = document.getElementById('hero-section');
      if (hero) {
        const rect = hero.getBoundingClientRect();
        setIsHeroVisible(rect.top < window.innerHeight && rect.bottom > 50);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2-й useEffect (день рождения)
  useEffect(() => {
    if (isBirthday && !confettiTriggered) {
      setConfettiTriggered(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.3 } }), 500);
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.7 } }), 1000);
      toast.success('🎂 С днём рождения! Желаем успехов!', { duration: 5000 });
    }
  }, [isBirthday, confettiTriggered]);

  // 3-й useEffect — НОВЫЙ, для периодического обновления погоды
  useEffect(() => {
    const interval = setInterval(() => {
      if (!testMode) {
        fetchRealWeather();
        console.log('🔄 Автообновление погоды для эффектов');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [testMode]);

  useEffect(() => {
    if (isBirthday && !confettiTriggered) {
      setConfettiTriggered(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.3 } }), 500);
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.7 } }), 1000);
      toast.success('🎂 С днём рождения! Желаем успехов!', { duration: 5000 });
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

  const fetchRealWeather = async () => {
    try {
      const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      const LAT = import.meta.env.VITE_WEATHER_LAT;
      const LON = import.meta.env.VITE_WEATHER_LON;
      if (!API_KEY || !LAT || !LON) return;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=ru&appid=${API_KEY}`
      );
      if (!response.ok) return;
      const data = await response.json();
      if (!testMode) setWeatherMain(data.weather[0].main);
    } catch (err) {
      console.warn('Не удалось получить реальную погоду для эффектов');
    }
  };

  const setTestWeather = (condition: string) => {
    setTestMode(true);
    setWeatherMain(condition);
  };

  const modules = [
    { title: 'База знаний', description: 'Инструкции, правила и регламенты работы', href: '/sections' },
    { title: 'Тестирование', description: 'Проверка знаний и сертификация', href: '/tests' },
    { title: 'Контрольные списки', description: 'Чек-листы для дневной и ночной смены', href: '/checklists' },
    { title: 'Документы', description: 'Бланки, формы и нормативные документы', href: '/files' },
  ];

  const getScoreColor = (score: number) => {
    if (score < 25) return 'text-red-600 dark:text-red-400';
    if (score < 50) return 'text-orange-600 dark:text-orange-400';
    if (score < 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score < 85) return 'text-lime-600 dark:text-lime-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const statItems = [
    { key: 'tests_passed', label: 'Тестов пройдено', suffix: '', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'avg_score', label: 'Средний балл', suffix: '%', adaptive: true, bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { key: 'completed_checklists', label: 'Чек-листов выполнено', suffix: '', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { key: 'viewed_sections', label: 'Разделов изучено', suffix: '', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { key: 'test_attempts', label: 'Попыток тестов', suffix: '', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { key: 'weekly_activity', label: 'Записей за неделю', suffix: '', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  ];

  return (
    <div className="space-y-8">
      {isBirthday && (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-amber-500 to-pink-500 animate-gradient p-0.5 shadow-xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl animate-bounce">🎂</span>
            <p className="text-lg font-bold bg-gradient-to-r from-pink-600 to-amber-600 bg-clip-text text-transparent">
              Сегодня твой день рождения, {user?.first_name}!
            </p>
            <span className="text-3xl animate-bounce">🎉</span>
          </div>
        </div>
      </div>
    )}
      {/* Hero секция с отслеживанием видимости */}
      <div 
        id="hero-section"
        className="relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-500"
        style={{ backgroundImage: 'radial-gradient(circle farthest-corner at 10% 20%, rgba(0,51,102,1) 0%, rgba(0,102,204,1) 49.5%, rgba(0,191,255,1) 90%)' }}
      >
        {/* Погодные эффекты видны только когда hero в зоне видимости */}
        {isHeroVisible && weatherMain && <WeatherEffects weatherMain={weatherMain} isVisible={isHeroVisible} />}
        
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {greeting}, {user?.first_name || user?.full_name}!
            </h1>
            <p className="text-white/80 text-base">Добро пожаловать в систему адаптации персонала</p>

            {!loading && stats?.personal && (
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Общий прогресс</span>
                  <span>{Math.round(stats.personal.avg_score || 0)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="progress-wave"
                    style={{ width: `${Math.round(stats.personal.avg_score || 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <WeatherWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {modules.map((module) => (
              <a
                key={module.title}
                href={module.href}
                className="card-3d rounded-xl bg-white dark:bg-slate-800 p-5 shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-700 block transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{module.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
                <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                  Перейти <span className="ml-1">→</span>
                </div>
              </a>
            ))}
          </div>

          {!loading && stats?.personal && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Моя статистика</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statItems.map((item) => {
                  const value = stats.personal[item.key];
                  const displayValue = item.key === 'avg_score' ? Math.round(value) : value;
                  const textColor = item.adaptive ? getScoreColor(displayValue) : item.color;
                  return (
                    <div key={item.key} className={`rounded-lg ${item.bg} p-3 border border-slate-100 dark:border-slate-700`}>
                      <div className={`text-xl font-bold ${textColor}`}>{displayValue}{item.suffix || ''}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isAdmin && stats?.admin && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                Статистика отеля
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.admin.total_users || 0}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Сотрудников</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.admin.total_tests_all || 0}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Всего тестов</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Новости отеля</h2>
            </div>
            <NewsFeed />
          </div>
        </div>
      </div>
    </div>
  );
};
