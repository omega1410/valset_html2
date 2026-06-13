import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { NewsFeed } from '../components/News/NewsFeed';
import { statsService } from '../services/statsService';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { WeatherWidget } from '../components/Weather/WeatherWidget';
import { WeatherEffects } from '../components/Weather/WeatherEffects';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

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

// Хук для анимированного счётчика
const useAnimatedNumber = (targetValue: number, duration = 800) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCurrentValue(Math.floor(targetValue * eased));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, duration]);
  
  return currentValue;
};

export const Dashboard = () => {
  const { user, isAdmin } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [weatherMain, setWeatherMain] = useState<string | null>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterComplete, setTypewriterComplete] = useState(false);

  const isBirthday = checkBirthday(user?.birthday);
  const greeting = getGreeting();
  const fullGreetingText = `${greeting}, ${user?.first_name || user?.full_name || 'Гость'}!`;

  // Анимированные значения
  const animatedTestsPassed = useAnimatedNumber(stats?.personal?.tests_passed || 0);
  const animatedAvgScore = useAnimatedNumber(stats?.personal?.avg_score || 0);
  const animatedChecklists = useAnimatedNumber(stats?.personal?.completed_checklists || 0);
  const animatedSections = useAnimatedNumber(stats?.personal?.viewed_sections || 0);
  const animatedAttempts = useAnimatedNumber(stats?.personal?.test_attempts || 0);
  const animatedWeekly = useAnimatedNumber(stats?.personal?.weekly_activity || 0);

  // ========== АВТО-ОБНОВЛЕНИЕ СТАТИСТИКИ ==========
  useAutoRefresh({
    queryKeys: [['stats', 'dashboard']],
    interval: 60000,
    enabled: true,
  });

  // Typewriter эффект — только при первом входе
  useEffect(() => {
    if (!user) return;
    
    const hasSeenTypewriter = sessionStorage.getItem('typewriter_shown');
    
    if (hasSeenTypewriter) {
      setTypewriterText(fullGreetingText);
      setTypewriterComplete(true);
      return;
    }
    
    let index = 0;
    setTypewriterText('');
    setTypewriterComplete(false);
    
    const interval = setInterval(() => {
      if (index <= fullGreetingText.length) {
        setTypewriterText(fullGreetingText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setTypewriterComplete(true);
        sessionStorage.setItem('typewriter_shown', 'true');
      }
    }, 55);
    
    return () => clearInterval(interval);
  }, [user, fullGreetingText]);

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

  useEffect(() => {
    if (isBirthday && !confettiTriggered) {
      setConfettiTriggered(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.3 } }), 500);
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5, x: 0.7 } }), 1000);
      toast.success('🎂 С днём рождения! Желаем успехов!', { duration: 5000 });
    }
  }, [isBirthday, confettiTriggered]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealWeather();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
      const response = await fetch(`/ow/weather?lat=${LAT}&lon=${LON}&units=metric&lang=ru&appid=${API_KEY}`);
      if (!response.ok) return;
      const data = await response.json();
      setWeatherMain(data.weather[0].main);
    } catch (err) {
      console.warn('Не удалось получить реальную погоду для эффектов');
    }
  };

  const modules = [
    { title: 'База знаний', description: 'Инструкции, правила и регламенты работы', href: '/sections' },
    { title: 'Тестирование', description: 'Проверка знаний и сертификация', href: '/tests' },
    { title: 'Чек-листы', description: 'Чек-листы для дневной и ночной смены', href: '/checklists' },
    { title: 'Документы', description: 'Бланки, формы и нормативные документы', href: '/files' },
  ];

  const getScoreColor = (score: number) => {
    if (score < 25) return 'text-red-700 dark:text-red-200';
    if (score < 50) return 'text-orange-700 dark:text-orange-200';
    if (score < 70) return 'text-yellow-700 dark:text-yellow-200';
    if (score < 85) return 'text-lime-700 dark:text-lime-200';
    return 'text-emerald-700 dark:text-emerald-200';
  };

  const statItems = [
    { key: 'tests_passed', label: 'Тестов пройдено', suffix: '', color: 'text-blue-700 dark:text-blue-200', bg: 'bg-blue-100 dark:bg-blue-900/60', animated: animatedTestsPassed },
    { key: 'avg_score', label: 'Средний балл', suffix: '%', adaptive: true, bg: 'bg-emerald-100 dark:bg-emerald-900/60', animated: animatedAvgScore },
    { key: 'completed_checklists', label: 'Чек-листов выполнено', suffix: '', color: 'text-purple-700 dark:text-purple-200', bg: 'bg-purple-100 dark:bg-purple-900/60', animated: animatedChecklists },
    { key: 'viewed_sections', label: 'Разделов изучено', suffix: '', color: 'text-amber-700 dark:text-amber-200', bg: 'bg-amber-100 dark:bg-amber-900/60', animated: animatedSections },
    { key: 'test_attempts', label: 'Попыток тестов', suffix: '', color: 'text-rose-700 dark:text-rose-200', bg: 'bg-rose-100 dark:bg-rose-900/60', animated: animatedAttempts },
    { key: 'weekly_activity', label: 'Записей за неделю', suffix: '', color: 'text-cyan-700 dark:text-cyan-200', bg: 'bg-cyan-100 dark:bg-cyan-900/60', animated: animatedWeekly },
  ];

  return (
    <div className="space-y-8">
      {isBirthday && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-amber-500 to-pink-500 animate-gradient p-0.5 shadow-xl stagger-fade" style={{ animationDelay: `0s` }}>
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

      <div 
        id="hero-section" 
        className="relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-500 hero-animate stagger-fade" 
        style={{ 
          animationDelay: `0s`,
          backgroundImage: 'radial-gradient(circle farthest-corner at 10% 20%, rgba(0,51,102,1) 0%, rgba(0,102,204,1) 49.5%, rgba(0,191,255,1) 90%)'
        }}
      >
        {isHeroVisible && weatherMain && <WeatherEffects weatherMain={weatherMain} isVisible={isHeroVisible} />}
        
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="w-full lg:w-auto">
            <div className="min-w-[280px]">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 hero-text-shadow">
                {typewriterText}
                {!typewriterComplete && (
                  <span className="inline-block w-0.5 h-8 ml-1 bg-white animate-pulse align-middle"></span>
                )}
              </h1>
            </div>
            <p className="text-white/80 text-base hero-text-shadow-light">
              Добро пожаловать в систему адаптации персонала
            </p>
            {!loading && stats?.personal && (
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span className="hero-text-shadow-light">Прогресс прохождения</span>
                  <span className="hero-text-shadow-light">
                    {Math.min(stats.personal.tests_completion_percentage || 0, 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="progress-wave" 
                    style={{ width: `${Math.min(stats.personal.tests_completion_percentage || 0, 100)}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <WeatherWidget />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {modules.map((module, index) => (
              <a 
                key={module.title} 
                href={module.href} 
                className="rounded-xl bg-white dark:bg-slate-800 p-5 shadow-md hover:shadow-xl border border-slate-200 dark:border-slate-700 block transition-all duration-300 group hover:-translate-y-1 stagger-fade"
                style={{ animationDelay: `${index * 0.08}s` }}
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
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-200 dark:border-slate-700 stagger-fade" style={{ animationDelay: `0.08s` }}>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Моя статистика
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statItems.map((item, index) => {
                  const displayValue = item.key === 'avg_score' ? Math.round(item.animated) : item.animated;
                  const textColor = item.adaptive ? getScoreColor(displayValue) : item.color;
                  return (
                    <div key={item.key} className={`rounded-lg ${item.bg} p-3 border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:scale-105 stagger-fade`} style={{ animationDelay: `${index * 0.08 + 0.16}s` }}>
                      <div className={`text-xl font-bold ${textColor}`}>{displayValue}{item.suffix || ''}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isAdmin && stats?.admin && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md border border-slate-200 dark:border-slate-700 stagger-fade" style={{ animationDelay: `0.24s` }}>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Админ статистика
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/60 rounded-lg p-3 text-center stagger-fade" style={{ animationDelay: `0.32s` }}>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">{stats.admin.total_users || 0}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mt-1">Сотрудников</div>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/60 rounded-lg p-3 text-center stagger-fade" style={{ animationDelay: `0.4s` }}>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">{stats.admin.total_tests_all || 0}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-300 font-medium mt-1">Всего тестов</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 stagger-fade" style={{ animationDelay: `0.48s` }}>
          <div className="sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Новости</h2>
            </div>
            <NewsFeed />
          </div>
        </div>
      </div>
    </div>
  );
};
